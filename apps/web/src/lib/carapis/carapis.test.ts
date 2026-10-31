// MOCKED tests: a fake `fetch` replays response SHAPES verified against the live Carapis API on 2026-10-31
// (field names and nesting copied from real `/apix/api` responses; values are test data). Carapis is not contacted.
import { describe, expect, it, vi } from "vitest";
import { buildUrl, fetchSources, fetchVehicle, fetchVehicles } from "./client";
import {
  CARAPIS_DEFAULT_BASE_URL,
  enabledVehicleSources,
  normaliseBaseUrl,
  readCarapisConfig,
} from "./config";
import { CarapisError } from "./errors";
import { normalizeVehicle, normalizeVehicles, vehicleTypeFrom } from "./normalize";
import { listItemFixture as listItem } from "./test-fixtures";

const config = { apiKey: "car_test_key_not_real", baseUrl: CARAPIS_DEFAULT_BASE_URL };
const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;
const json = (status: number, body: unknown) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

describe("config", () => {
  it("is null without a key and never reads NEXT_PUBLIC variables", () => {
    expect(readCarapisConfig(env({}))).toBeNull();
    expect(readCarapisConfig(env({ NEXT_PUBLIC_CARAPIS_API_KEY: "x" }))).toBeNull();
  });

  it("defaults to the verified /apix/api base URL and rejects the dead /v2 base with guidance", () => {
    expect(readCarapisConfig(env({ CARAPIS_API_KEY: "k" }))?.baseUrl).toBe(
      "https://api.carapis.com/apix/api",
    );
    expect(() => normaliseBaseUrl("https://api.carapis.com/v2")).toThrow(/apix\/api/);
    expect(() => normaliseBaseUrl("http://api.carapis.com/apix/api")).toThrow(/https/);
  });

  it("enables the three Indian sources by default and accepts an override", () => {
    expect(enabledVehicleSources(env({}))).toEqual(["bikewale", "carwale", "cars24-india"]);
    expect(enabledVehicleSources(env({ MOTOSCOPE_VEHICLE_SOURCES: " BikeWale , carwale,carwale" }))).toEqual([
      "bikewale",
      "carwale",
    ]);
  });
});

describe("client (mocked fetch)", () => {
  it("calls /vehicles/ with Bearer auth and only the given verified parameters", async () => {
    const fetchImpl = vi.fn(async () => json(200, { count: 0, page: 1, has_next: false, results: [] }));
    await fetchVehicles(
      config,
      { source: "bikewale", brand: "bajaj", page: 2, page_size: 20 },
      { fetchImpl },
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://api.carapis.com/apix/api/vehicles/?source=bikewale&brand=bajaj&page=2&page_size=20",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer car_test_key_not_real");
    expect(buildUrl(config.baseUrl, "/vehicles/abc/")).toBe("https://api.carapis.com/apix/api/vehicles/abc/");
  });

  it("reads detail and the account source list", async () => {
    const detail = await fetchVehicle(config, listItem.id, {
      fetchImpl: vi.fn(async () => json(200, { ...listItem, engine_cc: 160 })),
    });
    expect(detail.engine_cc).toBe(160);
    const sources = await fetchSources(config, {
      fetchImpl: vi.fn(async () => json(200, [{ code: "encar", availability: "live" }])),
    });
    expect(sources).toEqual([{ code: "encar", availability: "live" }]);
  });

  it.each([
    [
      400,
      { detail: "Unknown query parameter(s): limit", valid_parameters: [] },
      "CARAPIS_INVALID_REQUEST",
      400,
    ],
    [401, { code: "api_key_required", detail: "A valid API key is required." }, "CARAPIS_UNAUTHORIZED", 401],
    [403, { code: "forbidden" }, "CARAPIS_FORBIDDEN", 403],
    [404, "<h1>Not Found</h1>", "CARAPIS_NOT_FOUND", 404],
    [429, { error: { code: "rate_limit_exceeded" } }, "CARAPIS_RATE_LIMITED", 429],
    [502, "bad gateway", "CARAPIS_UNAVAILABLE", 503],
  ])("maps provider %i to %s (MotoScope %i), once, without retry", async (status, body, code, ours) => {
    const fetchImpl = vi.fn(async () => json(status, body));
    const error = await fetchVehicles(config, { source: "bikewale" }, { fetchImpl }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CarapisError);
    expect(error).toMatchObject({ code, status: ours, upstreamStatus: status });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects non-JSON and structurally wrong bodies as 502", async () => {
    for (const body of ["<html>oops</html>", '{"results":"nope"}', "[]"]) {
      await expect(
        fetchVehicles(config, { source: "bikewale" }, { fetchImpl: vi.fn(async () => json(200, body)) }),
      ).rejects.toMatchObject({ code: "CARAPIS_INVALID_RESPONSE", status: 502 });
    }
    await expect(
      fetchSources(config, { fetchImpl: vi.fn(async () => json(200, { unexpected: true })) }),
    ).rejects.toMatchObject({ code: "CARAPIS_INVALID_RESPONSE" });
  });

  it("times out and reports network failures", async () => {
    const hanging = vi.fn(
      (_u: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_r, reject) =>
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)),
        ),
    );
    await expect(
      fetchVehicles(config, { source: "bikewale" }, { fetchImpl: hanging as typeof fetch, timeoutMs: 20 }),
    ).rejects.toMatchObject({ code: "CARAPIS_TIMEOUT" });
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchVehicles(config, { source: "bikewale" }, { fetchImpl: offline })).rejects.toMatchObject(
      {
        code: "CARAPIS_UNAVAILABLE",
      },
    );
  });
});

describe("normalize", () => {
  it("maps the verified list shape into the MotoScope Vehicle model", () => {
    expect(normalizeVehicle(listItem)).toEqual({
      id: listItem.id,
      source: "bikewale",
      listingId: null,
      manufacturer: "Example Motors",
      model: "Roadster",
      variant: "Disc",
      year: 2024,
      vehicleType: "motorcycle",
      price: { amount: 125000, currency: "INR", originalAmount: "125000.00", priceType: "listing" },
      specifications: {
        engineCc: null, // list view has no engine size
        fuelType: "gasoline",
        transmission: "manual",
        bodyType: "motorcycle",
        mileage: 1200,
        seatCount: null,
      },
      location: { city: null, state: null, region: "Karnataka", countryCode: "IN" },
      images: ["https://img.example/1.jpg"],
      listingUrl: null, // list view has no listing URL
      sellerType: "dealer",
      isNewVehicle: false,
      isAvailable: true,
      firstSeenAt: "2026-10-30T06:42:45Z",
      lastSeenAt: "2026-10-31T06:42:45Z",
      dataType: "marketplace_listing",
    });
  });

  it("adds detail-only fields when present", () => {
    const v = normalizeVehicle({
      ...listItem,
      engine_cc: 160,
      seat_count: 2,
      listing_id: "42922465",
      listing_url: "https://www.bikewale.com/used/listing/42922465",
    });
    expect(v).toMatchObject({
      listingId: "42922465",
      listingUrl: "https://www.bikewale.com/used/listing/42922465",
      specifications: { engineCc: 160, seatCount: 2 },
    });
  });

  it("never uses price_usd and never assumes a currency", () => {
    const noCurrency = normalizeVehicle({ id: "a", price_original: "500000.00", price_usd: 6000 });
    expect(noCurrency?.price).toEqual({
      amount: null,
      currency: null,
      originalAmount: "500000.00",
      priceType: "unknown",
    });
    const zero = normalizeVehicle({ id: "b", price_original: "0.00", price_original_currency: "INR" });
    expect(zero?.price.priceType).toBe("unknown");
  });

  it("keeps missing values null and drops records without an id", () => {
    expect(normalizeVehicle({ id: "x" })).toMatchObject({
      manufacturer: null,
      year: null,
      vehicleType: "unknown",
      images: [],
      isNewVehicle: null,
      location: { countryCode: null },
    });
    expect(normalizeVehicles([{ brand_name: "no id" }, null, listItem]).map((v) => v.id)).toEqual([
      listItem.id,
    ]);
  });

  it("falls back to the thumbnail when photos are missing", () => {
    expect(normalizeVehicle({ id: "t", thumb: { url: "https://img.example/t.jpg" } })?.images).toEqual([
      "https://img.example/t.jpg",
    ]);
  });

  it("derives vehicle type only from an explicit body type", () => {
    expect(vehicleTypeFrom("sedan")).toBe("car");
    expect(vehicleTypeFrom("Scooter")).toBe("scooter");
    expect(vehicleTypeFrom("motorcycle")).toBe("motorcycle");
    expect(vehicleTypeFrom("other")).toBe("unknown");
    expect(vehicleTypeFrom(null)).toBe("unknown");
  });
});
