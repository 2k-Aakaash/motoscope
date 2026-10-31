# MotoScope API

Base path: `/api/v1`, served by Next.js Route Handlers in `apps/web/src/app/api/v1` (Node.js runtime). Versioning is by URL segment: breaking changes go to `/api/v2`. This document is the reference; OpenAPI generation from the Zod schemas is a planned follow-up.

## Conventions

- JSON with camelCase properties. Enums are serialised by name (`"priceType": "ExShowroom"`). Decimals are numbers; timestamps are ISO 8601 UTC.
- DTOs only (`lib/api/types.ts`). Database rows never leave the services unshaped.
- Database statements have a server-side timeout (`DATABASE_STATEMENT_TIMEOUT_MS`, default 30 s).
- Lists return a page envelope:

```json
{ "items": [...], "page": 1, "pageSize": 24, "totalCount": 8, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
```

- Errors are RFC 9457 Problem Details (`application/problem+json`) and always include `traceId` and `correlationId`:

```json
{ "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1", "title": "One or more validation errors occurred.", "status": 400,
  "errors": { "pageSize": ["'Page Size' must be between 1 and 48. You entered 500."] }, "traceId": "00-…", "correlationId": "…" }
```

| Status | Meaning |
|---|---|
| 400 | Validation failure (`errors` keyed by JSON field path, or by query parameter name) |
| 415 | Write request without an `application/json` body |
| 401 | Not signed in (admin/auth endpoints) |
| 403 | Signed in without the required role, or a cross-origin write |
| 404 | Unknown, unpublished or archived resource |
| 409 | Conflict: duplicate slug/name, stale `version`, or archive blocked by dependants |
| 429 | Rate limit exceeded |
| 500 | Unexpected error. No details are exposed; use `traceId` to find the server log |

- Callers may send `X-Correlation-ID` (≤ 64 chars, `[A-Za-z0-9._-]`). It is echoed on the response and attached to all logs for the request.

## Public endpoints (no authentication)

| Method | Path | Notes |
|---|---|---|
| GET | `/manufacturers` | All manufacturers with published-model counts |
| GET | `/manufacturers/{slug}?market=IN` | Manufacturer and its published models (cards) |
| GET | `/motorcycles` | Search, filter, sort and paginate published models (below) |
| GET | `/motorcycles/filters?market=IN` | Facet options (manufacturers, categories, statuses with counts; fuel/transmission/ABS values) and price, cc and year ranges |
| GET | `/motorcycles/{slug}?market=IN` | Full profile: variants with current prices, spec groups (values index-aligned with variants), images, sources, related |
| GET | `/sitemap-entries` | Published motorcycles and manufacturers with `updatedAt` |

### `GET /motorcycles` query parameters

| Parameter | Type | Example |
|---|---|---|
| `q` | text ≤ 100; each word must match model or manufacturer name | `q=kestrel strix` |
| `manufacturer` | slug, repeatable | `manufacturer=arka-motors` |
| `category` | `Commuter`, `Scooter`, `Naked`, `Sport`, `Cruiser`, `Adventure`, `Scrambler`, `Touring`, `Retro`, `OffRoad`; repeatable | `category=Naked&category=Adventure` |
| `status` | `Available`, `Upcoming`, `Discontinued`; repeatable | |
| `fuel` | `Petrol`, `Electric`, `CNG`, `Flex-fuel`; repeatable | |
| `transmission` | `Manual`, `CVT`, `DCT`, `Single-speed`; repeatable | |
| `abs` | `None`, `Single-channel`, `Dual-channel`, `Cornering`; repeatable | |
| `minPrice`, `maxPrice` | current market-wide price (any price type) | `maxPrice=300000` |
| `minCc`, `maxCc` | 0–3000 | |
| `maxSeatHeight` (mm), `maxWeight` (kerb, kg) | | |
| `yearFrom`, `yearTo` | launch year | |
| `sort` | `name` (default), `price-asc`, `price-desc`, `engine-asc`, `engine-desc`, `newest`, `updated`. Unknown values sort last in both directions | |
| `market` | ISO country code, default `IN` | |
| `page` (≥1), `pageSize` (1–48, default 24) | | |

Cards show the base variant's engine, power (kW) and torque, plus the lowest current market-wide price labelled with its `priceType` and variant.

## Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ "email", "password" }` → 200 with the current user and an HttpOnly cookie `motoscope.auth`. Five failures lock the account for 15 minutes. Rate-limited |
| POST | `/auth/logout` | 204 |
| GET | `/auth/me` | `{ id, email, displayName, roles }` or 401 |

There is no public registration. Staff users are created with `npm run admin:create` (README).

## Admin endpoints

All require a signed-in staff cookie. Authorisation is enforced on the server by policy:

| Policy | Roles |
|---|---|
| `RequireEditor` | Admin, Editor |
| `RequireModerator` | Admin, Moderator |
| `RequireAdmin` | Admin |

| Method | Path | Policy | Notes |
|---|---|---|---|
| GET | `/admin/manufacturers?q=&page=&pageSize=&sort=name\|updated&includeArchived=` | Editor | Paged |
| GET | `/admin/manufacturers/{id}` | Editor | Includes `version` |
| POST | `/admin/manufacturers` | Editor | `{ name, slug?, countryOfOrigin?, websiteUrl?, description? }`. Slug generated if omitted. 201 + `Location` |
| PUT | `/admin/manufacturers/{id}` | Editor | Same body plus required `version` (400 if missing, 409 if stale) |
| DELETE | `/admin/manufacturers/{id}` | Editor | Archives (soft delete). 409 while active models exist |
| GET | `/admin/motorcycles?…` | Editor | Paged list with variant counts and publication status |
| GET | `/admin/motorcycles/{id}` | Editor | |
| POST | `/admin/motorcycles` | Editor | `{ manufacturerId, name, slug?, category, availabilityStatus, launchYear?, summary?, description?, publicationStatus: Draft\|Published }` |
| PUT | `/admin/motorcycles/{id}` | Editor | Same body plus required `version`. Publishing sets `publishedAt` once |
| DELETE | `/admin/motorcycles/{id}` | Editor | Archives: hidden publicly, slug reserved |

Every create, update and archive writes an `audit_logs` row (user, action, field-level diff, correlation id) in the same transaction.

Coming next: variant, specification, price, source and image management; trends; reliability moderation.

## Health

`GET /health/live` reports the process only. `GET /health/ready` checks the database and returns 503 when it is unreachable. Both return plain text `Healthy` / `Unhealthy`.

## Rate limits (per client, per server instance)

| Policy | Default | Applies to |
|---|---|---|
| `public-read` | 300/min | Public catalogue endpoints |
| `auth` | 10/min | Login |
| `submission` | 5/hour | Owner report submission (upcoming) |

Configure with `RATE_LIMIT_PUBLIC_PER_MINUTE`, `RATE_LIMIT_AUTH_PER_MINUTE` and `RATE_LIMIT_SUBMISSIONS_PER_HOUR`. Behind a proxy that overwrites `X-Forwarded-For` (Vercel), set `TRUST_PROXY=true` so limits apply per client.

## Marketplace listings (Carapis)

`GET /api/v1/vehicles`, `GET /api/v1/vehicles/search` and `GET /api/v1/integration/carapis/status` use a different
envelope (`{ success, provider, data, pagination, meta }` / `{ success: false, error: { code, message } }`) and are
documented in [CARAPIS_INTEGRATION.md](CARAPIS_INTEGRATION.md). They return third-party marketplace listings, never
catalogue specifications.
