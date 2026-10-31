export type RateLimitPolicy = "public-read" | "auth" | "submission" | "provider";

interface PolicyConfig {
  permits: number;
  windowMs: number;
}

function config(policy: RateLimitPolicy): PolicyConfig {
  switch (policy) {
    case "public-read":
      return { permits: Number(process.env.RATE_LIMIT_PUBLIC_PER_MINUTE ?? 300), windowMs: 60_000 };
    case "auth":
      return { permits: Number(process.env.RATE_LIMIT_AUTH_PER_MINUTE ?? 10), windowMs: 60_000 };
    case "submission":
      return { permits: Number(process.env.RATE_LIMIT_SUBMISSIONS_PER_HOUR ?? 5), windowMs: 3_600_000 };
    case "provider":
      // Routes that may call a paid external provider (Carapis quota is per request).
      return { permits: Number(process.env.RATE_LIMIT_PROVIDER_PER_MINUTE ?? 20), windowMs: 60_000 };
  }
}

const windows = new Map<string, { start: number; count: number }>();

/**
 * Fixed-window limiter partitioned by client IP. State is per server instance (as it was per API instance before);
 * on serverless platforms combine with the platform firewall or move to a shared store (e.g. Redis) when needed.
 * Returns false when the request must be rejected with 429.
 */
export function tryAcquire(policy: RateLimitPolicy, clientKey: string, now = Date.now()): boolean {
  const { permits, windowMs } = config(policy);
  const key = `${policy}:${clientKey}`;
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 50_000) pruneExpired(now);
    return true;
  }
  if (current.count >= permits) return false;
  current.count += 1;
  return true;
}

function pruneExpired(now: number) {
  for (const [key, value] of windows) if (now - value.start > 3_600_000) windows.delete(key);
}

/**
 * Client address for rate limiting. `x-forwarded-for` is trusted only when TRUST_PROXY=true
 * (set on hosts such as Vercel that overwrite it); otherwise all callers share one partition per policy.
 */
export function clientKey(request: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
    const real = request.headers.get("x-real-ip");
    if (real) return real;
  }
  return "direct";
}
