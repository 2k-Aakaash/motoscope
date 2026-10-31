# MotoScope Roadmap

Status legend: ✅ done and verified · 🟡 partially done · ⬜ not started

## Phase 1 — Working MVP

| # | Area | Status | Verified by / notes |
|---|---|---|---|
| 0 | Repository, docs, tooling | ✅ | Single Next.js app (backend migrated from ASP.NET Core on 2026-10-31, see BACKEND_MIGRATION_TEST_REPORT.md). ESLint, Prettier, `tsc` clean. **Docker Compose file written but not run** (Docker not installed on the dev machine; native PostgreSQL 17 used) |
| 1 | Responsive public site and homepage | 🟡 | Layout, homepage, catalogue and profile pages checked at 1366px and 390px, light and dark, with no horizontal overflow. Trend and reliability sections arrive with those features |
| 2 | Catalogue: search, filters, sorting | ✅ | Server-backed and shareable via URL. Integration tests against PostgreSQL plus Playwright E2E (desktop and mobile) |
| 3 | Motorcycle detail pages | ✅ | Variant-aligned spec tables, provenance, sources, related models, real 404s |
| 4 | Comparison (2–4 models, shareable URL) | ⬜ | Card "Compare" action intentionally not shown until this exists |
| 5 | Ownership cost calculator | ⬜ | |
| 6 | EMI and fuel calculators | ⬜ | |
| 7 | Trend Radar | ⬜ | |
| 8 | Reliability knowledge base | ⬜ | |
| 9 | Admin dashboard and CRUD | 🟡 | API: database-backed sessions, lockout, manufacturer and model CRUD with role policies, optimistic concurrency, audit log (tested). Not started: admin UI; variant/spec/price/source/image endpoints |
| 10 | Owner reports and moderation | ⬜ | Rate-limit policy `submission` already defined |
| 11 | SEO foundations | 🟡 | Metadata, canonicals, filter indexing rules, sitemap, robots, BreadcrumbList, 404s. Not started: Article schema, slug redirects |
| 12 | Analytics events and consent | ⬜ | |
| 13 | Marketplace listings via Carapis | 🟡 | Client, API routes, `/listings` page and mocked tests done. **Blocked:** no API key; documented `/v2/listings` returns 404 live; Indian sources are "on request" (see CARAPIS_INTEGRATION.md §6–7) |

### Next concrete tasks (in order)
1. Admin API for variants, specifications (with citations), prices (`is_current` maintenance) and data sources, as Route Handlers + services. Then the admin UI (login, lists, editors) in `apps/web/src/app/admin`.
2. Comparison page `/compare?m=slug,slug` with variant selection, a grouped diff and a shareable URL. Add the card "Compare" action.
3. Calculator library (`apps/web/src/lib/calculators`): EMI (reducing balance), fuel and ownership cost, with Vitest edge cases. Then the UI.
4. Trend Radar schema, API, pages and an RSS provider adapter. Reliability schema, public pages, report submission and moderation with audit.
5. Analytics with consent. Lighthouse on a production build or deployed preview, with results recorded in SEO.md.
6. CI pipeline: build, lint, tests (integration tests against a Postgres service container), Playwright.
7. Generate an OpenAPI 3.1 document from the Zod schemas (replaces the former Swagger output).

### Known limitations
- Spec and price filters match per variant independently (see DATABASE.md).
- In-memory rate limiting is per server instance (weak on serverless; add the platform firewall or a shared store).
- Content-Security-Policy not configured yet.
- Changing the slug of a published model breaks existing links until the redirect table exists.

## Phase 2 — Growth and monetisation foundations (not started)
Affiliate placements (with disclosure, inactive until real partnerships exist), sponsored placements, dealer and insurance referral leads, premium ownership reports, featured listings, newsletter (double opt-in backend), member accounts and saved comparisons, editorial articles and buying guides.

## Phase 3 — Advanced intelligence (not started)
Automated ingestion from approved providers, historical trend charts (only once real history exists), topic clustering and de-duplication, trend scoring v2, search-interest integrations, recommendations, verified contributor profiles, more vehicle categories and countries.
