# MotoScope

**Know your machine before you buy it.** An India-first motorcycle intelligence platform: a structured catalogue with specifications and prices that always show their source and status. Later phases add comparison, ownership-cost calculators, a source-backed trend radar and a moderated reliability knowledge base.

> **Status:** first vertical slice. Manufacturers → catalogue (search, filters, sorting) → motorcycle profiles, with staff login and admin APIs for manufacturers and models. The backend was migrated from ASP.NET Core to Next.js Route Handlers on 2026-10-31 (see [docs/BACKEND_MIGRATION_AUDIT.md](docs/BACKEND_MIGRATION_AUDIT.md)). Progress: [docs/ROADMAP.md](docs/ROADMAP.md). A *Marketplace listings (beta)* page backed by Carapis is implemented but not yet connected: no API key, and Indian sources need activation (see [docs/CARAPIS_INTEGRATION.md](docs/CARAPIS_INTEGRATION.md)).

## Repository layout

```text
apps/web                  One Next.js 16 app (App Router, TypeScript strict, Tailwind v4, Node.js runtime)
  src/app                 Pages + REST API Route Handlers (/api/v1/*, /health/*)
  src/lib                 Services, Drizzle schema/migrations, validation (Zod), auth, HTTP plumbing
  scripts                 CLI: db-migrate, db-seed, create-admin
  tests, e2e              Integration tests (real PostgreSQL), Playwright flows
docs/                     Architecture, database, API, data sources, security, SEO, roadmap, migration records
infrastructure/docker     Postgres init script used by docker-compose.yml
```

Architecture summary: one Next.js application serves the pages and the API. Server Components call services in-process; browsers use `/api/v1/*`. Drizzle ORM talks to PostgreSQL. The app is the single identity authority (database-backed sessions in an HttpOnly cookie, role policies checked on the server). Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 22 (developed on 26) |
| PostgreSQL | 15+ (17 used). Docker Compose **or** a native install |

## 1. Database

**Option A — Docker Compose**

```bash
cp .env.example .env          # set POSTGRES_PASSWORD
docker compose up -d          # Postgres 17 on :5432; also creates motoscope_test
```

**Option B — native PostgreSQL.** As a superuser, run:

```sql
CREATE ROLE motoscope LOGIN CREATEDB PASSWORD '<choose a local password>';
CREATE DATABASE motoscope OWNER motoscope;
CREATE DATABASE motoscope_test OWNER motoscope;
```

## 2. Configure, migrate, seed

```bash
cd apps/web
cp .env.example .env.local    # set DATABASE_URL=postgres://motoscope:<password>@localhost:5432/motoscope
npm install

npm run db:migrate            # schema + reference data (markets, roles, spec definitions); safe to re-run
npm run db:seed               # DEVELOPMENT ONLY: demo catalogue of fictional brands
npm run db:seed -- --reset    # rebuild the demo rows (real data untouched)

# first staff user (no default passwords exist); prompts for the password
npm run admin:create -- --email you@example.com
#   options: --role Admin|Editor|Moderator  --name "Display Name"
#   non-interactive: set MOTOSCOPE_ADMIN_PASSWORD for that one command
```

`db:migrate` also adopts a database created by the former .NET backend without touching its data (see [docs/DATABASE_MIGRATION.md](docs/DATABASE_MIGRATION.md)).

## 3. Run

```bash
npm run dev                   # http://localhost:3000  (API at /api/v1, health at /health/live and /health/ready)
```

A production build runs with `npm run build && npm start`. It sets `Secure` session cookies, so to sign in over plain `http://localhost` set `AUTH_SECURE_COOKIE=false` for that local run.

## Environment variables (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required at runtime, not at build time). Use a pooled endpoint on serverless |
| `DATABASE_POOL_MAX`, `DATABASE_STATEMENT_TIMEOUT_MS` | Pool size (default 10) and statement timeout (default 30 s) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata and sitemap |
| `SITE_INDEXING` | `enabled` only in production; otherwise noindex and a disallow-all robots.txt |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Shows a Contact link when set |
| `TRUST_PROXY` | `true` behind a proxy that overwrites `X-Forwarded-For` (e.g. Vercel), for per-client rate limits |
| `RATE_LIMIT_PUBLIC_PER_MINUTE`, `RATE_LIMIT_AUTH_PER_MINUTE`, `RATE_LIMIT_SUBMISSIONS_PER_HOUR` | Rate limits (defaults 300 / 10 / 5) |
| `AUTH_SECURE_COOKIE` | Override the `Secure` cookie flag (`true` in production by default) |
| `LOG_LEVEL` | `debug` / `info` (default) / `warn` / `error` |
| `MOTOSCOPE_ADMIN_PASSWORD` | Password for `admin:create` (otherwise prompted) |
| `CARAPIS_API_KEY`, `CARAPIS_BASE_URL` | Optional marketplace-listings provider (server-side only). Without a key, `/listings` shows a "not connected" state. See [docs/CARAPIS_INTEGRATION.md](docs/CARAPIS_INTEGRATION.md) |
| `RATE_LIMIT_PROVIDER_PER_MINUTE` | Per-client limit on routes that call the paid provider (default 20) |
| `MOTOSCOPE_TEST_DB` | Integration-test database. **Its schema is dropped and recreated on every test run** |

Never commit real values. Templates: [.env.example](.env.example), [apps/web/.env.example](apps/web/.env.example).

## Tests and checks

```bash
cd apps/web
npm run lint && npm run typecheck && npm run format:check
npm test                                  # unit tests; DB integration tests are skipped without MOTOSCOPE_TEST_DB
MOTOSCOPE_TEST_DB=postgres://motoscope:<pw>@localhost:5432/motoscope_test npm test   # + integration tests
npm run build                             # production build (does not need the database)

# End-to-end (needs a migrated + seeded database and the app running)
npx playwright install chromium
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Deployment overview

- **App → Vercel** (or any Node.js host). Set `DATABASE_URL` (pooled), `NEXT_PUBLIC_SITE_URL`, `TRUST_PROXY=true`, and `SITE_INDEXING=enabled` on production only. Database routes use the Node.js runtime (never Edge).
- **Release step:** `npm run db:migrate` against production before switching traffic. Never run `db:seed` in production (it refuses).
- **PostgreSQL → managed provider** (Neon, Supabase, RDS, Azure) with backups or point-in-time recovery.
- Redis is not required. Add it only for multi-instance rate limiting or job queues.

## Data integrity

The development seed uses **fictional** manufacturers. Every value is flagged as demo data and badged in the UI. Real data enters through the admin API with a source citation. Unknown values stay empty. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).
