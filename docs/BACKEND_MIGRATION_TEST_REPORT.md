# Backend Migration Test Report

Date: 2026-10-31 · Environment: Windows 11, Node.js 26.12, PostgreSQL 17 (local, throwaway instance on port 5433), Next.js 16.4.3 production build (`next start`), .NET 10 API (pre-removal) for parity.

## 1. Live parity: old (.NET) vs new (Next.js) on the same database

Both backends ran simultaneously against one EF-created database that had been adopted by `npm run db:migrate`. Responses were compared field by field, with timestamps normalised to milliseconds and per-request `traceId`/`correlationId` ignored.

### Read endpoints, validation and auth errors (47 requests)
**44/47 identical.** Coverage: every public endpoint; every sort; text search including wildcard escaping and case; each filter type, alone and combined; pagination past the end; draft and unknown slugs (404); `market` casing; health; 400s for invalid sort, page size, ranges, enums, numbers and market; 401s for admin and `/me`.

The 3 differences are intentional and documented in API_MIGRATION_MAPPING.md (error key `fuel` vs `fuelTypes[0]`; two reworded messages).

**Bugs found by parity and fixed before cleanup:**
1. Correlated subqueries interpolating `${table.id}` in single-table selects rendered unqualified and bound to the subquery's own `id`, so model counts came back as 0. All correlated references are now explicitly qualified.
2. Spec-enum filters (`fuel`, `transmission`, `abs`) returned 500: Drizzle expands array parameters into a value list, which made `= any(...)` invalid. They now use `IN (...)`.

### Auth and admin flows (31 checks)
**31/31 identical**, including:
- login with a password hash **created by .NET Identity** (Next.js verifies it), and login on .NET with a hash **created by the new CLI**;
- cookie flags; `/me`; wrong password; non-JSON body (415); invalid body (400 field keys);
- admin list, get, create (201 + Location), update, stale version (409), duplicate name and slug (409), invalid payload, non-UUID id (404), unknown id (404);
- create → publish → visible publicly → archive → hidden; archiving a manufacturer blocked while it has models (409);
- `Archived` rejected via PUT/POST; logout; `/me` after logout (401); moderator 403 on catalogue admin.

Audit rows written by both implementations for the same actions matched (action, user, summary, field diff, correlation id). The one difference is the documented enum-value fix.

## 2. Automated tests (`npm test`)

| Suite | Tests | Result |
|---|---|---|
| Unit: formatting, catalogue URL state | 17 | ✅ passed |
| Unit: slug, search text, input guards (ported from xUnit) | 20 | ✅ passed |
| Unit: password hashing (incl. real .NET Identity hash), policy | 5 | ✅ passed |
| Unit: Zod validation (ported FluentValidation rules) | 16 | ✅ passed |
| Unit: route wrapper, Problem Details, correlation ids, rate limiter, paging | 12 | ✅ passed |
| Integration: catalogue API on PostgreSQL | 20 | ✅ passed |
| Integration: auth and admin API on PostgreSQL | 17 | ✅ passed |
| Integration: adopting an EF-created database | 2 | ✅ passed |
| **Total** | **109** | **109 passed** |

Without `MOTOSCOPE_TEST_DB`, the 39 database tests are reported as **skipped** (70 run).

New coverage beyond the former xUnit suite: lockout after 5 failures, server-side session invalidation on logout, inactive users with a live session, cross-origin write rejection, 415 for non-JSON bodies, login rate limiting (429), EF database adoption and its safety check, and verification of .NET-generated password hashes.

## 3. End-to-end and smoke tests (production build)

- Playwright, 5 flows × desktop and mobile: **10/10 passed** (search → detail, filters → shareable URL, price sort, real 404, anonymous admin API 401).
- Page smoke: `/`, `/motorcycles`, a detail page, a manufacturer page, invalid-filter notice, `/sitemap.xml` (17 URLs) all OK; unknown slug returns HTTP 404.
- **Database down** (unreachable `DATABASE_URL`): `/health/live` 200, `/health/ready` 503, homepage 200 with an "unavailable" notice, static pages 200, sitemap falls back to 6 static URLs, API returns 500 Problem Details with no internal details.
- `npm run build` with no database configured: succeeds (no build-time DB access).

## 4. Static checks

`tsc --noEmit` clean · ESLint clean · Prettier clean.

## 5. Not verified / follow-ups

- Docker Compose was not run (Docker is not installed on the development machine).
- Not yet run on Vercel with a managed, pooled PostgreSQL.
- OpenAPI document generation (formerly Swagger) is not reimplemented yet.
- Lighthouse has not been run.
