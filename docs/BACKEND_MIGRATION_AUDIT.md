# Backend Migration Audit: ASP.NET Core → Next.js Route Handlers

Date: 2026-10-31. Source: `apps/api` (MotoScope.Api, .NET 10) at the end of the first vertical slice.

## 1. Existing backend architecture

One ASP.NET Core project (`src/MotoScope.Api`) organised by feature, plus one xUnit v3 test project.

| Layer | Location | Responsibility |
|---|---|---|
| Domain | `Domain/{Catalogue,Identity,Auditing,Common}` | Entities, enums, `SpecKeys`, roles and policies |
| Persistence | `Infrastructure/Persistence` | `MotoScopeDbContext` (Identity + catalogue), configurations, 1 EF migration (`20261031082752_InitialCatalogue`) |
| Seeding | `Infrastructure/Seeding` | `ReferenceDataSeeder` (markets, roles, 35 spec definitions; idempotent, all environments), `DemoDataSeeder` (fictional catalogue; refuses Production; `--reset`) |
| CLI | `Infrastructure/Cli/CliCommands.cs` | `migrate`, `seed [--reset]`, `create-admin --email [--role] [--name]` |
| Features | `Features/Catalogue`, `Features/Auth`, `Features/Admin/{Manufacturers,Motorcycles}` | Controllers, services, DTOs, FluentValidation validators |
| Cross-cutting | `Common/` | Paging, `SearchText` (term split + LIKE escaping), `Slug`, `ProblemDetailsExceptionHandler`, `CorrelationIdMiddleware`, `AuditTrail` + `ChangeSet`, `ValidationFilter`, rate-limit policies |

## 2. API endpoints (complete list)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/manufacturers` | public | Ordered by name; `modelCount` counts published, non-archived models |
| GET | `/api/v1/manufacturers/{slug}?market=` | public | 404 if unknown/archived; models are cards, ordered by name |
| GET | `/api/v1/motorcycles` | public | Search/filter/sort/page (see §3.1) |
| GET | `/api/v1/motorcycles/filters?market=` | public | Facets and ranges |
| GET | `/api/v1/motorcycles/{slug}?market=` | public | Detail. 404 for unknown, draft or archived |
| GET | `/api/v1/sitemap-entries` | public | Published motorcycles + manufacturers that have published models |
| POST | `/api/v1/auth/login` | anonymous, rate `auth` | 200 + user DTO + cookie; 401 on bad credentials, inactive user, or lockout |
| POST | `/api/v1/auth/logout` | signed in | 204 |
| GET | `/api/v1/auth/me` | signed in | 200 user DTO or 401 |
| GET/POST | `/api/v1/admin/manufacturers` | Editor | List (paged) / create (201 + Location) |
| GET/PUT/DELETE | `/api/v1/admin/manufacturers/{id}` | Editor | Get / update (version required) / archive |
| GET/POST | `/api/v1/admin/motorcycles` | Editor | List / create |
| GET/PUT/DELETE | `/api/v1/admin/motorcycles/{id}` | Editor | Get / update / archive |
| GET | `/health/live`, `/health/ready` | public | Ready checks the database (503 when down) |
| GET | `/openapi/v1.json`, `/swagger` | Development only | Generated OpenAPI + UI |

## 3. Business rules that must be preserved

### 3.1 Catalogue search
- Visibility: `publication_status = 'Published'` and `deleted_at IS NULL` (models, and variants via soft-delete filter).
- `q`: split on whitespace, distinct case-insensitively, at most 5 terms. **Every** term must `ILIKE` the model name **or** the manufacturer name. `%`, `_` and `\` are escaped.
- List filters: `manufacturer` (slugs), `category`, `status`. Spec filters (`fuel`, `transmission`, `abs` = text in set; `minCc/maxCc`, `maxSeatHeight`, `maxWeight` = numeric range) match if **any variant** has a matching value. Price filter: any variant with a current, market-wide (`region_code IS NULL`) price in the market within the range.
- Sorts: `name` (default: manufacturer name, model name), `price-asc/desc` (min current market-wide price), `engine-asc/desc` (max displacement across variants), `newest` (launch year desc, nulls last, then `published_at` desc), `updated` (`updated_at` desc). Unknown values sort **last in both directions**. Tie-breakers: name, id.
- Cards: specs (displacement, power kW, torque, fuel type) come from the base variant, else the first variant by sort order that has the value. The starting price is the minimum current market-wide price, with its type, provenance and variant name.
- Validation: page 1–10000, pageSize 1–48, sort in set, market `^[A-Za-z]{2}$`, q ≤ 100, ≤ 20 manufacturers. Fuel/transmission/ABS values must be in their sets. Ranges ordered: maxPrice ≥ minPrice, maxCc ≥ minCc, yearTo ≥ yearFrom. Cc 0–3000, seat height 500–1200, weight 50–500, years 1900–2100, prices ≥ 0.

### 3.2 Detail
Variants ordered by sort order then name. Each variant's current prices in the market are ordered market-wide first, then region, then price type. Spec groups follow enum order (Engine … Battery). Rows follow definition sort order and include only definitions where some variant has a value. Values are index-aligned with variants, `null` = unknown. Sources = distinct citations referenced by specs and prices, ordered by source name. Related = up to 4 published models in the same category **or** same manufacturer, same category first, then most recently updated.

### 3.3 Filters endpoint
Manufacturers with ≥ 1 published model (name order) with counts. Categories and statuses with counts, in enum order. Fixed fuel/transmission/ABS lists. Min/max of current market-wide prices, displacement across published variants, and launch year. Each range is `null` when there are no values.

### 3.4 Admin
- Manufacturers: name ≤ 100, required, plain text (no control chars except `\n\r\t`). Slug optional and canonical (generated from name). Website must be absolute http(s). Slug unique across **archived** rows too. Name unique among active rows. Update requires `version` (xmin), otherwise 409. Archive is refused (409) while active models exist. List: `q` ILIKE on name or slug, `sort=name|updated`, `includeArchived`, page size 1–100.
- Motorcycles: manufacturer must exist (404 otherwise). Slug generated from `"{manufacturer} {name}"`. `(manufacturer, name)` unique among active. `publicationStatus` may not be `Archived` via PUT. Publishing sets `published_at` only the first time. Archive sets `Archived` and `deleted_at`.
- Each create, update (only when something changed) and archive writes an `audit_logs` row in the same transaction: action, entity, summary, field diff `{field: {from, to}}` (camelCase keys), user id/name, correlation id.

### 3.5 Errors
RFC 9457 Problem Details (`application/problem+json`) with `traceId` and `correlationId`. Validation → 400 `errors{camelCasePath: [messages]}`; model-binding errors (e.g. unknown enum) use the same shape. 404 / 409 / 401 / 403 / 429 / 500 (no details).

### 3.6 Auth
ASP.NET Core Identity: PBKDF2 password hashes (Identity V3 format), lockout after 5 failures for 15 min, minimum password policy (12+ chars, upper, lower, digit). Cookie `motoscope.auth`: HttpOnly, SameSite=Strict, Secure in production, 8 h sliding expiry. Policies: Editor = Admin|Editor, Moderator = Admin|Moderator, Admin. No public registration.

## 4. Data model
13 application tables plus 7 Identity tables. See DATABASE.md. Notable features: `pg_trgm` GIN index, partial unique indexes with `NULLS NOT DISTINCT`, check constraints, `xmin` concurrency, enums stored as varchar.

## 5. External integrations, background processing, files
**None exist yet.** No HTTP clients, hosted services, timers, queues or upload handling. Cloudinary and trend providers were only planned.

## 6. Dependencies being removed
.NET 10 SDK/runtime, ASP.NET Core, EF Core + Npgsql, ASP.NET Identity, FluentValidation, Asp.Versioning (+OpenApi), Serilog, Swashbuckle UI.

## 7. Tests
39 unit tests (slug, search text, paging, correlation id, validators) and 33 integration tests (catalogue, admin, auth, concurrency, audit) against PostgreSQL. All are ported (see BACKEND_MIGRATION_TEST_REPORT.md).

## 8. Migration risks and decisions

| Risk | Mitigation |
|---|---|
| Existing EF-managed databases | Drizzle baseline equals the EF schema. The migrator detects `__ef_migrations_history` containing `InitialCatalogue` and records the baseline as applied instead of running it. Later Drizzle migrations are additive |
| Existing staff passwords | Verify the ASP.NET Identity V3 hash format (PBKDF2, any PRF, any iteration count) in Node, so existing users can still log in. New hashes use the same format (HMAC-SHA512, 210,000 iterations) |
| Cookie sessions without Identity | New additive `sessions` table storing SHA-256 of a random token, with server-side expiry and deletion on logout |
| `numeric` returned as strings by node-postgres | Map to JS numbers in Drizzle (`mode: "number"`). Values are ≤ 12 significant digits, so precision is safe |
| Timestamp precision | Postgres stores µs; JS `Date` serialises ms. Responses lose sub-millisecond digits (documented as an intentional difference) |
| xmin concurrency | Select `xmin::text::bigint`; update with `WHERE xmin = $v::text::xid`. Zero rows means 409 |
| Serverless rate limiting | In-memory per instance (same as before per API instance). Use the platform firewall or a shared store in production |
| Build independence | Pages call `connection()` before touching the database, so `next build` never needs PostgreSQL |
