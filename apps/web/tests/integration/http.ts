import { PASSWORD } from "./global-setup";

export const hasDb = !!process.env.MOTOSCOPE_TEST_DB;
const BASE = "http://localhost:3000";

type Handler = (request: Request, context: { params: Promise<never> }) => Promise<Response>;

// Test assertions inspect arbitrary JSON bodies; callers may narrow T when they know the shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CallResult<T = any> {
  status: number;
  headers: Headers;
  body: T;
}

/** Invokes a Route Handler directly with a real Request (no server process needed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call<T = any>(
  handler: Handler,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
): Promise<CallResult<T>> {
  const headers = new Headers(options.headers);
  if (options.cookie) headers.set("cookie", options.cookie);
  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
  }
  const request = new Request(BASE + path, { method: options.method ?? "GET", headers, body });
  const response = await handler(request, {
    params: Promise.resolve(options.params ?? {}) as Promise<never>,
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* plain text body */
  }
  return { status: response.status, headers: response.headers, body: parsed as T };
}

/** Signs in through the real login route and returns the Cookie header value for later calls. */
export async function signIn(email: string, password = PASSWORD): Promise<string> {
  const { POST } = await import("@/app/api/v1/auth/login/route");
  const result = await call(POST as Handler, "/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (result.status !== 200) throw new Error(`Login failed for ${email}: ${result.status}`);
  const setCookie = result.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}

export type { Handler };
