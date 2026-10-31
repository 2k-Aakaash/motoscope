import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { satisfies, type Policy } from "@/lib/auth/roles";
import { logger } from "@/lib/logging/logger";
import { ConflictError, HttpError, isUniqueViolation, NotFoundError, ValidationError } from "./errors";
import { newTraceId, problem, type RequestInfo } from "./problem";
import { clientKey, tryAcquire, type RateLimitPolicy } from "./rate-limit";

export const CORRELATION_HEADER = "X-Correlation-ID";

export interface RequestContext<P> extends RequestInfo {
  request: Request;
  params: P;
  url: URL;
  /** Signed-in staff user when the route requires authentication; otherwise null. */
  user: SessionUser | null;
}

interface RouteOptions {
  rateLimit?: RateLimitPolicy;
  /** Requires a signed-in user satisfying this policy (401 when signed out, 403 when the role is missing). */
  policy?: Policy;
  /** Requires any signed-in user. */
  authenticated?: boolean;
}

/** Untrusted input ends up in logs and headers: restrict to a short, safe alphabet. */
export function isWellFormedCorrelationId(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,64}$/.test(value);
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Wraps a Route Handler with the cross-cutting behaviour of the former ASP.NET Core pipeline:
 * correlation id, rate limiting, CSRF origin check, authentication/authorization, Problem Details error mapping
 * and structured request logging.
 */
export function route<P = Record<string, never>>(
  options: RouteOptions,
  handler: (ctx: RequestContext<P>) => Promise<Response>,
) {
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    const started = performance.now();
    const url = new URL(request.url);
    const incoming = request.headers.get(CORRELATION_HEADER) ?? "";
    const traceId = newTraceId();
    const info: RequestInfo = {
      path: url.pathname,
      traceId,
      correlationId: isWellFormedCorrelationId(incoming) ? incoming : traceId.slice(3, 35),
    };

    let response: Response;
    try {
      response = await execute(request, url, info, options, handler, context);
    } catch (error) {
      response = toProblem(error, info);
    }

    response.headers.set(CORRELATION_HEADER, info.correlationId);
    // Path only — query strings may contain search terms or other personal input.
    logger.info("HTTP request", {
      method: request.method,
      path: url.pathname,
      status: response.status,
      elapsedMs: Math.round(performance.now() - started),
      correlationId: info.correlationId,
    });
    return response;
  };
}

async function execute<P>(
  request: Request,
  url: URL,
  info: RequestInfo,
  options: RouteOptions,
  handler: (ctx: RequestContext<P>) => Promise<Response>,
  context?: { params: Promise<P> },
): Promise<Response> {
  if (options.rateLimit && !tryAcquire(options.rateLimit, clientKey(request))) {
    return problem(info, 429, "Too many requests", { detail: "Rate limit exceeded. Try again later." });
  }

  if (UNSAFE_METHODS.has(request.method)) {
    // Defence in depth on top of SameSite=Strict cookies: browsers always send Origin on cross-site writes.
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) {
      return problem(info, 403, "Cross-origin request rejected");
    }
  }

  let user: SessionUser | null = null;
  if (options.policy || options.authenticated) {
    user = await getSessionUser(request);
    if (!user) return problem(info, 401, "Unauthorized");
    if (options.policy && !satisfies(user.roles, options.policy)) return problem(info, 403, "Forbidden");
  }

  const params = (context ? await context.params : {}) as P;
  return handler({ ...info, request, url, params, user });
}

function toProblem(error: unknown, info: RequestInfo): Response {
  if (error instanceof ValidationError) {
    return problem(info, 400, "One or more validation errors occurred.", { errors: error.errors });
  }
  if (error instanceof NotFoundError)
    return problem(info, 404, "Resource not found", { detail: error.message });
  if (error instanceof ConflictError) return problem(info, 409, error.title, { detail: error.message });
  if (error instanceof HttpError) return problem(info, error.status, error.title, { detail: error.detail });
  if (isUniqueViolation(error)) {
    return problem(info, 409, "Conflict", { detail: "A record with the same unique value already exists." });
  }
  logger.error("Unhandled exception", { path: info.path, correlationId: info.correlationId }, error);
  return problem(info, 500, "An unexpected error occurred");
}
