import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/http/errors";
import { adminListSchema, manufacturerUpsertSchema, motorcycleUpsertSchema } from "./admin";
import { parseMarket, parseMotorcycleSearch } from "./catalogue";

function errorsOf(fn: () => unknown): Record<string, string[]> {
  try {
    fn();
  } catch (error) {
    if (error instanceof ValidationError) return error.errors;
    throw error;
  }
  return {};
}

const search = (query: string) => parseMotorcycleSearch(new URLSearchParams(query));

describe("motorcycle search query (ported from MotorcycleSearchQueryValidator)", () => {
  it("defaults", () => {
    expect(search("")).toMatchObject({ page: 1, pageSize: 24, market: "IN", manufacturer: [], category: [] });
  });

  it("rejects inverted ranges", () => {
    const errors = errorsOf(() =>
      search("minPrice=300000&maxPrice=100000&minCc=500&maxCc=100&yearFrom=2025&yearTo=2020"),
    );
    expect(Object.keys(errors).sort()).toEqual(["maxCc", "maxPrice", "yearTo"]);
  });

  it.each(["0", "49"])("rejects page size %s", (size) => {
    expect(errorsOf(() => search(`pageSize=${size}`))).toHaveProperty("pageSize");
  });

  it("rejects unknown sort and spec values, keyed by query parameter", () => {
    const errors = errorsOf(() =>
      search("sort=popular&fuel=Diesel&abs=Triple-channel&transmission=Sequential"),
    );
    expect(Object.keys(errors).sort()).toEqual(["abs", "fuel", "sort", "transmission"]);
  });

  it("parses enums case-insensitively and keeps repeated values", () => {
    const q = search("category=naked&category=ADVENTURE&status=available&manufacturer=a&manufacturer=b");
    expect(q.category).toEqual(["Naked", "Adventure"]);
    expect(q.status).toEqual(["Available"]);
    expect(q.manufacturer).toEqual(["a", "b"]);
  });

  it("reports invalid enum and number values like ASP.NET model binding", () => {
    expect(errorsOf(() => search("category=Spaceship"))).toEqual({
      category: ["The value 'Spaceship' is not valid."],
    });
    expect(errorsOf(() => search("minCc=1.5"))).toEqual({ minCc: ["The value '1.5' is not valid."] });
  });

  it("normalises the market code", () => {
    expect(parseMarket(new URLSearchParams("market=in"))).toBe("IN");
    expect(errorsOf(() => parseMarket(new URLSearchParams("market=IND")))).toHaveProperty("market");
  });
});

describe("admin payloads (ported from FluentValidation validators)", () => {
  it.each(["Bad Slug", "trailing-"])("rejects non-canonical slug %s", (slug) => {
    expect(manufacturerUpsertSchema.safeParse({ name: "Name", slug }).success).toBe(false);
  });

  it.each(["javascript:alert(1)", "/relative", "ftp://example.com"])(
    "rejects website URL %s",
    (websiteUrl) => {
      expect(manufacturerUpsertSchema.safeParse({ name: "Name", websiteUrl }).success).toBe(false);
    },
  );

  it("does not allow archiving through an update", () => {
    const result = motorcycleUpsertSchema.safeParse({
      manufacturerId: "01a19114-eced-7a91-8515-a5d874d60a72",
      name: "Model",
      category: "Naked",
      availabilityStatus: "Available",
      publicationStatus: "Archived",
    });
    expect(result.success).toBe(false);
  });

  it("rejects control characters and defaults publication to Draft", () => {
    const base = {
      manufacturerId: "01a19114-eced-7a91-8515-a5d874d60a72",
      category: "naked",
      availabilityStatus: "Upcoming",
    };
    expect(motorcycleUpsertSchema.safeParse({ ...base, name: "Model\u0007" }).success).toBe(false);
    const ok = motorcycleUpsertSchema.parse({ ...base, name: "Model" });
    expect(ok).toMatchObject({ category: "Naked", publicationStatus: "Draft" });
  });

  it("bounds admin list paging", () => {
    expect(adminListSchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(adminListSchema.parse({ includeArchived: "true" })).toMatchObject({
      includeArchived: true,
      page: 1,
      pageSize: 25,
    });
  });
});
