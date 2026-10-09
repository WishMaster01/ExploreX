# ExploreX engineering audit and baseline

**Audit date:** 2026-10-09  
**Scope:** Repository inspection and baseline checks only. No application refactor or behavior changes were made.  
**Status:** Engineering audit, not a production-readiness assessment.

## Executive summary

ExploreX is a Next.js 16 App Router application with React 19 and strict TypeScript. Clerk authenticates users; Prisma persists accounts, trips, hotels, itinerary summaries, reminders, and analytics in PostgreSQL. Server route handlers call OpenRouter through the OpenAI SDK. Most destination discovery and city-guide content is a local curated/static catalog. Core algorithm helpers have one Vitest suite; there are no API, database, auth, or browser tests.

Baseline: typecheck passes; 9 algorithm tests pass; the production build fails in this environment because Google Fonts cannot be reached; lint passes; Prisma validation could not fetch its schema engine in this environment. The code has material correctness and trust-boundary gaps, especially stale AI results, false sharing controls, synthetic hotel/restaurant/cost content, and incomplete reminder delivery.

## 1. Current architecture

- **Web:** `app/` App Router pages and route handlers; Next.js 16.2.9, React 19.1.4, TypeScript 5 with strict mode and bundler resolution. Tailwind 4, Radix, Lucide, Tabler, Motion.
- **Identity:** Clerk provider and middleware in `proxy.ts`. Middleware leaves every `/api` route public at the edge; handlers enforce authentication individually, except the cron endpoint, which uses a bearer secret. Product pages outside the landing and auth routes are middleware-protected.
- **Persistence:** PostgreSQL via Prisma 6.16.2. A singleton Prisma client is in `lib/db.ts`; migrations are committed. No observed queue/cache service or deployment manifest. README describes Next-compatible/Vercel deployment.
- **AI:** `/api/aimodel` and `/api/ai-features` call OpenRouter using `openai/gpt-4.1-mini`; Zod validates trip JSON. Both use process-local bounded queues and retry helpers. Main planner has an in-memory per-process final-response cache. Arcjet is used when configured; a local in-memory limiter is a development fallback.
- **Travel content:** `lib/data/destinations.ts`, `cities.ts`, `travel-signals.ts`, and `ai-features.ts` provide curated/static content. Main generated plan content is model-generated, then algorithmically transformed and supplemented with generated Unsplash image choices and estimates. No connected hotel, restaurant, geocoding, weather, map-tile, or routing APIs were found.
- **Routes/pages:** landing, auth, trip creation, saved trips, city catalog/detail, AI features, travel signals, and admin analytics. APIs cover users, trips, destinations, AI, reminders, due reminders, Arcjet inspection, and admin analytics.
- **Configuration:** `package.json` and npm lockfile; Next and ESLint flat configs; `.env.example` has Clerk, pooled/direct database, OpenRouter, Arcjet, admin allowlist, and cron secret placeholders. `.env` exists locally and is ignored; its contents were not included in this report. No CI or deployment configuration files were found.

## 2. Strengths

- Strict TypeScript, Zod validation, bounded request payloads, and a safe JSON parser are in place.
- Saved trip creation writes trip, hotel summaries, itinerary summaries, and analytics in one Prisma transaction; duplicate detection is backed by a unique index.
- User trip and reminder reads/writes scope queries by the authenticated database user; trip delete uses ownership-scoped `deleteMany`.
- Rate limiting, bounded queues, retries, response cache, security response headers, cascading relations, and useful indexes exist.
- README describes the actual product architecture and explicitly calls route estimates geographic approximations.
- Small algorithm suite passes (9 tests) when worker spawning is permitted.

## 3. Findings by severity

### P0 — Critical

- **No P0 issue confirmed in this static audit.** Runtime abuse, data exposure, and operational failure still need deployment/configuration review before a launch decision.

### P1 — Important

1. **AI conversation history is user-controlled and lacks server-side state validation.** `/api/aimodel` accepts up to 40 user/assistant messages and trusts client-supplied history; system instructions are only provided for each request. The final plan is schema-valid but not fact-verified. A user can inject contradictory directions into history, and the response schema does not assert consistency with requested destination/duration. Add trust framing, server-maintained conversation context or state validation, and clear review labels.
2. **The reminder workflow does not deliver or consume reminders.** `/api/reminders/due` returns up to 100 due rows but does not claim, paginate, mark, or lease them. Repeated cron calls return the same rows; more than 100 overdue rows can starve. No notification transport/scheduler config was found. Define atomic claiming/idempotency and delivery semantics.
3. **Trip sharing UI presents nonfunctional privacy controls.** `SharingPanel` toggles local booleans for “Private trip”, “Invite collaborators”, and “Public showcase card”; no sharing API, access model, or share token exists. Sign-up copy advertises invite collaborators and map routes despite no collaboration or live map provider. Remove or implement before representing these as supported features. No public trip data endpoint was found in inspected routes.
4. **AI error fallback hides provider/schema failures in the chat path.** `/api/aimodel` returns HTTP-success chat text after any non-final failure, so clients cannot distinguish an outage from a valid answer. Analytics are fire-and-forget and omit the authenticated user ID for planner events. Return explicit typed errors and correlate telemetry.
5. **User profile endpoint returns the full Prisma user row.** `/api/users` returns `apiOk(user)`, which includes internal database ID, Clerk ID, role, email, subscription, and timestamps. This is the caller's own profile, not a demonstrated cross-user IDOR, but role and internal identifiers are unnecessary; return an allowlisted DTO. `POST /api/users` also accepts caller fallback email/name/image when Clerk fields are missing; the fallback is avoidable.

### P2 — Improvement

6. **Trip.plan duplicates normalized hotel and itinerary summaries.** `Trip.plan` stores full JSON while `Hotel` stores only name/price/rating and `ItineraryItem` only day/activity-name arrays. There is no single-source-of-truth contract. Current trip list selects only trip columns, so no N+1 is observed there. Decide whether children are queryable domain records or projections; document sync semantics and add reconciliation coverage.
7. **Database types are weak for lifecycle and money.** `role`, `subscription`, reminder `type/status` are free-form strings. Hotel price is text, hotel rating is Float, and trip budget is text plus integer summary without currency. No currency code, timezone policy, or decimal money type is represented. DateTime values use PostgreSQL timestamps without timezone in the migration. Add enums/checks and explicit currency/time semantics as requirements are established.
8. **Indexes are partially redundant and query plans are unverified.** `Trip` has both user/destination and global destination indexes; justify both against observed filters. Case-insensitive substring search is not supported efficiently by ordinary b-tree destination indexes. `AnalyticsEvent` has no retention/partition policy; admin distinct-active-user query fetches all matching IDs and counts them in application memory. Capture query plans/cardinality before changing indexes.
9. **Process-local limits, queues, and caches do not coordinate across instances.** LRU cache and fallback limiter are per process; AI queue limits only one instance. Final response cache is user-scoped but may return results up to 30 minutes old. Arcjet mitigates distributed limits only when configured. Shared infrastructure is warranted only if deployment topology requires it.
10. **AI feature endpoint lacks response schema and timeout.** It accepts bounded user history and sanitizes controls, but returns arbitrary provider text; retry policy has no explicit endpoint timeout. Main AI call likewise relies on SDK defaults. Add output limits and explicit deadlines; test retry behavior.
11. **AI cache behavior is not observable.** Cache hits skip analytics, cache exists only in memory, and freshness/retention are not user-visible. It is keyed by user, avoiding cross-user leakage.
12. **Synthetic data can read as factual recommendations.** City guide costs are curated/demo estimates; AI supplies named hotels, activities, addresses, coordinates, openings, prices, and ratings without provider verification. `trip-transform.ts` picks unrelated Unsplash photos by text and derives comparisons/budget from heuristics; coordinates are not geocoded. Caveats exist but are not adjacent to every claim. Label generated/unverified fields and avoid implying verified availability or hours.
13. **Large client component concentrates planner UI and export logic.** `Itinerary.tsx` is over 1,100 lines and carries display panels, state, print HTML, and client interactions. Planner and AI workspaces are client-rendered. Split along actual interaction/data boundaries after audit.
14. **Accessibility/mobile coverage is unverified.** Custom sharing toggles lack `aria-checked`/switch semantics. No automated accessibility or visual tests. Check focus, keyboard, screen readers, contrast, narrow viewports, loading/error/empty states in browser review.
15. **Generated external image URLs may show unrelated photos.** Transformation filters hosts but maps text to fixed Unsplash pools, so a plausible image can be mistaken for a venue photo. Some itinerary images are `unoptimized`. Prefer approved/local assets or label images illustrative.

### P3 — Polish

16. **Type quality is inconsistent.** Explicit `any` appears in budget/group/duration/empty components, user context/provider, and outside-click hook. Broad assertions appear in AI message normalization, coordinate parsing, and Prisma JSON persistence. Use shared input/output types and narrow unknown values when editing these paths.
17. **Magic/default values and silent parsing need documentation.** Examples include default cost/budget fallbacks in `trip-transform.ts`, fixed image pools, fixed budget activity allocation, and presentation limits. Distinguish intentional heuristic defaults from missing input.
18. **Console output exists in application paths.** AI analytics failures and client fetch errors are logged with `console`; provider logs user creation. Use structured, redacted server logging and remove routine client logs.
19. **Dependency hygiene:** direct `axios` is used by `ChatBox`; `@arcjet/inspect`, `@next/env`, `react-icons`, and `uuid` showed no direct source imports. Verify CLI/transitive ownership and remove only after review. There is no evidence to add dependencies in the audit phase.
20. **README claims should match visible UX.** Cron-ready due reminders are described, but scheduler, delivery, and sharing controls are absent. Avoid advertising unsupported capabilities.

## 4. Security and authorization

- **Authentication:** Clerk middleware protects product pages; API routes are public at middleware and rely on local handler checks. Reviewed user/trip/reminder/admin routes check auth. Due reminders require a bearer secret; missing secret denies. No comparison helper is used for the static bearer comparison.
- **Ownership/IDOR:** trip operations scope by `user.id`; reminder creation checks trip ownership; reminder patch scopes by user; `similarTo` scopes the reference. No cross-user IDOR was confirmed in reviewed handlers. Keep ownership predicates in future detail/share endpoints.
- **Admin:** `role === "admin"` or case-insensitive email/Clerk ID in `ADMIN_USERS`. No admin mutation API was found. Profile endpoint currently exposes caller's own role.
- **Rate limits:** Arcjet limits are user-keyed; public destinations keys by untrusted `x-forwarded-for`, potentially allowing spoofed identities if proxy normalization is absent. In-memory fallback is non-distributed. Verify production Arcjet and trusted proxy headers.
- **Validation:** Zod validates trip JSON/save payload; requests are bounded in several paths. Verify body-size limits at hosting edge, especially AI features. Schema does not validate opening-hour format, day ordering/uniqueness, duration consistency, or venue identity.
- **External URLs:** generated image URLs are filtered in transformation; arbitrary active links were not observed in audited flow. Continue validation at link boundaries.
- **Prompt injection:** user messages can include instructions; schema constrains shape, not truth. No private-data retrieval or tool execution was found. Display AI outputs as unverified.
- **Secrets:** `.env.example` uses placeholders and `.env*` is ignored except example. Do not log or commit local `.env` values. Manage `ADMIN_USERS` and `CRON_SECRET` as production secrets.

## 5. Database audit

| Model            | Fields and relations                                                                                                                                                                | Indexes/notes                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `User`           | Clerk ID, email, name, image, subscription, role, timestamps; owns trips/reminders/events                                                                                           | Unique Clerk ID and email                                                                                               |
| `Trip`           | textual budget/duration/origin/group size, destination, JSON plan, hash, numeric budget/duration projections, favorite/view timestamps; belongs to user; has hotels/items/reminders | user/created, user/favorite/created, user/budget, user/duration, user/destination, global destination, unique user/hash |
| `Hotel`          | name, price string, float rating, amenities array; belongs to trip                                                                                                                  | trip, trip/rating                                                                                                       |
| `ItineraryItem`  | day and activity-name array; belongs to trip                                                                                                                                        | trip/day                                                                                                                |
| `Reminder`       | type/message/due/status; belongs to user and optionally trip                                                                                                                        | user/status/due, trip                                                                                                   |
| `AnalyticsEvent` | type/destination/success/JSON metadata/created; optional user                                                                                                                       | type/date, destination/date, user/date                                                                                  |

Prisma relations cascade trip-owned rows and user-owned reminders/trips; event user is `SetNull`. One migration, `20260628000000_product_intelligence`, adds role, trip projections/hash/favorite/view state, reminders, analytics, and indexes. `Trip.plan` duplicates information partly represented in Hotel/ItineraryItem. Trip plus projections plus analytics use one transaction; user profile upsert is read-then-write with unique-race recovery. Likely expensive query: admin distinct active users reads all matching user IDs; analytics groupBy may grow with event cardinality. No query logging in production. No N+1 observed in saved-trip list, which uses scalar select.

## 6. AI and travel-data audit

- **Model/provider:** hard-coded OpenRouter endpoint and `openai/gpt-4.1-mini`; no provider abstraction/config selection. Model should be versioned in telemetry.
- **Prompt/retries:** static main and specialized prompts; exponential retries with bounded local concurrency. Retry classification covers network/408/409/429/5xx in main planner. No explicit operation timeout or durable queue.
- **Schemas/transforms:** Zod validates chat/final trip structures; safe JSON extraction handles malformed output. `trip-transform.ts` derives display data and uses heuristics. Coordinates are range-checked, not checked against named places.
- **Caching/rate:** main final-response LRU TTL is per-process; Arcjet token bucket when configured; dev sliding-window fallback. AI feature route has no cache.
- **Truth labeling:** destination/search catalog is static curated data; city places/costs and travel signals are editorial estimates; hotels, ratings, openings, addresses, coordinates, and itineraries are AI-generated/unverified. Display restaurant suggestions may be inferred rather than provider-backed. Unsplash pool images are illustrative. Weather, routing, maps, and live prices are not provider-fed.

## 7. Frontend and performance audit

- Most content pages can be statically generated; auth pages and APIs are dynamic. Main interactive surfaces use client components. Planner-wide client boundary is understandable for chat state, though itinerary rendering could be partially server-rendered if data flow changes.
- Performance risks: long client component/bundle, Motion and multiple icon packages, full plan through client state, destination lookups while typing (debounced and server-cached), provider calls, per-process caches, and remote Unsplash images. No bundle analyzer, browser trace, or production query plan was run.
- Rate-limited routes include trips, user profile, reminders, destinations, and AI; admin analytics lacks explicit limiter. No AI streaming found. Loading/error/empty UI exists in several flows, but automated responsive/a11y review is absent.
- No actual map SDK, tile service, road router, or place provider was found. Map panel is a coordinate-derived display, not live navigation.

## 8. Testing coverage and gaps

- `lib/algorithms/algorithms.test.ts`: 9 tests cover Trie/fuzzy search, route ordering, budget selection, hotel ranking, scheduling, sliding-window limiter, LRU TTL, and safe JSON parsing.
- No API handler, Prisma/database integration, authentication/authorization/ownership, AI provider/schema/retry, reminder lifecycle, or E2E/browser tests found.
- Highest-value tests: cross-user trip/reminder ownership; malformed/oversized bodies; admin allowlist/role; AI history and provider failure semantics; duplicate-trip transaction/concurrency; due-reminder replay/claiming; cursor behavior; timezone/money; keyboard/mobile flows.

## 9. Recommended architecture

Keep Next.js App Router + Clerk + PostgreSQL/Prisma + route handlers; current evidence does not justify a rewrite. Make seams explicit: typed API DTOs; domain schemas for trip/reminder lifecycle; one source of truth for plan/projections; provenance for verified versus generated travel data; a provider boundary if a second AI provider is needed; durable/shared rate/cache/queue only when deployment requires them. Use server components for static data and client components for interactions.

## 10. Recommended implementation order

1. **Phase 1 — Trust and product semantics:** label generated/demo data; remove or implement sharing controls; define reminder delivery/claiming; return profile DTO; make AI failures explicit and correlate events.
2. **Phase 2 — Data correctness:** canonical trip representation; money/currency/date-time rules; itinerary consistency; analytics retention and reminder lifecycle constraints.
3. **Phase 3 — Test seams:** API/auth/ownership, AI failure, persistence transaction/deduplication, reminder lifecycle.
4. **Phase 4 — UX/accessibility:** keyboard/screen-reader and mobile review across trip creation, saved trips, itinerary, auth, and reminders.
5. **Phase 5 — Measured operations/performance:** deployment fonts/secrets, distributed rate/cache/queue needs, query plans, bundle, image strategy, and structured logs.

## 11. Dependencies

- **Add:** none justified by repository evidence. Add a provider only for a committed requirement needing verified places/weather/maps or notification delivery, after provider/terms review.
- **Review/remove candidates:** `@arcjet/inspect`, `@next/env`, `react-icons`, and `uuid` have no direct source imports found; verify script/transitive expectations first. `axios` is used in `ChatBox`; replacing it with `fetch` is optional cleanup. Do not change versions in the audit.

## 12. Risks

- Users may act on plausible but unverified AI prices, hours, ratings, addresses, and coordinates.
- Local caches, queues, and fallback limits differ across serverless instances/restarts.
- Reminder consumers can replay rows or starve older reminders.
- UI labels imply unsupported sharing or route capabilities.
- Build depends on Google Fonts access unless fonts are provisioned; Prisma validation depends on downloading the schema engine in this environment.
- Static/code audit only: no live provider, database, deployment, screen reader, or browser test was performed.

## 13. Explicitly out of scope

- Rewriting the app, changing architecture, or adding dependencies.
- Implementing verified travel integrations, payments/bookings, maps/routing, notifications, public sharing, or collaboration.
- Database migrations, production deployment, secret inspection, or destructive changes.
- Claiming production readiness.

## Baseline checks

| Check                     | Result                           | Detail                                                                                                                                                                                                                                                 |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`            | **Pass**                         | `eslint .`, exit 0.                                                                                                                                                                                                                                    |
| `npm run typecheck`       | **Pass**                         | `tsc --noEmit`, exit 0.                                                                                                                                                                                                                                |
| `npm test`                | **Pass after environment retry** | In-sandbox worker spawn failed with `spawn EPERM` and ran zero tests. Elevated run: 1 file, 9 tests passed.                                                                                                                                            |
| Integration tests         | **Not present**                  | No database/API integration test files or scripts found.                                                                                                                                                                                               |
| `npm run build`           | **Fail in this environment**     | Turbopack compiles and generates pages only when Google Fonts are reachable; command failed fetching Inter, Playfair Display, and Plus Jakarta Sans from `fonts.googleapis.com`. Environmental/network dependency; no code compilation error observed. |
| `npm run prisma:validate` | **Blocked by network**           | Prisma failed downloading the Windows schema engine from `binaries.prisma.sh` (`ECONNREFUSED 127.0.0.1:9`); schema validation did not run.                                                                                                             |

**Major issues:** 5 P1 findings. **Next phase:** Phase 1 — trust and product semantics; start with generated-data labeling, nonfunctional sharing controls, reminder contract, profile DTO, and explicit AI error behavior. The project is not assessed as production-ready.
