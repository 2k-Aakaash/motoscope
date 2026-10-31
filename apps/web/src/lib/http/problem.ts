import { randomBytes } from "node:crypto";

/** RFC 9110 section links used as Problem Details `type`, matching the former ASP.NET Core responses. */
const typeByStatus: Record<number, string> = {
  400: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  401: "https://tools.ietf.org/html/rfc9110#section-15.5.2",
  403: "https://tools.ietf.org/html/rfc9110#section-15.5.4",
  404: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  409: "https://tools.ietf.org/html/rfc9110#section-15.5.10",
  415: "https://tools.ietf.org/html/rfc9110#section-15.5.16",
  429: "https://tools.ietf.org/html/rfc6585#section-4",
  500: "https://tools.ietf.org/html/rfc9110#section-15.6.1",
};

export interface RequestInfo {
  path: string;
  traceId: string;
  correlationId: string;
}

/** W3C trace-context style id ("00-<32 hex>-<16 hex>-00"). */
export function newTraceId(): string {
  return `00-${randomBytes(16).toString("hex")}-${randomBytes(8).toString("hex")}-00`;
}

/** RFC 9457 Problem Details response with traceId and correlationId for support. */
export function problem(
  info: RequestInfo,
  status: number,
  title: string,
  extra: { detail?: string; errors?: Record<string, string[]> } = {},
): Response {
  const body = {
    type: typeByStatus[status],
    title,
    status,
    ...(extra.detail ? { detail: extra.detail } : {}),
    ...(extra.errors ? { errors: extra.errors } : {}),
    instance: info.path,
    traceId: info.traceId,
    correlationId: info.correlationId,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/problem+json; charset=utf-8" },
  });
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}
