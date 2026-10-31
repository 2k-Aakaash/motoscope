// MOCKED tests: a fake `fetch` stands in for Carapis. They verify our handling of the documented contract only;
// they are NOT a live integration test (no API key was available). See docs/CARAPIS_INTEGRATION.md.
import { describe, expect, it, vi } from "vitest";
import { buildListingsUrl, fetchListings } from "./client";
import { normaliseBaseUrl, readCarapisConfig } from "./config";
import { CarapisError } from "./errors";
import { normalizeListing, normalizeListings } from "./normalize";

const config = { apiKey: "test-key-not-real", baseUrl: "https://api.carapis.com/v2" };
const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;
const jsonResponse = (status: number, body: unknown) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("config", () => {
  it("is null without a key and never reads NEXT_PUBLIC variables", () => {
    expect(readCarapisConfig(env({}))).toBeNull();
    expect(readCarapisConfig(env({ NEXT_PUBLIC_CARAPIS_API_KEY: "x" }))).toBeNull();
    expect(readCarapisConfig(env({ CARAPIS_API_KEY: "  " }))).toBeNull();
  });

  it("defaults the base URL and requires https", () => {
    expect(readCarapisConfig(env({ CARAPIS_API_KEY: "k" }))).toEqual({
      apiKey: "k",
      baseUrl: "https://api.carapis.com/v2",
    });
    expect(normaliseBaseUrl("https://api.carapis.com/v2/")).toBe("https://api.carapis.com/v2");
    expect(() => normaliseBaseUrl("http://api.carapis.com/v2")).toThrow(/https/);
    expect(() => normaliseBaseUrl("not a url")).toThrow();
  });
});

describe("client (mocked fetch)", () => {
  it("calls GET /listings with Bearer auth and only the provided documented parameters", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { count: 0, page: 1, limit: 20, results: [] }));
    await fetchListings(
      config,
      { source: "cardekho", make: "Honda", year_min: 2020, limit: 20, page: 1 },
      { fetchImpl },
    );

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://api.carapis.com/v2/listings?source=cardekho&make=Honda&year_min=2020&limit=20&page=1",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key-not-real");
    expect(buildListingsUrl(config.baseUrl, { source: "a b" })).toBe(
      "https://api.carapis.com/v2/listings?source=a+b",
    );
  });

  it.each([
    [400, "CARAPIS_INVALID_REQUEST", 400],
    [422, "CARAPIS_INVALID_REQUEST", 400],
    [401, "CARAPIS_UNAUTHORIZED", 401],
    [403, "CARAPIS_FORBIDDEN", 403],
    [429, "CARAPIS_RATE_LIMITED", 429],
    [500, "CARAPIS_UNAVAILABLE", 503],
  ])(
    "maps provider HTTP %i to %s (MotoScope status %i) without retrying",
    async (status, code, ourStatus) => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse(status, { error: { code: "provider_code", message: "x" } }),
      );
      const error = await fetchListings(config, { source: "cardekho" }, { fetchImpl }).catch((e) => e);
      expect(error).toBeInstanceOf(CarapisError);
      expect(error).toMatchObject({
        code,
        status: ourStatus,
        upstreamCode: "provider_code",
        upstreamStatus: status,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1); // no automatic retries
    },
  );

  it("reads the error code from the observed live format { code, detail } too", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(401, { code: "api_key_required", detail: "A valid API key is required." }),
    );
    await expect(fetchListings(config, { source: "cardekho" }, { fetchImpl })).rejects.toMatchObject({
      code: "CARAPIS_UNAUTHORIZED",
      upstreamCode: "api_key_required",
    });
  });

  it("maps an HTML 404 (endpoint missing) to CARAPIS_NOT_FOUND", async () => {
    const fetchImpl = vi.fn(async () => new Response("<h1>Not Found</h1>", { status: 404 }));
    await expect(fetchListings(config, { source: "cardekho" }, { fetchImpl })).rejects.toMatchObject({
      code: "CARAPIS_NOT_FOUND",
      status: 404,
    });
  });

  it("reports invalid JSON and malformed bodies as 502", async () => {
    for (const body of ["<html>oops</html>", "[]", '{"results": "nope"}']) {
      const fetchImpl = vi.fn(async () => jsonResponse(200, body));
      await expect(fetchListings(config, { source: "cardekho" }, { fetchImpl })).rejects.toMatchObject({
        code: "CARAPIS_INVALID_RESPONSE",
        status: 502,
      });
    }
  });

  it("times out", async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)),
        ),
    );
    await expect(
      fetchListings(config, { source: "cardekho" }, { fetchImpl: fetchImpl as typeof fetch, timeoutMs: 20 }),
    ).rejects.toMatchObject({ code: "CARAPIS_TIMEOUT", status: 503 });
  });

  it("reports network failures as provider unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchListings(config, { source: "cardekho" }, { fetchImpl })).rejects.toMatchObject({
      code: "CARAPIS_UNAVAILABLE",
    });
  });
});

describe("normalize", () => {
  it("maps documented /v2/listings fields without inventing anything", () => {
    const vehicle = normalizeListing({
      id: "abc",
      source: "cardekho",
      make: "Honda",
      model: "City",
      trim: "VX",
      year: 2021,
      mileage: 35000,
      price: 950000,
      currency: "inr",
      location: "Pune",
      fuel_type: "gasoline",
      transmission: "manual",
      photos: ["https://img.example/1.jpg", "javascript:alert(1)", 42 as unknown as string],
      dealer: "Some Dealer",
      url: "https://www.cardekho.com/listing/abc",
    });
    expect(vehicle).toEqual({
      id: "abc",
      provider: "carapis",
      source: "cardekho",
      name: "Honda City VX",
      make: "Honda",
      model: "City",
      variant: "VX",
      year: 2021,
      price: { amount: 950000, currency: "INR", type: "marketplace_asking_price" },
      fuelType: "gasoline",
      transmission: "manual",
      odometer: 35000,
      location: "Pune",
      seller: "Some Dealer",
      images: ["https://img.example/1.jpg"],
      sourceUrl: "https://www.cardekho.com/listing/abc",
      dataType: "marketplace_listing",
    });
  });

  it("leaves missing values null and never assumes a currency", () => {
    const vehicle = normalizeListing({ id: 7, price: 500000 });
    expect(vehicle).toMatchObject({
      id: "7",
      name: null,
      make: null,
      year: null,
      price: null, // a price without a currency code is dropped, not assumed INR
      odometer: null,
      images: [],
      sourceUrl: null,
    });
  });

  it("reads the alternative documented field names (platform-page schema) as a fallback", () => {
    const vehicle = normalizeListing({
      id: "x",
      brand_name: "Bajaj",
      model_name: "Pulsar",
      price_original: 70000,
      price_original_currency: "INR",
    });
    expect(vehicle).toMatchObject({ name: "Bajaj Pulsar", price: { amount: 70000, currency: "INR" } });
  });

  it("drops entries without an id and ignores non-object entries", () => {
    expect(normalizeListings([{ make: "No id" }, null, "x", { id: "ok" }]).map((v) => v.id)).toEqual(["ok"]);
    expect(normalizeListings("not an array")).toEqual([]);
  });

  it("rejects implausible years, negative odometers and non-http URLs", () => {
    expect(
      normalizeListing({
        id: "1",
        year: 3020,
        mileage: -5,
        url: "ftp://x.example/file",
        currency: "RUPEES",
        price: 1,
      }),
    ).toMatchObject({ year: null, odometer: null, sourceUrl: null, price: null });
  });
});
