# Claude Code Project Prompt: Build MotoScope from Scratch

## 1. Role

Act as a **principal software architect, senior full-stack engineer, product designer, data engineer, and technical SEO specialist**. Build a production-minded automotive intelligence platform from scratch.

Do not merely generate a landing page or a static UI mockup. Build a working, maintainable application with a clear architecture, real database persistence, functional user-facing tools, an admin workflow, and a foundation for future monetization.

Work autonomously through the project in sensible phases. Inspect the repository first. If it is empty, initialize the project. If files already exist, understand them before changing anything. Do not overwrite useful work blindly.

When a requirement is ambiguous, choose a sensible, documented default and continue. Ask questions only when a missing decision blocks implementation.

---

# 2. Product Vision

## Product name

**MotoScope** (working name; keep branding and product metadata centralized so the name can be changed later).

## Positioning

**Know your machine before you buy it.**

MotoScope is an India-first motorcycle intelligence and ownership platform. It helps people research motorcycles, compare models, estimate real ownership costs, discover automotive trends, and understand reported reliability issues before making a purchase.

It combines three connected product areas:

1. **Automotive Intelligence Platform**
   - Motorcycle database and detailed model pages.
   - Motorcycle comparison.
   - Ownership cost and running-cost calculators.
   - Bike discovery and filtering.

2. **Automotive Trend Radar**
   - Trending motorcycle models, topics, launches, technologies, and discussions.
   - Trend movement and source-backed topic pages.
   - Editorial discovery tools that can help the MotoScope team identify future content opportunities.

3. **Reliability and Ownership Knowledge Base**
   - Structured, model-specific reported issues.
   - Maintenance information and ownership reports.
   - Clear distinction between verified manufacturer information, official recalls, editorially reviewed reports, and unverified owner-submitted experiences.

The first market is **India**, with prices in INR, Indian fuel-price assumptions, Indian model variants, and India-relevant content. Design the data model so additional countries and currencies can be supported later.

## Core product principle

MotoScope must be useful even if a visitor never creates an account. Comparison, discovery, model pages, and basic calculators should be accessible without authentication.

Do not build a generic automotive news blog. The product's differentiator is structured information and useful decision-making tools.

---

# 3. Target Users and Main Jobs to Be Done

### User A: Motorcycle buyer
- Has a budget and usage pattern.
- Wants to shortlist motorcycles.
- Needs to compare specifications and ownership costs.
- Wants to understand common reported issues before purchasing.

### User B: Existing motorcycle owner
- Wants maintenance information.
- Wants to understand known issues.
- Wants to compare running costs.
- May submit an ownership experience or issue report.

### User C: Automotive enthusiast / content creator
- Wants to discover rising topics and launches.
- Wants to understand what people are discussing.
- Wants reliable source links and trend history.
- Wants to identify topics worth researching or covering in videos.

### User D: MotoScope administrator/editor
- Manages motorcycle records, variants, specifications, sources, issue reports, articles, and trend topics.
- Reviews user-submitted reports.
- Corrects inaccurate information.
- Sees content and trend opportunities.

---

# 4. Product Scope

Build the project in phases. The initial implementation must prioritize a high-quality, working MVP rather than attempting every advanced feature at once.

## Phase 1: Working MVP

Build these features end to end:

1. Responsive public website and homepage.
2. Motorcycle catalogue with search, filtering, and sorting.
3. Motorcycle detail pages with structured specifications.
4. Side-by-side motorcycle comparison.
5. Ownership cost calculator.
6. EMI and fuel-cost calculators.
7. Trend Radar with source-backed topics and trend direction.
8. Reliability database with model-specific issue categories and report status.
9. Admin dashboard and CRUD workflows.
10. User-submitted ownership/issue reports with moderation.
11. SEO foundations, sitemap, robots, metadata, and structured data.
12. Analytics/event instrumentation and basic privacy-conscious consent handling.

## Phase 2: Growth and monetization foundations

Prepare architecture and UI extension points for:

- Affiliate product recommendations.
- Sponsored placements with clear disclosure.
- Dealer and insurance referral leads.
- Premium ownership reports.
- Featured listings.
- Newsletter subscriptions.
- Saved comparisons and user accounts.
- Editorial articles and buying guides.

Do not integrate paid services or invent affiliate relationships during Phase 1. Do not display fake ads, fake partners, fake reviews, or fabricated statistics.

## Phase 3: Advanced intelligence

Keep the architecture extensible for:

- Automated trend ingestion from approved APIs and feeds.
- Historical trend charts.
- Topic clustering and duplicate detection.
- Trend scoring.
- Search-interest integrations.
- More advanced recommendation engine.
- Community ownership data and verified contributor profiles.
- Additional vehicle categories and countries.

---

# 5. Required Technology Stack

Use the following stack unless a genuine compatibility issue requires a documented alternative.

## Frontend
- **Next.js** using the current stable App Router.
- **TypeScript** with strict mode.
- **Tailwind CSS**.
- Reusable, accessible component system. Prefer shadcn/ui where it provides value.
- React Server Components by default.
- Client Components only where interactivity requires them.
- React Hook Form + Zod for complex forms.
- TanStack Query only where client-side server-state management genuinely helps.
- Recharts for charts where needed.

## Backend
- **ASP.NET Core .NET 10 Web API**.
- C#.
- Entity Framework Core for normal persistence and migrations.
- Use Dapper only for specific read-heavy queries where profiling demonstrates a benefit.
- FluentValidation or equivalent centralized validation.
- Swagger / OpenAPI.
- Structured logging.
- Centralized exception handling and Problem Details responses.
- API versioning strategy from the beginning.

The frontend and backend must be separate applications in a single repository/monorepo.

## Database and infrastructure
- **PostgreSQL** as the primary database.
- Redis is optional and should only be introduced when there is a concrete caching, rate-limiting, or background-processing need.
- Cloudinary integration should be abstracted behind an image-storage service. Local development must work without Cloudinary credentials.
- Auth.js may be used for the Next.js authentication layer if it integrates cleanly with the chosen ASP.NET authentication approach. Do not create two conflicting sources of identity or authorization. Document the final authentication flow.
- Docker Compose for local PostgreSQL and optional Redis.
- Environment-based configuration. Never commit secrets.

## Hosting direction
- Frontend should be deployable to Vercel.
- ASP.NET API should be deployable independently to a .NET-compatible host.
- PostgreSQL should use a managed provider in production.
- Do not assume that Vercel can host the ASP.NET API as a normal Next.js function.

## Quality tooling
- ESLint and Prettier.
- .NET analyzers and formatting.
- Unit tests for business logic.
- Integration tests for critical API/database workflows.
- Frontend tests for important interactive components.
- Playwright for key end-to-end flows where practical.

Use currently supported, mutually compatible package versions. Do not blindly copy outdated package versions from tutorials.

---

# 6. Repository Structure

Use a clear monorepo structure similar to:

```text
motoscope/
├── apps/
│   ├── web/                       # Next.js frontend
│   └── api/                       # ASP.NET Core Web API
├── packages/
│   └── shared-types/              # Only genuinely shared schemas/types if useful
├── infrastructure/
│   ├── docker/
│   └── deployment/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── DATA_SOURCES.md
│   ├── SECURITY.md
│   ├── SEO.md
│   └── ROADMAP.md
├── scripts/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Adapt where required, but keep frontend, API, infrastructure, and documentation clearly separated.

Before implementation, create:
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DATA_SOURCES.md`

Keep these documents updated as architectural decisions change.

---

# 7. Design and User Experience

## Visual direction

Create a premium, modern automotive product experience. It should feel like a polished digital product, not a generic Bootstrap dashboard or a template-generated blog.

Visual characteristics:
- Modern, confident, technical, and editorial.
- Strong typography and clear information hierarchy.
- Restrained dark/neutral palette with one distinctive accent color.
- High-quality motorcycle imagery where properly licensed.
- Clean specification tables and comparison layouts.
- Thoughtful charts and data visualizations.
- Subtle motion only where it improves feedback or comprehension.
- Responsive layouts designed for mobile first, then tablet and desktop.
- Excellent readability and accessibility.

Do not overuse:
- Glassmorphism.
- Gradients.
- Giant hero animations.
- Excessive card containers.
- Decorative charts with no useful data.
- Scroll-jacking or heavy animation libraries.

Performance and usability take priority over visual gimmicks.

## Global navigation

Suggested public navigation:

- Home
- Motorcycles
- Compare
- Discover Trends
- Reliability
- Calculators

Include a clear search entry point and a mobile navigation experience.

## Homepage

The homepage should immediately explain what MotoScope does and guide visitors to useful actions.

Suggested sections:

1. Hero: “Know your machine before you buy it.”
2. Prominent motorcycle search.
3. Compare motorcycles call to action.
4. Ownership cost calculator call to action.
5. Trending motorcycles and topics.
6. Recently updated motorcycle profiles.
7. Commonly reported issues, with careful status labels.
8. Latest buying guides / editorial content when available.
9. Newsletter signup only when the backend workflow exists.
10. Footer with About, Contact, Editorial Policy, Data Sources, Privacy, and Terms.

Do not fill the homepage with fake numbers, fake visitor counts, fake review scores, or invented “most popular” claims. If the database is empty, provide a useful empty state and clear admin setup instructions.

---

# 8. Feature Requirements

## 8.1 Motorcycle Catalogue

Create a searchable, filterable catalogue.

### Filters
- Manufacturer.
- Model.
- Price range.
- Engine capacity.
- Vehicle type / category.
- Fuel type.
- Transmission.
- Seat height.
- Kerb weight.
- ABS configuration.
- Availability status.
- Launch year.

### Sorting
- Price low to high.
- Price high to low.
- Engine capacity.
- Newest model.
- Recently updated.

### Motorcycle cards
Show:
- Image.
- Manufacturer and model.
- Starting/selected variant price, clearly labelled.
- Engine capacity.
- Power and torque where known.
- Vehicle category.
- Compare action.
- Link to detailed profile.

Filtering must be server-backed for scalable datasets. Use query parameters so filters can be shared and indexed appropriately where useful.

## 8.2 Motorcycle Detail Pages

Each motorcycle should have a stable, SEO-friendly slug.

Suggested page sections:
- Overview.
- Variants.
- Price and availability.
- Engine and performance.
- Dimensions and ergonomics.
- Brakes, suspension, wheels, and tyres.
- Electronics and safety.
- Mileage / real-world economy, clearly separating official claims from owner-reported figures.
- Ownership cost estimate.
- Reliability and reported issues.
- Related motorcycles.
- Sources and last-updated date.

### Important data integrity rules
- A specification must be nullable when unknown. Never invent missing values.
- Store units explicitly and use consistent display conversions.
- Distinguish manufacturer-claimed data from editorially verified data and user-submitted data.
- Every important specification should be traceable to a source where possible.
- Record `sourceUrl`, `sourceName`, `retrievedAt`, `verifiedAt`, and verification status where appropriate.
- Never present an estimated price as an official ex-showroom or on-road price.
- Store price type, region, effective date, and source.

## 8.3 Motorcycle Comparison

Allow users to compare at least 2 and ideally up to 4 motorcycles.

Requirements:
- Search and add motorcycles.
- Side-by-side specification comparison.
- Highlight meaningful differences, not arbitrary “winner” badges.
- Group specifications into Engine, Performance, Dimensions, Brakes, Suspension, Features, and Price.
- Clearly label unavailable data.
- Show variant and price assumptions.
- Make the comparison usable on mobile. A horizontally scrollable comparison table is acceptable if well designed.
- Allow comparison URLs to be shared.
- Do not require login for basic comparison.

Optional later feature:
- A configurable weighted comparison score. If implemented, expose the scoring criteria and weights. Never imply that a subjective score is an objective engineering truth.

## 8.4 Ownership Cost Calculator

This is a core differentiator and must work correctly.

Inputs:
- Motorcycle / selected variant.
- Purchase price.
- Down payment.
- Loan principal, if financed.
- Annual interest rate.
- Loan duration.
- Monthly distance travelled.
- Expected mileage in km/l.
- Fuel price per litre.
- Annual insurance estimate.
- Annual maintenance estimate.
- Annual consumables estimate.
- Accessories / one-time expenses.
- Ownership duration in months or years.

Outputs:
- Monthly fuel cost.
- Annual fuel cost.
- Total fuel cost over ownership period.
- Maintenance total.
- Insurance total.
- Consumables total.
- Loan EMI.
- Total loan interest.
- Total purchase/financing outflow.
- Total ownership cost.
- Estimated cost per kilometre.
- Monthly average ownership cost.

### Calculation rules
- Keep calculation logic in tested, reusable functions, not inside UI components.
- Clearly distinguish cash purchase cost from financed cash outflow.
- Avoid double-counting down payment and loan principal.
- Use a standard reducing-balance EMI formula and document it.
- Allow users to edit assumptions.
- Show a breakdown and explain that outputs are estimates, not quotes.
- Format INR correctly.
- Add tests for zero-interest loans, zero distance, missing optional expenses, and different ownership durations.

Do not use fake live fuel prices. Initially, let the user enter the fuel price and optionally provide an editable default with a clear “illustrative default” label.

## 8.5 EMI and Mileage Calculators

Provide standalone calculators as well as reusable components inside ownership cost.

EMI calculator:
- Principal.
- Annual interest rate.
- Tenure.
- Monthly EMI.
- Total interest.
- Total repayment.
- Amortization summary if practical.

Mileage/fuel calculator:
- Distance.
- Fuel consumed or mileage.
- Fuel price.
- Cost per kilometre.
- Trip fuel cost.

Validate inputs and handle invalid values without crashes.

---

# 9. Automotive Trend Radar

This is a major product area. Build it as a source-backed discovery system, not a page containing random headlines.

## Trend categories

- Motorcycle models.
- New launches.
- Upcoming motorcycles.
- Electric two-wheelers.
- Technology and engineering.
- Ownership and reliability discussions.
- Accessories and riding gear.
- Touring and travel.
- Regulations, recalls, and safety.

## Trend topic record

A trend topic should support:
- Title.
- Slug.
- Summary.
- Category.
- Related manufacturers/models.
- Source records.
- First detected timestamp.
- Last detected timestamp.
- Current trend score.
- Previous score.
- Trend direction.
- Evidence count.
- Editorial status.
- Country/market.
- Created and updated timestamps.

## Trend scoring

Implement a transparent, explainable trend score. Start with a simple deterministic scoring model using available evidence, for example:
- Recency.
- Number of independent sources.
- Change in observed mentions/search interest over time.
- Source reliability.
- Engagement signals only when legitimately available.

Do not pretend to know search volume or social engagement when the source does not provide it.

Each displayed score must have an explanation or methodology link. If there is insufficient evidence, show “Not enough data” instead of fabricating a score.

## Data-source integrations

Design provider adapters so integrations can be added without coupling the core application to one provider.

Potential sources:
- Google Trends / approved trends data access where available.
- YouTube Data API for public video metadata and permitted metrics.
- Official manufacturer newsrooms and launch announcements.
- Official government / regulatory recall and safety notices.
- RSS feeds from reputable automotive publications.
- Reddit API only in accordance with its current API terms and rate limits.
- Other approved APIs with documented licensing and usage conditions.

### Strict ingestion rules
- Respect robots.txt, API terms, rate limits, copyright, and source attribution requirements.
- Do not scrape sites that prohibit it or bypass authentication/paywalls.
- Do not copy full articles. Store short factual summaries written independently, source titles, source URLs, timestamps, and permitted metadata.
- Do not reproduce copyrighted article text.
- Do not scrape private communities or personal information.
- Store ingestion provenance and retrieval timestamps.
- Make provider integrations configurable and safe when credentials are absent.
- Never commit API keys.
- The app must run locally with seed data even when no external provider credentials exist.

### Initial implementation
Build:
1. Trend topic and source database models.
2. Admin CRUD for topics and sources.
3. Public trend listing and detail pages.
4. Category and date filters.
5. Trend direction indicators.
6. Source links and “why this is trending” evidence section.
7. A provider interface and at least one safe, configurable ingestion example if credentials and terms allow.
8. Seed trend topics clearly marked as sample/demo data.

Do not claim that demo records are live trends.

## Trend Radar UI

Display:
- Rising topics.
- Recently detected topics.
- Topics by category.
- Related motorcycle models.
- Evidence/source count.
- Trend direction.
- Last updated time.
- Source links.

Charts must only appear when enough historical data exists. Never draw fake historical trend lines.

---

# 10. Reliability and Ownership Knowledge Base

This feature needs unusually careful data modelling and wording because incorrect reliability claims can mislead buyers and unfairly damage a manufacturer or model's reputation.

## Issue categories
- Engine.
- Gearbox / clutch.
- Electrical / electronics.
- Cooling.
- Fuel system.
- Brakes.
- Suspension.
- Wheels / tyres.
- Build quality / rattles.
- Software / connectivity.
- Other.

## Issue record

Support:
- Motorcycle model and affected variant/year range.
- Issue title.
- Neutral factual description.
- Category.
- Symptoms.
- Reported frequency, only when supported by enough data.
- Severity classification with defined criteria.
- First reported date.
- Last observed date.
- Evidence/source records.
- Resolution or manufacturer response, if documented.
- Verification status.
- Editorial notes.
- Public visibility status.

## Required evidence statuses

Use explicit labels such as:
- **Official recall / safety notice**: backed by a manufacturer or regulator source.
- **Verified technical information**: supported by a credible technical or manufacturer source.
- **Editorially reviewed report**: reviewed by the MotoScope team, but not necessarily independently confirmed.
- **Owner-submitted report**: an individual experience that has not been independently verified.
- **Under review**: awaiting moderation.

Never label a model “unreliable” based on a few reports. Do not turn the number of submissions into a failure rate unless there is a valid denominator and methodology.

## User-submitted reports

Allow a visitor to submit:
- Motorcycle model and variant.
- Model year.
- Approximate ownership duration.
- Issue category.
- Description.
- Whether the issue was diagnosed by a service centre.
- Whether it was repaired.
- Optional repair cost.
- Optional supporting image/document, with safe file validation.
- Contact email only if needed for moderation follow-up.

Privacy:
- Do not publish submitter email, phone number, exact address, VIN, registration number, or other personal identifiers.
- Do not request unnecessary sensitive information.
- Add consent and a clear privacy notice.
- Sanitize all user-generated content.
- Add rate limiting and spam protection.
- Reports must enter a moderation queue and must not publish automatically.

## Moderation workflow

Admin should be able to:
- Review pending reports.
- Approve, reject, or request clarification.
- Edit public wording without changing the submitter's original record.
- Attach source evidence.
- Change verification status.
- Record moderation notes and audit history.
- Hide or remove content that violates policy.

Maintain an audit log for important moderation actions.

---

# 11. Admin Dashboard and Content Management

Build a protected admin area with role-based authorization.

Suggested roles:
- `Admin`
- `Editor`
- `Moderator`

Permissions:
- Admin: full access, user/role management, configuration.
- Editor: manage motorcycles, variants, specifications, trends, sources, and editorial content.
- Moderator: review user-submitted reliability reports and manage moderation statuses.

Admin modules:
1. Overview dashboard.
2. Manufacturers.
3. Motorcycle models.
4. Variants.
5. Specifications.
6. Prices and regional price records.
7. Trend topics.
8. Trend sources.
9. Reliability issues.
10. User-submitted reports.
11. Editorial articles / buying guides.
12. Media library.
13. Audit log.
14. Data import/export.

Requirements:
- Server-side authorization on every protected API route.
- Never rely only on hiding frontend buttons.
- Validate all admin input.
- Add pagination, search, filtering, and sorting.
- Use soft deletion or archival where historical references matter.
- Provide a clear empty state and a usable first-admin setup process.
- Never ship a publicly accessible default admin password.

---

# 12. Database Design

Design a normalized PostgreSQL schema. Use UUIDs or another consistent key strategy and document the choice.

At minimum, evaluate these entities:

### Catalogue
- Manufacturer
- MotorcycleModel
- MotorcycleVariant
- Specification
- SpecificationDefinition
- ModelImage
- ModelPrice
- Market / Region
- DataSource
- SourceCitation

### Trends
- TrendTopic
- TrendTopicModel
- TrendObservation
- TrendSource
- TrendCategory
- IngestionRun

### Reliability
- ReliabilityIssue
- ReliabilityIssueEvidence
- OwnerReport
- ModerationAction
- IssueStatusHistory

### Users and administration
- User
- Role
- UserRole
- AuditLog

### Editorial and growth
- Article
- ArticleCategory
- NewsletterSubscriber (only if newsletter functionality is implemented)
- AffiliatePlacement (future-ready, not necessarily active in MVP)

Database requirements:
- Appropriate foreign keys.
- Unique constraints for slugs and natural identifiers.
- Indexes for common search/filter paths.
- Created/updated timestamps in UTC.
- Soft-delete strategy where needed.
- Concurrency handling for admin edits where useful.
- Migrations checked into source control.
- Seed data separated from production data.
- No giant unstructured JSON field as a substitute for proper relational modelling. JSONB is acceptable for genuinely variable metadata, with documented use.

Create an ERD in `docs/DATABASE.md` using Mermaid.

---

# 13. API Design

Use REST endpoints with consistent naming, validation, pagination, filtering, and error responses.

Example endpoint groups:

```text
/api/v1/manufacturers
/api/v1/motorcycles
/api/v1/motorcycles/{slug}
/api/v1/motorcycles/{id}/variants
/api/v1/comparisons
/api/v1/calculators/emi
/api/v1/calculators/ownership-cost
/api/v1/calculators/fuel-cost
/api/v1/trends
/api/v1/trends/{slug}
/api/v1/reliability/issues
/api/v1/reliability/issues/{id}
/api/v1/reliability/reports
/api/v1/admin/...
```

Guidelines:
- Use DTOs; never expose EF entities directly.
- Validate all inputs.
- Use consistent Problem Details errors.
- Add pagination metadata.
- Add cancellation-token support.
- Avoid N+1 database queries.
- Use projections for list/detail endpoints.
- Keep business logic out of controllers.
- Add OpenAPI descriptions and examples.
- Protect admin routes with server-side role checks.
- Apply rate limits to public submission and expensive endpoints.
- Use idempotency where appropriate for ingestion jobs and report submission.

Document the API in `docs/API.md`.

---

# 14. Search, SEO, and Discoverability

SEO is a core acquisition channel, not a final polish task.

Implement:
- Server-rendered/indexable public pages.
- Unique titles and meta descriptions.
- Canonical URLs.
- Open Graph and social metadata.
- XML sitemap generated from published content.
- robots.txt.
- Breadcrumbs.
- Semantic HTML.
- Internal linking between related models, comparisons, issues, and guides.
- Structured data only when it accurately reflects visible page content.
- Useful 404 and not-found pages.
- Pagination and canonical handling for filtered pages.
- Avoid indexing thin, duplicate, or empty filter combinations.

Potential structured data:
- Product only when the page genuinely describes a product and required fields are accurate.
- Article for editorial content.
- BreadcrumbList for navigation.
- Organization / WebSite where appropriate.

Do not fabricate ratings, offers, availability, or review counts to qualify for rich results.

Create `docs/SEO.md` with an implementation and content strategy.

---

# 15. Analytics and Product Learning

Instrument meaningful events without collecting unnecessary personal data.

Suggested events:
- `motorcycle_search`
- `motorcycle_filter_applied`
- `motorcycle_view`
- `comparison_created`
- `comparison_shared`
- `ownership_calculator_used`
- `emi_calculator_used`
- `trend_topic_viewed`
- `reliability_issue_viewed`
- `owner_report_submitted`
- `affiliate_link_clicked` (only when affiliate links are actually active)

Build a small internal analytics view only if it can be done without creating a privacy problem or overengineering the MVP.

Use Google Analytics 4 only after consent requirements and configuration are addressed. Provide a privacy-conscious alternative or allow analytics to be disabled in local development.

The goal is to learn:
- Which motorcycles attract interest.
- Which comparisons are popular.
- Which calculator inputs/features are used.
- Which trend categories attract visitors.
- Which reliability topics get attention.
- Which pages lead to meaningful actions.

---

# 16. Security, Privacy, and Reliability

Implement sensible production security from the beginning.

- Validate and normalize all input.
- Parameterize database queries.
- Protect against SQL injection, XSS, CSRF where applicable, and open redirects.
- Secure cookies and authentication flows.
- Use HTTPS in production.
- Apply API rate limiting.
- Restrict CORS to configured origins.
- Validate uploaded file types, sizes, and content.
- Store uploads outside the web root or in a managed object-storage service.
- Do not expose stack traces or secrets to clients.
- Use secure secret management.
- Add audit logging for admin actions.
- Avoid logging personal data unnecessarily.
- Add health-check endpoints.
- Use structured logs with correlation IDs.
- Configure sensible database timeouts and connection pooling.
- Handle external provider outages gracefully.
- Do not make external API availability a requirement for the core site to function.

Add `docs/SECURITY.md`.

---

# 17. Performance Requirements

The site must feel fast on ordinary Android phones and average Indian mobile connections.

Targets:
- Aim for Core Web Vitals in the “good” range on real pages.
- Avoid shipping large client-side bundles unnecessarily.
- Prefer Server Components for read-heavy pages.
- Use Next.js image optimization and responsive image sizes.
- Lazy-load below-the-fold imagery and noncritical widgets.
- Avoid layout shifts by reserving image dimensions.
- Paginate large lists.
- Add appropriate database indexes.
- Use caching with explicit invalidation rules.
- Avoid excessive client polling.
- Avoid unnecessary animation and large dependencies.
- Use skeletons only where they improve perceived loading.
- Optimize fonts and avoid loading multiple unnecessary weights.
- Keep comparison and calculator interactions responsive.
- Test production builds, not only development mode.

Do not claim a Lighthouse score without running Lighthouse against the actual deployed or production build. Record measurements and the tested environment.

---

# 18. Seed Data and Content Integrity

The application must be demonstrable locally without external API keys.

Create a small, clearly labelled sample dataset for:
- A few Indian motorcycle manufacturers.
- A few motorcycle models and variants.
- Realistic specification structures.
- Sample trend topics.
- Sample reliability reports and issue statuses.

Critical rules:
- Do not invent current prices, official specifications, recall claims, or real-world reliability statistics.
- If a value is illustrative, mark it as illustrative/demo data.
- Prefer leaving a field empty over making up a fact.
- Add source records for factual seed values where possible.
- Never present sample trend data as live data.
- Provide a seed-data reset command for development only.
- Never automatically seed demo records into production.

If reliable factual seed data cannot be verified, create clearly marked demo records with placeholder labels rather than presenting invented data as fact.

---

# 19. Testing and Acceptance Criteria

The MVP is not complete merely because it compiles.

## Frontend acceptance
- Homepage renders and is responsive.
- Catalogue search, filters, and sorting work.
- Motorcycle detail pages load from API data.
- Comparison works with 2–4 models.
- Comparison URL can be shared.
- Ownership calculator produces tested results.
- EMI and fuel calculators handle edge cases.
- Trend pages show source links and honest data status.
- Reliability pages display verification status clearly.
- User reports can be submitted and enter moderation.
- Admin UI is protected and usable.
- Empty/loading/error states exist.
- Keyboard navigation and accessible labels work.

## Backend acceptance
- Database migrations run from a clean database.
- Seed command works in development.
- API validation is consistent.
- Pagination and filtering work.
- Admin authorization is enforced server-side.
- Public report submission is rate-limited.
- Moderation actions are audited.
- External provider failure does not break the site.
- No secrets are committed.
- Critical business logic has unit tests.

## End-to-end flows
At minimum, test:
1. Visitor searches for a motorcycle and opens its detail page.
2. Visitor compares two motorcycles.
3. Visitor calculates ownership cost.
4. Visitor opens a trend topic and follows a source link.
5. Visitor submits an owner issue report.
6. Moderator logs in and reviews the report.
7. Editor creates or updates a motorcycle model.
8. Unauthorized user is blocked from admin APIs.

---

# 20. Development Workflow and Execution Instructions

Follow this order. Do not attempt to implement every feature in one enormous code dump.

## Step 1: Repository and architecture inspection
- Inspect the current working directory and existing files.
- Identify installed runtimes and tooling.
- Confirm compatible versions of Node.js, .NET SDK, PostgreSQL tooling, and package managers.
- Report any environment blockers.
- Create the architecture and roadmap documents.
- Define the frontend/backend communication and authentication approach.

## Step 2: Project foundation
- Initialize Next.js with TypeScript and Tailwind.
- Initialize ASP.NET Core Web API.
- Configure PostgreSQL and Docker Compose.
- Add environment configuration and `.env.example`.
- Add logging, exception handling, health checks, and Swagger.
- Establish linting, formatting, and test projects.
- Verify both apps run locally.

## Step 3: Database and API foundation
- Design and implement the initial schema.
- Add EF Core migrations.
- Add development seed data.
- Implement manufacturer and motorcycle read APIs.
- Implement admin CRUD foundations.
- Add API tests.

## Step 4: Public frontend foundation
- Build the design system and responsive global layout.
- Build homepage, catalogue, and detail pages.
- Connect pages to real API endpoints.
- Add loading, error, and empty states.
- Add metadata and SEO foundations.

## Step 5: Comparison and calculators
- Build comparison selection and shared URLs.
- Implement calculation functions with unit tests.
- Build the comparison and calculator interfaces.
- Verify calculations independently with test cases.

## Step 6: Trend Radar
- Implement trend/source models and APIs.
- Build listing and detail pages.
- Build admin management.
- Add provider adapter interfaces and safe ingestion scaffolding.
- Make demo/live status unmistakable.

## Step 7: Reliability knowledge base
- Implement issue and owner-report models.
- Build public issue pages and submission flow.
- Implement moderation queue and audit trail.
- Enforce verification labels and privacy safeguards.

## Step 8: Quality and release readiness
- Run unit, integration, and end-to-end tests.
- Run lint, type checks, .NET build, and production frontend build.
- Check responsive layouts.
- Run Lighthouse on a production build or deployed preview.
- Fix serious performance and accessibility issues.
- Review security, environment variables, and deployment documentation.
- Update README and all docs.

After each step:
1. Summarize what was implemented.
2. List files/modules created or changed.
3. Run relevant checks.
4. Report failures honestly.
5. Identify the next concrete task.

Do not mark a step complete if its acceptance criteria are not met.

---

# 21. Required Project Documentation

Maintain:

### README.md
- Product overview.
- Features.
- Architecture summary.
- Prerequisites.
- Local setup.
- Environment variables.
- Database setup and migrations.
- Seed instructions.
- How to run frontend and API.
- Test commands.
- Deployment overview.

### docs/ARCHITECTURE.md
- System architecture.
- Component responsibilities.
- Frontend/API interaction.
- Authentication and authorization.
- Caching strategy.
- Background ingestion strategy.
- Key architecture decisions and trade-offs.

### docs/DATABASE.md
- Entity descriptions.
- Mermaid ERD.
- Index strategy.
- Migration and seed process.

### docs/API.md
- Endpoint groups.
- Authentication requirements.
- Request/response conventions.
- Pagination and error format.

### docs/DATA_SOURCES.md
- Each external provider.
- What data is collected.
- API/usage terms to verify.
- Attribution requirements.
- Rate limits and credentials.
- Refresh cadence.
- Data provenance and limitations.

### docs/SECURITY.md
- Authentication.
- Authorization.
- Input validation.
- Upload safety.
- Rate limits.
- Secrets.
- Privacy and logging.

### docs/SEO.md
- URL structure.
- Metadata.
- Structured data.
- Sitemap.
- Indexing rules.
- Content architecture.

### docs/ROADMAP.md
- Phase 1 MVP.
- Phase 2 monetization.
- Phase 3 advanced intelligence.
- Completion status and outstanding work.

---

# 22. Important Engineering Rules

1. **Build working functionality, not decorative placeholders.**
2. Do not create fake data and present it as factual.
3. Do not hardcode API keys, passwords, prices, or environment-specific URLs.
4. Do not put business logic in React components or API controllers.
5. Do not expose database entities directly through APIs.
6. Do not introduce microservices without a demonstrated need.
7. Do not add Redis or other infrastructure just because it appears in the stack list.
8. Do not use a paid API without making the dependency and cost clear.
9. Keep provider integrations optional and resilient.
10. Keep the public website useful without login.
11. Make data provenance and verification status visible.
12. Make mobile experience and performance first-class requirements.
13. Use accessible semantic HTML and keyboard-friendly controls.
14. Keep the design consistent across all routes.
15. Do not leave broken buttons, fake interactions, or dead navigation links.
16. Do not claim tests passed unless they were actually run.
17. Do not silently swallow exceptions.
18. Avoid unnecessary abstractions, but keep clear boundaries between modules.
19. Use UTC internally and format dates for the user's locale.
20. Document assumptions and decisions rather than hiding them.

---

# 23. First Task: Start Now

Start by inspecting the repository and local development environment.

Then:
1. Present a concise architecture proposal and any important trade-offs.
2. Create the initial folder structure and documentation.
3. Initialize the Next.js frontend and .NET 10 API.
4. Configure local PostgreSQL through Docker Compose.
5. Verify that the frontend and API can both start.
6. Implement the first vertical slice: manufacturer list → motorcycle catalogue → motorcycle detail, backed by PostgreSQL and the ASP.NET API.
7. Add a small development-only seed dataset.
8. Add tests for the initial API and data access.
9. Update the README with exact setup and run commands.

**Do not stop after writing a plan. Begin implementation immediately.** If the environment prevents a step, explain the exact blocker, complete everything else that can be completed, and leave clear next actions.

The final result should be a maintainable foundation for a real automotive information business, not a one-off portfolio demo.
