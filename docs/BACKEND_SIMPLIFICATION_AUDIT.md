# Backend Simplification Audit (PostgreSQL removal + Carapis)

Date: 2026-10-31. Scope: `apps/web` (Next.js 16.4.3, App Router, Node.js runtime, TypeScript strict).

## 1. Current backend architecture

One Next.js application. Route Handlers under `src/app/api/v1` and `src/app/health` call services in `src/lib/services`, which use Drizzle ORM over `pg` against PostgreSQL. Server Components call the same services in-process through `src/lib/data/catalogue.ts`.

## 2. Database-related code (would be removed)

| Area | Files |
|---|---|
| Connection / ORM | `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `drizzle.config.ts` |
| Migrations | `src/lib/db/migrations/` (0000 baseline, 0001 sessions), `src/lib/db/migrate.ts` |
| Seeds | `src/lib/db/seed/reference.ts`, `src/lib/db/seed/demo.ts` |
| Services | `src/lib/services/catalogue.ts`, `services/admin/{manufacturers,motorcycles}.ts`, `services/audit.ts`, `services/auth.ts` |
| Auth (DB-backed) | `src/lib/auth/session.ts`, `src/lib/auth/staff.ts` (password hashing in `auth/password.ts` is DB-independent) |
| CLI | `scripts/db-migrate.mts`, `scripts/db-seed.mts`, `scripts/create-admin.mts` |
| Health | `src/app/health/ready/route.ts` (database check) |
| Tests | `tests/integration/*` (real PostgreSQL), `MOTOSCOPE_TEST_DB` |
| Packages | `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`, `uuid`, `tsx` (CLI only) |
| Env | `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_STATEMENT_TIMEOUT_MS`, `MOTOSCOPE_TEST_DB`, `MOTOSCOPE_ADMIN_PASSWORD` |
| Infra / docs | `docker-compose.yml`, `infrastructure/docker`, `docs/DATABASE*.md` |

## 3. Existing API endpoints and their dependency on the database

| Endpoint | Depends on DB | Replaceable by Carapis? |
|---|---|---|
| GET `/api/v1/manufacturers`, `/manufacturers/{slug}` | yes | No: Carapis has no manufacturer catalogue endpoint |
| GET `/api/v1/motorcycles` (search/filter/sort/page) | yes | Partly: `/listings` filters by make, model, year and price only. No category, engine cc, ABS, seat height, weight or fuel filters |
| GET `/api/v1/motorcycles/filters` | yes | No |
| GET `/api/v1/motorcycles/{slug}` (variants, spec groups, provenance, sources) | yes | No: no documented single-listing endpoint on `/v2`; no technical specs beyond fuel type and transmission |
| GET `/api/v1/sitemap-entries` | yes | No |
| POST/GET `/api/v1/auth/login|logout|me` | yes (users, sessions) | No: removing the database removes staff accounts |
| `/api/v1/admin/*` (create/update/archive, concurrency, audit) | yes | No: writes need storage |
| `/health/ready` | yes | Would become a static readiness check |

## 4. Frontend dependencies on the database

`/` (recent profiles, categories, manufacturers), `/motorcycles` (catalogue + filters), `/motorcycles/[slug]` (spec tables, provenance, sources, related), `/manufacturers`, `/manufacturers/[slug]`, `sitemap.xml`. All read through `src/lib/data/catalogue.ts`.

## 5. Carapis findings (from official docs; no API key available, so nothing verified live)

**API surface: the documentation is inconsistent.**
- Getting started, Listings and the JavaScript client document only `GET https://api.carapis.com/v2/listings` (Bearer auth). Parameters: `source` (required), `make`, `model`, `year_min`, `year_max`, `price_min`, `price_max`, `limit` (default 20, no documented max), `page`. Response: `{ count, page, limit, results[] }`, with listing fields `id, source, make, model, trim, year, mileage, price, currency, location, fuel_type, transmission, photos[], dealer, url` (+ optional `inspection_sheet`, `accident_history`, `price_history`).
- Each platform page instead documents `GET /apix/api/vehicles/`, `GET /apix/api/vehicles/{id}/` and `GET /apix/api/sources/`, with different field names (`brand_name`, `model_name`, `price_usd`, `price_original`, `price_original_currency`, `engine_cc`, `last_seen_at`). They call the schema "indicative" and say `/sources/` is authoritative for what a key can access.
- No single-listing endpoint exists on `/v2`.

**Errors and limits.** Errors use `{ error: { code, message } }` with 400/401/403/404/422/429/500. 429 has code `rate_limit_exceeded`; no rate-limit or `Retry-After` headers are documented. Plans: Free and no-subscription 100 requests/day, Production 5,000/day, Scale 25,000/day. Quota counts per request. Sold cars are returned by default.

**Indian coverage (the decisive finding).**
- India-related slugs listed: `cardekho`, `carwale`, `cars24-india`, `cartrade`, `droom`, `spinny`, `bikewale`, `zigwheels`, `olx-india`, `mahindra-first-choice`, `maruti-true-value`, `team-bhp`, `truebil`.
- Every India platform page checked (CarDekho, CarWale, BikeWale, Cars24 India) states: **"On request — not in the live feed today."** Activation takes about 2–3 weeks and is "quoted per source".
- Two-wheelers: BikeWale ("moto, new") and Cars24 India ("used, moto") are described as having motorcycles. Both are on request.
- Currency for Indian sources is not stated (INR unconfirmed). Technical specs: at most `engine_cc`, `seat_count` and `drive_type` on the `/apix` detail schema. No power, torque or dimensions.
- The data is **marketplace listings** (mostly used vehicles; some portals have new-car pages). It is not an official manufacturer catalogue and has no ex-showroom price semantics.

| Question | Answer from docs |
|---|---|
| Indian sources supported? | Listed, but on request only |
| Active today? | No (for every India page checked) |
| Accessible under our plan? | Unknown: no key; per-source activation is quoted separately |
| Motorcycles / scooters? | Described for BikeWale and Cars24 India (on request) |
| New-vehicle catalogue? | No catalogue API; listings only |
| Used listings only? | Mostly used marketplace listings |
| Technical specs? | Not on `/v2`; `engine_cc` only on `/apix` detail |
| Engine/power/torque/dimensions? | Engine cc at most; no power, torque or dimensions |
| INR? | Not stated |
| Limits? | 100/day free; 5,000/day Production; 25,000/day Scale |

## 6. Required changes (as requested) and breaking changes

Breaking changes if PostgreSQL is removed:
1. The curated motorcycle catalogue, spec tables with provenance and citations, manufacturer pages and sitemap entries lose their data. They would need to be removed or turned into Carapis listing pages.
2. Staff login, sessions, admin create/update/archive, optimistic concurrency and the audit log are removed. There is nowhere to persist them.
3. Catalogue filters that Carapis cannot express (category, engine cc, ABS, seat height, kerb weight, fuel, transmission, sort) disappear.
4. Until a Carapis key exists **and** Indian sources are activated, the site has **no vehicle data**: Indian pages show empty states.

## 7. Decision (2026-10-31) and outcome

After this audit the product owner chose to **add Carapis alongside the existing PostgreSQL backend** and to defer
removing the database. Removing it now would delete the working catalogue, staff login, admin API and audit log, and
replace them with a provider that has no live Indian source, no API key, and (as later observed) a documented listings
endpoint that returns 404. PostgreSQL removal remains planned. It should happen once a key works and an Indian source
is activated, and once there is a plan for whatever must outlive the database (catalogue content, staff accounts).

Implemented in this phase: the Carapis integration, `/api/v1/vehicles`, `/api/v1/vehicles/search`,
`/api/v1/integration/carapis/status`, and the `/listings` page. Details, live findings and test results:
[CARAPIS_INTEGRATION.md](CARAPIS_INTEGRATION.md). Nothing was removed.
