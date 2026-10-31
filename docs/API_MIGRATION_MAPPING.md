# API Migration Mapping: ASP.NET Core → Next.js Route Handlers

Every endpoint keeps its method, path, query parameters, request body, response shape, status codes and authorization.

| Former .NET endpoint | Next.js Route Handler | Auth | Status |
|---|---|---|---|
| GET `/api/v1/manufacturers` | `app/api/v1/manufacturers/route.ts` | public | ✅ identical |
| GET `/api/v1/manufacturers/{slug}` | `app/api/v1/manufacturers/[slug]/route.ts` | public | ✅ identical |
| GET `/api/v1/motorcycles` | `app/api/v1/motorcycles/route.ts` | public | ✅ identical (validation wording, see below) |
| GET `/api/v1/motorcycles/filters` | `app/api/v1/motorcycles/filters/route.ts` | public | ✅ identical |
| GET `/api/v1/motorcycles/{slug}` | `app/api/v1/motorcycles/[slug]/route.ts` | public | ✅ identical |
| GET `/api/v1/sitemap-entries` | `app/api/v1/sitemap-entries/route.ts` | public | ✅ identical |
| POST `/api/v1/auth/login` | `app/api/v1/auth/login/route.ts` | anonymous, rate-limited | ✅ identical |
| POST `/api/v1/auth/logout` | `app/api/v1/auth/logout/route.ts` | signed in | ✅ identical (now also invalidates the session server-side) |
| GET `/api/v1/auth/me` | `app/api/v1/auth/me/route.ts` | signed in | ✅ identical |
| GET, POST `/api/v1/admin/manufacturers` | `app/api/v1/admin/manufacturers/route.ts` | Editor | ✅ identical |
| GET, PUT, DELETE `/api/v1/admin/manufacturers/{id}` | `app/api/v1/admin/manufacturers/[id]/route.ts` | Editor | ✅ identical (missing `version` → 400, see below) |
| GET, POST `/api/v1/admin/motorcycles` | `app/api/v1/admin/motorcycles/route.ts` | Editor | ✅ identical |
| GET, PUT, DELETE `/api/v1/admin/motorcycles/{id}` | `app/api/v1/admin/motorcycles/[id]/route.ts` | Editor | ✅ identical (missing `version` → 400) |
| GET `/health/live`, `/health/ready` | `app/health/live/route.ts`, `app/health/ready/route.ts` | public | ✅ identical (`Healthy` / `Unhealthy`, 503 when DB down) |
| GET `/openapi/v1.json`, `/swagger` (Development only) | — | — | ⚠️ not migrated (see below) |

The frontend no longer calls the API over HTTP. Server Components use `lib/data/*` → `lib/services/*` in-process. The `/api/*` rewrite and `API_INTERNAL_URL` were removed.

## Intentional differences

| Area | Before | After | Reason |
|---|---|---|---|
| Validation error keys for `fuel`/`transmission`/`abs` | C# property path, e.g. `fuelTypes[0]` | Query parameter name, e.g. `fuel` | Clients can map errors to the parameter they sent |
| Model-binding messages | `The value 'abc' is not valid for MinPrice.` | `The value 'abc' is not valid.` | Wording only |
| Market validation message | `The field market must match the regular expression…` | `Market must be a two-letter country code.` | Readable message |
| PUT without `version` | 409 Conflict | 400 with `errors.version` | A missing required field is a validation error |
| Audit `changes` for enum fields | Numbers (`{"from":0,"to":1}`): .NET bug | Names (`{"from":"Draft","to":"Published"}`) | Readable, stable audit history |
| Timestamps in responses | Microseconds (`…30.170239+00:00`) | Milliseconds (`…30.170Z`) | JavaScript `Date` precision; same instant |
| Logout | Cleared cookie only (ticket valid until expiry if copied) | Deletes the server-side session | Real revocation |
| OpenAPI / Swagger UI | Generated in Development | Not generated; `docs/API.md` is the reference | Follow-up: generate OpenAPI 3.1 from the Zod schemas (`z.toJSONSchema`) |
| Models of archived manufacturers | Inconsistently visible, depending on whether the query joined the manufacturer | Always hidden | Consistent visibility rule (archiving a manufacturer is blocked while it has active models, so this cannot occur through the API) |
