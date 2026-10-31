# Data Sources and Provenance

MotoScope's value depends on trustworthy data. This document lists every source the platform uses or plans to use, what is collected, and what must be verified before a provider is enabled.

## 1. Current state

| Data | Source today | Status shown to users |
|---|---|---|
| Manufacturers, models, variants, specifications, prices | **Demo seed only** (fictional brands) | "Demo data" badge on every record |
| Trend topics | Not yet implemented; seed will be demo-labelled | "Sample data — not live trends" |
| Reliability issues | Not yet implemented; seed will be demo-labelled, fictional models only | "Demo" plus evidence status |

### Why the seed uses fictional brands
The specification forbids inventing prices, official specifications, recalls, or reliability statistics. Specifications for real models could not be verified against primary sources during development. Attaching unverified numbers, and especially reliability reports, to real manufacturers could mislead buyers and unfairly harm those brands. The development seed therefore uses clearly fictional manufacturers (for example "Demo · Arka Motors"). Their numbers are plausible but illustrative. Real catalogue data must be entered by editors through the admin with a source citation for each important value.

The seed is **development-only**. It runs on explicit command (`npm run db:seed`) and refuses to run when `NODE_ENV=production` or `MOTOSCOPE_ENV=production`.

## 2. Provenance model

Each specification value and price stores:

- `provenance`: `ManufacturerClaimed` · `EditoriallyVerified` · `OwnerReported` · `Estimated` · `Demo`
- optional `source_citation` → `data_source` (name, homepage, type) plus `url`, `title`, `retrieved_at`
- `verified_at` when an editor confirmed the value

Prices also store `price_type` (`ExShowroom`, `OnRoad`, `Estimated`, `Illustrative`), market, optional region (state/city), and effective date. An estimated price is never labelled ex-showroom.

## 3. Planned external providers

None is enabled. Each provider must be reviewed against the checklist in §4 before it is switched on.

| Provider | Data collected | Terms to verify | Attribution | Rate limits / credentials | Cadence |
|---|---|---|---|---|---|
| Manufacturer newsrooms and press pages (India) | Launch announcements: title, URL, date, short independent summary | Site terms, robots.txt. Prefer RSS where offered | Link to the original announcement | None/public; polite crawl delay | Daily |
| Government / regulator safety notices (e.g. MoRTH, SIAM voluntary recall list) | Recall notices: model, date, scope, URL | Reuse terms of each portal | Link and agency name | Public | Weekly |
| RSS feeds of reputable Indian automotive publications | Headline, URL, published time, publication name. **No article body** | Feed licence/terms per publication | Publication name plus link | Respect `ttl` and caching headers | Hourly–daily |
| YouTube Data API v3 | Public video metadata (title, channel, publish time, view count where returned) | YouTube API Services Terms and Developer Policies, including data retention limits | "via YouTube" plus link | API key; daily quota units | Daily |
| Google Trends | Relative interest (0–100) only if an approved access path exists | There is no general public API. Do not scrape | "Google Trends" label | — | — (blocked until approved access) |
| Reddit API | Public post titles/links from automotive subreddits | Reddit Data API terms (commercial use may require an agreement) | Subreddit plus link | OAuth app; rate limits per terms | Daily (only after terms review) |

## 4. Provider enablement checklist

- [ ] Terms of service / API terms reviewed and the permitted use recorded here.
- [ ] robots.txt respected. No authentication or paywall bypass. No private communities.
- [ ] Only metadata and short **independently written** summaries are stored; no copyrighted article text.
- [ ] No personal data stored (usernames, profile links) unless strictly necessary and permitted.
- [ ] Credentials are stored in a secret store. The provider is disabled automatically when they are absent.
- [ ] Rate limits configured below the provider's published limits.
- [ ] Each ingestion run is recorded with provider, window, item counts, and errors.
- [ ] A provider outage does not affect the public site.

## 5. Limitations

- Owner-reported data reflects individual experiences, not failure rates. Counts are never presented as rates without a valid denominator.
- Trend scores reflect only the evidence MotoScope has collected, not total market attention.
