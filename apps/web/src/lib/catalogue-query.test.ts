import { describe, expect, it } from "vitest";
import {
  canonicalPath,
  catalogueHref,
  filterChips,
  isIndexable,
  parseCatalogueParams,
  toApiQuery,
  toSearchParams,
} from "./catalogue-query";

describe("parseCatalogueParams", () => {
  it("returns defaults for an empty query", () => {
    const p = parseCatalogueParams({});
    expect(p).toMatchObject({ q: null, sort: "name", page: 1, manufacturer: [], minPrice: null });
  });

  it("accepts repeated and comma-separated list values, de-duplicated", () => {
    const p = parseCatalogueParams({ category: ["Naked", "Adventure,Naked"], fuel: "Petrol" });
    expect(p.category).toEqual(["Naked", "Adventure"]);
    expect(p.fuel).toEqual(["Petrol"]);
  });

  it("ignores invalid numbers, unknown sorts and bad pages", () => {
    const p = parseCatalogueParams({
      minPrice: "abc",
      maxCc: "-5",
      sort: "popular",
      page: "0",
      maxPrice: "300000",
    });
    expect(p.minPrice).toBeNull();
    expect(p.maxCc).toBeNull();
    expect(p.maxPrice).toBe(300000);
    expect(p.sort).toBe("name");
    expect(p.page).toBe(1);
  });

  it("trims and bounds free text", () => {
    expect(parseCatalogueParams({ q: "   " }).q).toBeNull();
    expect(parseCatalogueParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });
});

describe("serialisation", () => {
  it("round-trips through the URL and omits defaults", () => {
    const raw = {
      q: "strix",
      manufacturer: ["kestrel-moto"],
      maxPrice: "300000",
      sort: "price-asc",
      page: "2",
    };
    const p = parseCatalogueParams(raw);
    const sp = toSearchParams(p);
    expect(sp.toString()).toBe("q=strix&manufacturer=kestrel-moto&maxPrice=300000&sort=price-asc&page=2");
    expect(parseCatalogueParams(Object.fromEntries(sp))).toEqual(p);
    expect(toSearchParams(parseCatalogueParams({ sort: "name", page: "1" })).toString()).toBe("");
  });

  it("adds the page size for API requests", () => {
    expect(toApiQuery(parseCatalogueParams({})).get("pageSize")).toBe("24");
  });

  it("builds hrefs with overrides", () => {
    const p = parseCatalogueParams({ category: "Naked" });
    expect(catalogueHref(p, { page: 3 })).toBe("/motorcycles?category=Naked&page=3");
    expect(catalogueHref(p, { category: [] })).toBe("/motorcycles");
  });
});

describe("indexing rules", () => {
  it("indexes the unfiltered catalogue and single manufacturer/category views", () => {
    expect(isIndexable(parseCatalogueParams({}))).toBe(true);
    expect(isIndexable(parseCatalogueParams({ category: "Naked" }))).toBe(true);
    expect(isIndexable(parseCatalogueParams({ manufacturer: "arka-motors", page: "2" }))).toBe(true);
  });

  it("does not index searches, combinations, ranges or non-default sorts", () => {
    expect(isIndexable(parseCatalogueParams({ q: "strix" }))).toBe(false);
    expect(isIndexable(parseCatalogueParams({ category: ["Naked", "Sport"] }))).toBe(false);
    expect(isIndexable(parseCatalogueParams({ category: "Naked", maxPrice: "200000" }))).toBe(false);
    expect(isIndexable(parseCatalogueParams({ sort: "price-asc" }))).toBe(false);
  });

  it("canonicalises non-indexable views to the catalogue root", () => {
    expect(canonicalPath(parseCatalogueParams({ q: "x", category: "Naked" }))).toBe("/motorcycles");
    expect(canonicalPath(parseCatalogueParams({ category: "Naked", page: "2" }))).toBe(
      "/motorcycles?category=Naked&page=2",
    );
  });
});

describe("filterChips", () => {
  it("describes each filter with a link that removes only it and resets paging", () => {
    const p = parseCatalogueParams({
      manufacturer: "kestrel-moto",
      category: ["Naked", "Adventure"],
      maxPrice: "300000",
      page: "3",
    });
    const chips = filterChips(p, { "kestrel-moto": "Kestrel Moto" });

    expect(chips.map((c) => c.label)).toEqual([
      "Kestrel Moto",
      "Naked / street",
      "Adventure",
      "Price: up to ₹3 lakh",
    ]);
    expect(chips[1].removeHref).toBe(
      "/motorcycles?manufacturer=kestrel-moto&category=Adventure&maxPrice=300000",
    );
    expect(chips[3].removeHref).toBe(
      "/motorcycles?manufacturer=kestrel-moto&category=Naked&category=Adventure",
    );
  });
});
