// MOCKED tests of the MotoScope vehicle endpoints. The global fetch is stubbed with response shapes verified
// against the live Carapis API; Carapis is never contacted.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as status } from "@/app/api/v1/integration/carapis/status/route";
import { GET as detail } from "@/app/api/v1/vehicles/[id]/route";
import { GET as search } from "@/app/api/v1/vehicles/search/route";
import { GET as sources } from "@/app/api/v1/vehicles/sources/route";
import { GET as vehicles } from "@/app/api/v1/vehicles/route";
import { listItemFixture as listItem } from "@/lib/carapis/test-fixtures";

const SECRET = "car_CANARY_DO_NOT_LEAK_123";
type Handler = (request: Request, ctx?: { params: Promise<never> }) => Promise<Response>;
const call = async (handler: Handler, path: string, params?: Record<string, string>) => {
  const response = await handler(
    new Request(`http://localhost${path}`),
    params ? { params: Promise.resolve(params) as Promise<never> } : undefined,
  );
  const text = await response.text();
  return { status: response.status, text, body: JSON.parse(text) };
};

/** Account sources returned by the mocked `/sources/` endpoint for each test. */
let accountSources: { code: string; availability: string; name?: string; last_parsed_at?: string }[];
let fetchMock: ReturnType<typeof vi.fn>;
const providerCalls = (path: string) =>
  fetchMock.mock.calls.filter(([u]) => new URL(String(u)).pathname.endsWith(path));

beforeEach(() => {
  process.env.CARAPIS_API_KEY = SECRET;
  delete process.env.CARAPIS_BASE_URL;
  delete process.env.MOTOSCOPE_VEHICLE_SOURCES;
  process.env.RATE_LIMIT_PROVIDER_PER_MINUTE = "1000";
  accountSources = [
    { code: "bikewale", name: "BikeWale", availability: "live", last_parsed_at: "2026-10-31T10:00:00Z" },
  ];
  fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/sources/"))
      return new Response(JSON.stringify(accountSources), { status: 200 });
    if (/\/vehicles\/[^/]+\/$/.test(url.pathname)) {
      return new Response(
        JSON.stringify({ ...listItem, engine_cc: 160, listing_url: "https://www.bikewale.com/x" }),
      );
    }
    return new Response(
      JSON.stringify({
        count: 41,
        page: 1,
        pages: 3,
        page_size: 20,
        has_next: true,
        has_previous: false,
        results: [listItem],
      }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of [
    "CARAPIS_API_KEY",
    "RATE_LIMIT_PROVIDER_PER_MINUTE",
    "TRUST_PROXY",
    "MOTOSCOPE_VEHICLE_SOURCES",
  ])
    delete process.env[k];
});

describe("GET /api/v1/vehicles", () => {
  it("returns normalised vehicles with pagination for an activated source", async () => {
    const {
      status: code,
      body,
      text,
    } = await call(vehicles, "/api/v1/vehicles?source=bikewale&limit=20&page=1");
    expect(code).toBe(200);
    expect(body).toMatchObject({
      success: true,
      source: "bikewale",
      pagination: { page: 1, limit: 20, hasMore: true, total: 41, totalPages: 3 },
      meta: { dataType: "marketplace_listing", maxAgeSeconds: 600 },
    });
    expect(body.data[0]).toMatchObject({ manufacturer: "Example Motors", vehicleType: "motorcycle" });
    expect(text).not.toContain(SECRET);
    const providerUrl = new URL(String(providerCalls("/vehicles/")[0][0]));
    expect(providerUrl.searchParams.get("page_size")).toBe("20");
    expect(providerUrl.searchParams.has("limit")).toBe(false); // the provider rejects `limit`
  });

  it("reports a documented-but-inactive source as requiring activation, without querying its listings", async () => {
    const { status: code, body } = await call(vehicles, "/api/v1/vehicles?source=carwale");
    expect(code).toBe(403);
    expect(body).toEqual({
      success: false,
      error: {
        code: "SOURCE_NOT_ACTIVATED",
        message: "This source is not activated on our vehicle data provider account and requires activation.",
      },
    });
    expect(providerCalls("/vehicles/")).toHaveLength(0);
  });

  it("refuses sources MotoScope does not serve (no silent substitution of other countries' data)", async () => {
    accountSources.push({ code: "encar", availability: "live" });
    const { status: code, body } = await call(vehicles, "/api/v1/vehicles?source=encar");
    expect(code).toBe(400);
    expect(body.error.code).toBe("UNSUPPORTED_SOURCE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps filters to the provider's verified parameter names", async () => {
    await call(
      vehicles,
      "/api/v1/vehicles?source=bikewale&manufacturer=Royal%20Enfield&model=Classic%20350&year_min=2020&price_max=300000&currency=inr&engine_cc_max=400&is_new=false&page=2&limit=10",
    );
    const p = new URL(String(providerCalls("/vehicles/")[0][0])).searchParams;
    expect(Object.fromEntries(p)).toEqual({
      source: "bikewale",
      brand: "royal-enfield",
      model: "classic-350",
      min_year: "2020",
      max_price: "300000",
      price_currency: "INR",
      max_engine_cc: "400",
      is_new_vehicle: "false",
      page: "2",
      page_size: "10",
    });
  });

  it("validates parameters before any provider call", async () => {
    for (const path of [
      "/api/v1/vehicles",
      "/api/v1/vehicles?source=Not%20A%20Code",
      "/api/v1/vehicles?source=bikewale&limit=500",
      "/api/v1/vehicles?source=bikewale&year_min=2024&year_max=2020",
      "/api/v1/vehicles?source=bikewale&price_max=300000", // price filter without currency
      "/api/v1/vehicles?source=bikewale&is_new=maybe",
    ]) {
      const { status: code, body } = await call(vehicles, path);
      expect(code, path).toBe(400);
      expect(body.error.code, path).toBe("INVALID_PARAMETERS");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a clear configuration error when the key is missing", async () => {
    delete process.env.CARAPIS_API_KEY;
    const { status: code, body } = await call(vehicles, "/api/v1/vehicles?source=bikewale");
    expect(code).toBe(503);
    expect(body.error.code).toBe("CARAPIS_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the dead /v2 base URL as misconfiguration", async () => {
    process.env.CARAPIS_BASE_URL = "https://api.carapis.com/v2";
    const { status: code, body } = await call(vehicles, "/api/v1/vehicles?source=bikewale");
    expect(code).toBe(503);
    expect(body.error.code).toBe("CARAPIS_MISCONFIGURED");
    delete process.env.CARAPIS_BASE_URL;
  });

  it.each([
    [401, "CARAPIS_UNAUTHORIZED", 401],
    [429, "CARAPIS_RATE_LIMITED", 429],
    [500, "CARAPIS_UNAVAILABLE", 503],
  ])(
    "passes provider %i (invalid key / quota / outage) through as %s without leaking details",
    async (upstream, code, ours) => {
      fetchMock.mockImplementationOnce(
        async () =>
          new Response(JSON.stringify({ code: "x", detail: `internal ${SECRET}` }), { status: upstream }),
      );
      const { status: got, body, text } = await call(vehicles, "/api/v1/vehicles?source=bikewale");
      expect(got).toBe(ours);
      expect(body.error.code).toBe(code);
      expect(text).not.toContain(SECRET);
      expect(text).not.toContain("internal");
    },
  );

  it("returns an empty list honestly (no fallback data)", async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) =>
      new URL(String(input)).pathname.endsWith("/sources/")
        ? new Response(JSON.stringify(accountSources))
        : new Response(
            JSON.stringify({ count: 0, page: 1, pages: 1, page_size: 20, has_next: false, results: [] }),
          ),
    );
    const { body } = await call(vehicles, "/api/v1/vehicles?source=bikewale");
    expect(body).toMatchObject({ success: true, data: [], pagination: { total: 0, hasMore: false } });
  });

  it("rate-limits provider-backed requests per client", async () => {
    process.env.RATE_LIMIT_PROVIDER_PER_MINUTE = "1";
    process.env.TRUST_PROXY = "true";
    const request = () =>
      vehicles(
        new Request("http://localhost/api/v1/vehicles?source=bikewale", {
          headers: { "x-forwarded-for": "198.51.100.77" },
        }),
      );
    expect((await request()).status).toBe(200);
    expect((await (await request()).json()).error.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/v1/vehicles/search", () => {
  it("maps q to the provider's search parameter and requires something to search for", async () => {
    expect((await call(search, "/api/v1/vehicles/search?source=bikewale")).status).toBe(400);
    const { status: code } = await call(search, "/api/v1/vehicles/search?source=bikewale&q=classic");
    expect(code).toBe(200);
    expect(new URL(String(providerCalls("/vehicles/")[0][0])).searchParams.get("search")).toBe("classic");
  });
});

describe("GET /api/v1/vehicles/[id]", () => {
  it("returns detail fields (engine cc, listing URL) for a served source", async () => {
    const { status: code, body } = await call(detail, `/api/v1/vehicles/${listItem.id}`, { id: listItem.id });
    expect(code).toBe(200);
    expect(body.data).toMatchObject({
      specifications: { engineCc: 160 },
      listingUrl: "https://www.bikewale.com/x",
    });
  });

  it("returns 404 for malformed ids (no provider call) and for vehicles from sources MotoScope does not serve", async () => {
    expect((await call(detail, "/api/v1/vehicles/not-a-uuid", { id: "not-a-uuid" })).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockImplementationOnce(
      async () => new Response(JSON.stringify({ ...listItem, source_code: "encar" })),
    );
    const { status: code, body } = await call(detail, `/api/v1/vehicles/${listItem.id}`, { id: listItem.id });
    expect(code).toBe(404);
    expect(body.error.code).toBe("CARAPIS_NOT_FOUND");
  });
});

describe("GET /api/v1/vehicles/sources", () => {
  it("reports each MotoScope source as available or requiring activation", async () => {
    const { status: code, body } = await call(sources, "/api/v1/vehicles/sources");
    expect(code).toBe(200);
    expect(body.data.map((s: { code: string; status: string }) => [s.code, s.status])).toEqual([
      ["bikewale", "available"],
      ["carwale", "not_activated"],
      ["cars24-india", "not_activated"],
    ]);
    expect(providerCalls("/sources/")).toHaveLength(1);
  });
});

describe("GET /api/v1/integration/carapis/status", () => {
  it("reports configuration without calling the provider or revealing the key", async () => {
    const { body, text } = await call(status, "/api/v1/integration/carapis/status");
    expect(body.data).toMatchObject({
      configured: true,
      baseUrl: "https://api.carapis.com/apix/api",
      enabledSources: ["bikewale", "carwale", "cars24-india"],
    });
    expect(text).not.toContain(SECRET);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
