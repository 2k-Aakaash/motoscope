# Carapis Integration

Status (2026-10-31): **implemented against the documented contract, not yet working live.** There is no API key, and
the documented endpoint was not found on the live server (§6). Until both are resolved, MotoScope shows honest
"not connected" or "unavailable" states and never sample data.

## 1. Overview

Carapis aggregates **third-party vehicle marketplace listings** (mostly used vehicles). MotoScope uses it only for
the separate *Marketplace listings (beta)* page (`/listings`) and the `/api/v1/vehicles*` endpoints. Listing data
is never mixed into the curated motorcycle catalogue: catalogue values are official/verified specifications with
provenance, while listing prices are sellers' asking prices.

All provider calls happen on the server (`src/lib/carapis`, `src/lib/vehicles`). The browser only ever talks to
MotoScope.

```text
src/lib/carapis/  config.ts (key + base URL, server-only) · client.ts (fetch, Bearer, timeout, error mapping)
                  types.ts (documented shapes) · normalize.ts (→ MarketplaceVehicle) · errors.ts · sources.ts
src/lib/vehicles/ query.ts (Zod validation) · service.ts (shared by routes and page) · envelope.ts (response format)
src/app/api/v1/vehicles/route.ts · vehicles/search/route.ts · integration/carapis/status/route.ts
src/app/listings/page.tsx · src/components/listing-card.tsx
```

## 2. Environment

```env
CARAPIS_API_KEY=            # private; never NEXT_PUBLIC_
CARAPIS_BASE_URL=https://api.carapis.com/v2
RATE_LIMIT_PROVIDER_PER_MINUTE=20   # per-client limit on provider-backed routes (protects the paid quota)
```

- The key is read at runtime on the server only. Verified: a build with a canary key contained it nowhere in `.next`
  (browser bundles or server output), and the variable name does not appear in browser bundles.
- The base URL must be `https` (otherwise the app refuses to use it).
- The key is never logged, returned, or echoed. The status endpoint reports only `configured: true|false`.

## 3. MotoScope endpoints

| Endpoint | Purpose | Calls provider |
|---|---|---|
| `GET /api/v1/vehicles?source=…&make=&model=&year_min=&year_max=&price_min=&price_max=&limit=&page=` | Listings for one marketplace | yes |
| `GET /api/v1/vehicles/search?source=…&make=…` | Same, but requires at least one filter besides `source` (the provider has no free-text search) | yes |
| `GET /api/v1/integration/carapis/status` | Whether a key and a valid base URL are configured | **no** (status checks must not spend quota) |
| Vehicle detail | **Not implemented.** `/v2` documents no single-listing endpoint | — |

Validation (before any provider call): `source` is required and must be a lowercase slug. Years are 1900–2100 and
ordered. Prices are non-negative and ordered. `limit` is 1–50 (default 20). `page` ≥ 1, and `page × limit` ≤ 10,000
(the provider returns results only up to position 10,000).

### Response format

```json
{ "success": true, "provider": "carapis",
  "data": [ { "id": "…", "provider": "carapis", "source": "cardekho", "name": "Honda City VX", "make": "Honda",
              "model": "City", "variant": "VX", "year": 2021,
              "price": { "amount": 950000, "currency": "INR", "type": "marketplace_asking_price" },
              "fuelType": "gasoline", "transmission": "manual", "odometer": 35000, "location": "Pune",
              "seller": "…", "images": ["https://…"], "sourceUrl": "https://…", "dataType": "marketplace_listing" } ],
  "pagination": { "count": 1, "page": 1, "limit": 20 },
  "meta": { "source": "cardekho", "retrievedAt": "2026-10-31T10:00:00.000Z", "maxAgeSeconds": 1800,
            "dataType": "marketplace_listing", "notice": "Third-party marketplace listings. …" } }
```

```json
{ "success": false, "error": { "code": "CARAPIS_RATE_LIMITED", "message": "Vehicle data provider rate limit reached." } }
```

| Code | HTTP | When |
|---|---|---|
| `INVALID_PARAMETERS` | 400 | Our validation failed (`error.details` lists fields) |
| `RATE_LIMITED` | 429 | MotoScope's own per-client limit on provider routes |
| `CARAPIS_NOT_CONFIGURED` | 503 | No `CARAPIS_API_KEY` |
| `CARAPIS_INVALID_REQUEST` | 400 | Provider 400/422 |
| `CARAPIS_UNAUTHORIZED` | 401 | Provider 401 (our key is invalid) |
| `CARAPIS_FORBIDDEN` | 403 | Provider 403 (source or feature not on our plan) |
| `CARAPIS_NOT_FOUND` | 404 | Provider 404 |
| `CARAPIS_RATE_LIMITED` | 429 | Provider 429 (quota exhausted) |
| `CARAPIS_TIMEOUT` | 503 | No response within 10 s |
| `CARAPIS_UNAVAILABLE` | 503 | Network error or provider 5xx |
| `CARAPIS_INVALID_RESPONSE` | 502 | Non-JSON or malformed body |
| `INTERNAL_ERROR` | 500 | Anything else (logged server-side; no details returned) |

Provider messages are never forwarded; only our fixed messages are returned. The catalogue endpoints keep RFC 9457 Problem Details.

### Normalisation rules

- Values are copied only when present and of the right type; everything else is `null`. Nothing is inferred.
- `price` is kept only with a valid ISO 4217 `currency` from the same listing. It is never converted and never
  assumed to be INR, and it is labelled `marketplace_asking_price`.
- `odometer` is the listed number. The provider does not document the unit, so none is shown.
- Images and `sourceUrl` must be http(s) URLs. The original listing URL is kept for attribution.
- Listings without an `id` are dropped.
- The platform-page schema names (`brand_name`, `model_name`, `price_original` + `price_original_currency`) are read
  as fallbacks. `price_usd` (a provider conversion) is deliberately not used.

## 4. Rate limits and caching

- Plans (carapis.com/developers/plans): Free and no-subscription 100 requests/day; Production 5,000/day; Scale 25,000/day;
  Enterprise unlimited. The quota is counted per request; requests over the limit get 429 (no overage billing).
- MotoScope makes **one attempt per request: no automatic retries** (in particular none for 401/403/429).
- Successful provider responses are reused through the Next.js data cache for 30 minutes (`maxAgeSeconds` in `meta`).
  Listings are therefore not real-time.
- Provider-backed routes have a per-client limit (`RATE_LIMIT_PROVIDER_PER_MINUTE`, default 20/min) so anonymous
  traffic cannot exhaust the daily quota quickly. With 100 requests/day, a public launch needs a paid plan.

## 5. Indian coverage (documentation review, not live verification)

| Question | Finding |
|---|---|
| Indian sources listed | `cardekho`, `carwale`, `cars24-india`, `cartrade`, `droom`, `spinny`, `bikewale`, `zigwheels`, `olx-india`, `mahindra-first-choice`, `maruti-true-value`, `team-bhp`, `truebil` |
| Active today? | **No** for every India page checked (CarDekho, CarWale, BikeWale, Cars24 India): "On request — not in the live feed today". Activation takes 2–3 weeks and is quoted per source. Others not checked |
| Motorcycles and scooters | Described for BikeWale ("moto, new") and Cars24 India ("used, moto"), both on request |
| New-vehicle catalogue / official specs | No. Marketplace listings only. At most `engine_cc`, `seat_count` and `drive_type` on the `/apix` detail schema; no power, torque or dimensions |
| INR | Not stated by the documentation for any Indian source |
| Our plan's access | Unknown until a key exists. The docs name `GET /apix/api/sources/` as the authority |

**Conclusion:** Carapis cannot currently replace MotoScope's specification catalogue. At best, once sources are
activated, it can power a used-vehicle marketplace view.

## 6. Live checks performed without a key (2026-10-31)

| Request (no credentials) | Result |
|---|---|
| `GET https://api.carapis.com/v2/listings?source=cardekho&limit=1` | **404, HTML "Not Found"** (also `/v2/listings/` and `/api/v2/listings`) |
| `GET https://api.carapis.com/apix/api/` | 200 JSON index: `vehicles`, `sources`, `brands`, `models` |
| `GET https://api.carapis.com/apix/api/vehicles/`, `…/vehicles/1/`, `…/sources/` | 401 JSON `{"code":"api_key_required","detail":"A valid API key is required. Pass it via X-API-Key or Authorization: Bearer car_xxx."}` |

So the endpoint documented in Getting started (`/v2/listings`) does not appear to exist, while the platform pages'
`/apix/api/*` endpoints do. Their **query parameters are not documented** (the platform pages give field lists only),
and their list view exposes only `price_usd`, not the original currency. Per our rule of never inventing parameters,
the client still targets the documented `/v2/listings`, and a 404 from it surfaces as `CARAPIS_NOT_FOUND`. The live
error body also differs from the documented `{error:{code,message}}`; the client reads both, for logging only.

## 7. Next steps (need a key)

1. Create a key at my.carapis.com and set `CARAPIS_API_KEY` in `apps/web/.env.local`.
2. Call `GET https://api.carapis.com/apix/api/sources/` once to see which sources the key can use.
3. Ask Carapis which listings endpoint and filter parameters are current (`/v2/listings` vs `/apix/api/vehicles/`).
   Then adapt `client.ts`, `types.ts` and `normalize.ts` (the only files that know the provider's shape) and rerun the mocked tests.
4. Request activation of the Indian sources you need (BikeWale and Cars24 India for two-wheelers; CarDekho and CarWale for cars).
5. Re-test live: `GET /api/v1/vehicles?source=<active slug>&limit=5`, then record the results here.

## 8. Tests

`src/lib/carapis/carapis.test.ts` and `src/lib/vehicles/vehicles-routes.test.ts` are **mocked tests**: `fetch` is
replaced, and Carapis is never contacted. They cover:
- request construction and Bearer auth;
- 400/401/403/404/422/429/500 mapping, with no retries;
- non-JSON and malformed bodies, timeouts and network failures;
- missing key and invalid parameters (no provider call);
- normalisation without fabrication;
- MotoScope's own provider rate limit;
- that the key never appears in responses.

**No live integration test has passed**, because no key is available.
