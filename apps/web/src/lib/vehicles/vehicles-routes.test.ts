// MOCKED tests of the MotoScope vehicle endpoints: the global fetch is stubbed, so Carapis is never contacted.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as status } from "@/app/api/v1/integration/carapis/status/route";
import { GET as search } from "@/app/api/v1/vehicles/search/route";
import { GET as vehicles } from "@/app/api/v1/vehicles/route";

const SECRET = "sk_live_canary_DO_NOT_LEAK_123";
type Handler = (request: Request) => Promise<Response>;
const call = async (handler: Handler, path: string) => {
  const response = await handler(new Request(`http://localhost${path}`));
  const text = await response.text();
  return { status: response.status, text, body: JSON.parse(text) };
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.CARAPIS_API_KEY = SECRET;
  delete process.env.CARAPIS_BASE_URL;
  process.env.RATE_LIMIT_PROVIDER_PER_MINUTE = "1000";
  fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          count: 1,
          page: 1,
          limit: 20,
          results: [
            { id: "l1", source: "bikewale", make: "Bajaj", model: "Pulsar", price: 70000, currency: "INR" },
          ],
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CARAPIS_API_KEY;
  delete process.env.RATE_LIMIT_PROVIDER_PER_MINUTE;
  delete process.env.TRUST_PROXY;
});

describe("GET /api/v1/vehicles", () => {
  it("returns the standard success envelope with normalised listings", async () => {
    const {
      status: code,
      body,
      text,
    } = await call(vehicles, "/api/v1/vehicles?source=bikewale&limit=20&page=1");
    expect(code).toBe(200);
    expect(body).toMatchObject({
      success: true,
      provider: "carapis",
      pagination: { count: 1, page: 1, limit: 20 },
      meta: { source: "bikewale", dataType: "marketplace_listing", maxAgeSeconds: 1800 },
    });
    expect(body.data[0]).toMatchObject({
      id: "l1",
      name: "Bajaj Pulsar",
      price: { amount: 70000, currency: "INR" },
    });
    expect(new Date(body.meta.retrievedAt).toString()).not.toBe("Invalid Date");
    expect(text).not.toContain(SECRET);
  });

  it("requires source and validates parameters before calling the provider", async () => {
    for (const path of [
      "/api/v1/vehicles",
      "/api/v1/vehicles?source=Not%20A%20Slug",
      "/api/v1/vehicles?source=cardekho&limit=500",
      "/api/v1/vehicles?source=cardekho&year_min=2024&year_max=2020",
      "/api/v1/vehicles?source=cardekho&price_min=abc",
      "/api/v1/vehicles?source=cardekho&page=1000&limit=50",
    ]) {
      const { status: code, body } = await call(vehicles, path);
      expect(code, path).toBe(400);
      expect(body).toMatchObject({ success: false, error: { code: "INVALID_PARAMETERS" } });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a clear configuration error when the key is missing", async () => {
    delete process.env.CARAPIS_API_KEY;
    const { status: code, body } = await call(vehicles, "/api/v1/vehicles?source=cardekho");
    expect(code).toBe(503);
    expect(body.error.code).toBe("CARAPIS_NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, "CARAPIS_UNAUTHORIZED", 401],
    [403, "CARAPIS_FORBIDDEN", 403],
    [429, "CARAPIS_RATE_LIMITED", 429],
    [503, "CARAPIS_UNAVAILABLE", 503],
  ])("passes provider %i through as %s (%i) without leaking details", async (upstream, code, ours) => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "x", message: `internal detail ${SECRET}` } }), {
        status: upstream,
      }),
    );
    const { status: got, body, text } = await call(vehicles, "/api/v1/vehicles?source=cardekho");
    expect(got).toBe(ours);
    expect(body).toMatchObject({ success: false, error: { code } });
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain("internal detail");
  });

  it("returns 502 for a non-JSON provider response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>gateway</html>", { status: 200 }));
    const { status: code, body } = await call(vehicles, "/api/v1/vehicles?source=cardekho");
    expect(code).toBe(502);
    expect(body.error.code).toBe("CARAPIS_INVALID_RESPONSE");
  });

  it("rate-limits provider-backed requests per client to protect the paid quota", async () => {
    process.env.RATE_LIMIT_PROVIDER_PER_MINUTE = "1";
    process.env.TRUST_PROXY = "true";
    const request = () =>
      vehicles(
        new Request("http://localhost/api/v1/vehicles?source=cardekho", {
          headers: { "x-forwarded-for": "198.51.100.9" },
        }),
      );
    expect((await request()).status).toBe(200);
    const limited = await request();
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/v1/vehicles/search", () => {
  it("requires at least one documented filter besides source", async () => {
    const { status: code, body } = await call(search, "/api/v1/vehicles/search?source=cardekho");
    expect(code).toBe(400);
    expect(body.error.details).toHaveProperty("filters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards documented filters to the provider", async () => {
    const { status: code } = await call(
      search,
      "/api/v1/vehicles/search?source=bikewale&make=Bajaj&price_max=100000",
    );
    expect(code).toBe(200);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/listings?source=bikewale&make=Bajaj&price_max=100000");
  });
});

describe("GET /api/v1/integration/carapis/status", () => {
  it("reports configuration without calling the provider or revealing the key", async () => {
    const { status: code, body, text } = await call(status, "/api/v1/integration/carapis/status");
    expect(code).toBe(200);
    expect(body.data).toMatchObject({
      configured: true,
      baseUrl: "https://api.carapis.com/v2",
      liveVerification: "not_performed",
    });
    expect(text).not.toContain(SECRET);
    expect(fetchMock).not.toHaveBeenCalled();

    delete process.env.CARAPIS_API_KEY;
    expect((await call(status, "/api/v1/integration/carapis/status")).body.data.configured).toBe(false);
  });
});
