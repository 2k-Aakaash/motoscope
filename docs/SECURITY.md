# Security and Privacy

## Authentication
- A single identity authority: the Next.js application itself, with database-backed sessions (ARCHITECTURE §5). There is no Auth.js and no second user store.
- Passwords: at least 12 characters with upper case, lower case and a digit. Hashed with PBKDF2 in the ASP.NET Identity V3 format (HMAC-SHA512, 210,000 iterations for new hashes), so accounts from the former backend keep working. Constant-time comparison.
- Lockout: 5 failed attempts lock the account for 15 minutes. Login responses never reveal whether an email exists.
- Sessions: a random 256-bit token in cookie `motoscope.auth` (HttpOnly, `SameSite=Strict`, `Secure` in production, session-scoped). Only its SHA-256 is stored, in `sessions`. 8-hour sliding expiry. Logout deletes the session server-side. Each request re-checks that the user is active and reloads their roles.
- No default or seeded passwords. The first admin is created with `npm run admin:create -- --email …`. The password comes from `MOTOSCOPE_ADMIN_PASSWORD` or a hidden prompt and is never written to disk or logs.

## Authorisation
- Every protected Route Handler declares a policy (`RequireAdmin`, `RequireEditor`, `RequireModerator`) or `authenticated: true` in `route(...)`, enforced on the server before the handler runs. Hidden UI buttons are a convenience, not a control.
- Unauthenticated requests get 401 and wrong-role requests get 403. Integration tests cover both, plus inactive users with a live session.

## CSRF and CORS
- The API is same-origin with the site; no CORS headers are emitted, so other origins cannot read responses.
- Unsafe methods with a foreign `Origin` header get 403. Bodies must be `application/json` (415 otherwise), so cross-site HTML forms cannot submit. Session cookies are `SameSite=Strict`.

## Input validation and output encoding
- Zod schemas validate every query string and JSON body, with consistent 400 Problem Details keyed by field or parameter name.
- Admin text is plain text: control characters are rejected, and React escapes everything on output. No HTML is accepted or rendered.
- URLs must be absolute `http(s)`. `javascript:` and relative URLs are rejected. External links render with `rel="noopener noreferrer nofollow"`.
- All database access goes through Drizzle with bound parameters (raw SQL fragments use the `sql` template, never string concatenation of input). User search terms have `%`, `_` and `\` escaped before `ILIKE`.
- JSON-LD output escapes `<` to prevent script-context breakout.

## Upload safety (upcoming with owner reports and the media library)
Plan: enforce size limits, check MIME type and magic bytes against an allow-list (JPEG, PNG, WebP, PDF), re-encode images, use random storage keys, store outside the web root (local provider) or in Cloudinary, and never serve user uploads from the API origin with a sniffable content type.

## Rate limiting
Per-client fixed windows (see API.md). Limits are in-memory per server instance. On serverless or multi-instance hosting, add the platform firewall/WAF or a shared store (e.g. Redis). Client IPs come from `X-Forwarded-For` only when `TRUST_PROXY=true`.

## Secrets
- Nothing secret is committed. `.env`, `.env.*` (except `.env.example`) and `appsettings.*.Local.json` are gitignored.
- Local secrets: `apps/web/.env.local` (gitignored). Production: the host's encrypted environment variables or secret store. Server-only variables are never prefixed `NEXT_PUBLIC_`.
- Optional providers (Cloudinary, future trend APIs) are disabled when their credentials are absent.

## Privacy and logging
- Structured JSON request logs record method, path, status, duration and correlation id. Query strings are excluded because they could contain search terms. IP addresses and request bodies are not logged by the application.
- Audit logs record the staff user, action and field diff. No visitor personal data is stored today.
- Upcoming owner reports: no publication of email, phone, address, VIN or registration number. Explicit consent text, moderation before publication, and contact email kept only for moderation follow-up.

## Transport and headers
- HTTPS in production (the hosting platform terminates TLS; enable HSTS there). Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` on the web app.
- Open item: a Content-Security-Policy with nonces for the Next.js app.

## Errors
Errors map to Problem Details in `lib/http/route.ts`. 500 responses never include messages or stack traces, only `traceId` and `correlationId`. Unhandled exceptions are logged with stack trace, path and correlation id.

## Dependencies
Use currently supported packages (Next.js 16, React 19, Drizzle, Zod 4, node-postgres). Run `npm audit` in CI.
