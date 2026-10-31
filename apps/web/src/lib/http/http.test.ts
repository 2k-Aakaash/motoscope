import { describe, expect, it } from "vitest";
import { paged } from "@/lib/services/catalogue";
import { NotFoundError, ValidationError } from "./errors";
import { tryAcquire } from "./rate-limit";
import { isWellFormedCorrelationId, route } from "./route";

describe("correlation ids", () => {
  it.each([
    ["abc-123_X.y", true],
    ["", false],
    ["has space", false],
    ["<script>", false],
    ["a".repeat(65), false],
  ])("%s → %s", (value, expected) => expect(isWellFormedCorrelationId(value)).toBe(expected));
});

describe("paged", () => {
  it.each([
    [0, 24, 0, false],
    [24, 24, 1, false],
    [25, 24, 2, true],
  ])("total %i / size %i → %i pages", (total, size, pages, hasNext) => {
    const result = paged([], 1, size, total);
    expect(result.totalPages).toBe(pages);
    expect(result.hasNextPage).toBe(hasNext);
    expect(result.hasPreviousPage).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows the configured number of requests per window, then rejects", () => {
    process.env.RATE_LIMIT_SUBMISSIONS_PER_HOUR = "2";
    const key = `unit-${Math.random()}`;
    expect(tryAcquire("submission", key, 0)).toBe(true);
    expect(tryAcquire("submission", key, 1)).toBe(true);
    expect(tryAcquire("submission", key, 2)).toBe(false);
    expect(tryAcquire("submission", key, 3_600_001)).toBe(true); // next window
    delete process.env.RATE_LIMIT_SUBMISSIONS_PER_HOUR;
  });
});

describe("route wrapper", () => {
  const request = (headers: Record<string, string> = {}, method = "GET") =>
    new Request("http://localhost/api/v1/test", { method, headers });

  it("maps service errors to Problem Details with trace and correlation ids", async () => {
    const handler = route({}, async () => {
      throw new NotFoundError("Thing", "x");
    });
    const response = await handler(request({ "X-Correlation-ID": "abc-123" }));
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(response.headers.get("X-Correlation-ID")).toBe("abc-123");
    expect(body).toMatchObject({
      status: 404,
      title: "Resource not found",
      correlationId: "abc-123",
      instance: "/api/v1/test",
    });
    expect(body.traceId).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
  });

  it("returns validation errors and never leaks unexpected error details", async () => {
    const invalid = await route({}, async () => {
      throw new ValidationError({ name: ["Required."] });
    })(request());
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).errors).toEqual({ name: ["Required."] });

    const crashed = await route({}, async () => {
      throw new Error("secret connection string");
    })(request({ "X-Correlation-ID": "bad id with spaces" }));
    const body = await crashed.json();
    expect(crashed.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(body.correlationId).toMatch(/^[0-9a-f]{32}$/); // malformed incoming id replaced
  });

  it("rejects cross-origin writes", async () => {
    const handler = route({}, async () => new Response(null, { status: 204 }));
    expect((await handler(request({ origin: "https://evil.example" }, "POST"))).status).toBe(403);
    expect((await handler(request({ origin: "http://localhost" }, "POST"))).status).toBe(204);
  });
});
