# ExploreX existing-system repository audit

**Audit date:** 2026-10-27  
**Scope:** Repository inspection, code-level risk review and available local baseline commands. This is not a penetration test, live database migration rehearsal, production configuration review, browser accessibility audit, or runtime load test.  
**Change scope:** Documentation only; no application code or data was changed.

> **Follow-up:** Phase 1 added canonical travel contracts, typed provider ports, a legacy-plan adapter, shared environment parsing at selected feature boundaries, and ADRs. Its changed files and current validation/migration implications are recorded in [DECISIONS/0001](./DECISIONS/0001-domain-contracts.md), [DECISIONS/0002](./DECISIONS/0002-application-boundaries.md), and the Phase 1 status in [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md). This original audit's change-scope statement applies to the Phase 0 audit commit only.

## Summary

ExploreX is an India-relevant but currently global-first travel planner built with Next.js 16 App Router, React 19 and TypeScript. Clerk authenticates the web app; route handlers use Prisma 7/PostgreSQL, OpenRouter produces AI trip candidates, and deterministic TypeScript modules optimize itinerary order, scheduling, modeled costs and ranking. Static destination/city catalogs and optional Open-Meteo/Google Places calls supplement the experience.

The repository has useful protections and mature planning features worth preserving: strict input schemas, route ownership predicates, request limits, private user-scoped plan cache keys, transactionally saved plans, normalized itinerary projections, structured source labeling and route-level regression tests. Its central product limitation is trust: most place facts, coordinates, prices, ratings, opening hours and timing are model-generated and not grounded by a travel inventory. The optional Places path verifies only exact-name listing identity. Route optimization is a straight-line estimate because no route adapter is configured.

No confirmed P0 vulnerability was found in the inspected routes. There are material P1 correctness and claims risks: public diary copy misrepresents curated guides as real database itineraries, generated map/location data can be read as factual, chat failures can be turned into successful fallback text, and reminder due rows are not delivered/claimed. India-first implementation should begin with product scope and India-specific data/currency/time-zone assumptions, after the baseline build/test process is reliable.

## Repository inventory

| Area             | Inspected contents                                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App and routes   | `app/` layouts/pages for landing, auth, trip creation, saved trips/cities, city guide/detail, travel signals, AI features, admin; APIs for trips/users/AI/destinations/weather/city guides/saved cities/stories/site datasets/stats/reminders/admin/Arcjet. |
| Components/state | `app/_components`, `app/create-new-trip/_components`, `components/{travel,ui,magicui}`, `context`, `hooks`.                                                                                                                                                 |
| Services/domain  | `lib/ai`, `lib/travel-data`, `lib/algorithms`, `lib/domain`, `lib/data`, `lib/observability`, DB/auth/rate-limit/trip transformation and API helpers.                                                                                                       |
| Data/migrations  | `prisma/schema.prisma`; five SQL migrations (product intelligence, persistence hardening, city guides/saved cities, site datasets, analytics time indexes); DB seed scripts.                                                                                |
| Tests            | Vitest suites in algorithm and AI modules, plus mocked route security tests for trips, reminders, admin analytics, stories privacy and weather. No Playwright/Cypress config or DB integration fixtures found.                                              |
| Dependencies     | Next 16.2.9, React 19.1.4, TypeScript 5, Prisma/client/adapter 7.10, PostgreSQL `pg`, Clerk 6, OpenAI SDK 5, Arcjet, Zod, Tailwind 4, Radix, Lucide/Tabler, Motion, Axios, Vitest 4, ESLint 9. npm lockfile present.                                        |
| Configuration    | package scripts, TypeScript, ESLint flat config, Next config, Prisma config, `.env.example`, ignored local `.env`; scanned for CI, Docker and deployment manifests without finding them.                                                                    |

`node_modules`, `.next`, and generated Prisma client are present locally. `.env` is ignored; its values were not included in the audit. Earlier audit/security/performance docs exist; claims that conflict with current source are not treated as current facts.

## Baseline command results

Commands were run from the repository root on 2026-10-27. `npm run typecheck` and `npm run build` run Prisma client generation through their pre-scripts.

| Command                   | Result                                   | Evidence / limitation                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`            | **Passed**, exit 0                       | ESLint produced no diagnostics.                                                                                                                                                                                                                              |
| `npm run typecheck`       | **Passed**, exit 0                       | Prisma Client 7.10.0 generated; `tsc --noEmit` produced no diagnostics.                                                                                                                                                                                      |
| `npm run prisma:validate` | **Passed**, exit 0                       | Loaded schema and datasource config; reported schema valid. Does not connect to or validate a live database.                                                                                                                                                 |
| `npm test`                | **Failed before tests loaded**, exit 1   | Vitest/Vite config startup failed at `spawn EPERM` in `optimizeSafeRealPathSync` on Windows. No test count or assertions executed in this run. Likely process-spawn restriction in the execution environment; failure is not a test assertion result.        |
| `npm run build`           | **Partially passed then failed**, exit 1 | Prisma generation succeeded and Next reported “Compiled successfully in 25.5s”; Next then failed starting its TypeScript phase with `Error: spawn EPERM` (`errno -4048`). Independent `npm run typecheck` passed. Production build completion is unverified. |

No `db:deploy`, `db:push`, seed, production server, external provider, authenticated browser, or live PostgreSQL commands were run. No result is claimed for these.

## Current behavior and capabilities

- Public landing page and protected product pages; Clerk sign-in/sign-up and user profile synchronization.
- Landing hero routes to conversational planner; structured preference form captures origin, destination, party, budget/currency, dates, preferences, diet, transport and walking tolerance.
- AI chat and final trip generation; schema-validated trip JSON, user-specific in-process cache, retry/backoff, bounded AI queue and per-user limits.
- Optional Google Places New exact-name checks for bounded hotel/activity/restaurant candidates; Open-Meteo current weather for known city catalog destinations or provided coordinates.
- Deterministic stop reordering (nearest-neighbor/2-opt), Haversine distances, schedule feasibility, duration/party budget allocation, 0/1 activity budget selection and weighted hotel/restaurant ranking.
- Explicit plan save; transaction writes trip JSON, hotel rows, day/activity rows and analytics. Duplicate hash is unique per user. Saved trips provide detail, list filters, pagination, favorites, duplicate, delete, reminders and JSON/image/print export paths.
- Curated city guides and saved-city records; static destination search; AI feature endpoint; due-reminder JSON endpoint; role/allowlist admin analytics.
- Security headers, bounded JSON requests, Zod schemas, structured/redacted logs, request metrics and rate limiting through Arcjet in production configuration.

## Flow and factual limits

The request-to-render/save path is detailed in [ARCHITECTURE.md](./ARCHITECTURE.md). The main factual contract observed in code:

- OpenRouter is the only configured AI provider; model is hard-coded as `openai/gpt-4.1-mini` in `lib/config.ts`.
- A valid schema means output has the expected shape, not that destinations, venue existence, locations, coordinates, prices, ratings, hours, travel times or safety advice are true/current.
- Google Places New is optional. `lib/travel-data/provider.ts` requests only place IDs and display names. `verify-plan.ts` marks an exact normalized name match; provider address, coordinates, ratings, price, hours, image, availability and booking are absent.
- No route provider is configured. `optimizeTripPlan` uses Haversine straight-line distance and a heuristic travel-speed estimate when coordinates exist. Coordinates are range-checked but not geocoded against the place name.
- `trip-transform.ts` assigns fixed Unsplash category images when direct allowed-host images are missing; these can be illustrative but venue-unrelated. It also derives some default ratings, costs, budget tiers, transport and advice for display. These heuristics need explicit presentation labeling.
- `app/api/weather` calls fixed Open-Meteo URL with timeout and output validation. It is a live current observation, not a forecast/trip-date weather service.
- City guides, travel signals and destinations are curated TypeScript arrays with optional DB-seeded copies. `app/api/stories` returns the first three curated cities, while `TravelerDiaries` labels cards “Real itineraries,” “Live Database” or “Server Intel”; source presentation is misleading even though private trip records are not currently returned.

## Security and reliability review

### Authentication, ownership and input

- `proxy.ts` applies Clerk protection to non-public pages but explicitly exempts every `/api(.*)` path. Handlers are therefore the authorization boundary. Reviewed trip, reminder, saved-city, profile and AI user flows check auth; due reminders require `Authorization: Bearer <CRON_SECRET>`.
- Trip GET/PATCH/DELETE/duplicate and similar-trip reference queries use authenticated DB user ownership predicates. Reminder creation checks trip ownership; reminder update scopes by user. Saved city queries are user-scoped. Admin analytics checks admin role/allowlist before data access. No confirmed cross-user IDOR in these reviewed handlers.
- Trip and reminder handlers validate with Zod, reject malformed/duplicate query parameters in several paths, bound text/arrays and cap payloads. Keep this route-local pattern for future endpoints because middleware does not protect APIs.
- User profile endpoint currently emits a Zod-allowlisted DTO (`id`, email, name, image URL, subscription); it does not return Prisma role/Clerk IDs/timestamps.
- AI accepts client-held up-to-40-message history. The history is treated as untrusted in the system prompt and output is schema-validated, but server does not own conversational state or enforce that final destination, duration and constraints match the user request. Injection/manipulation can produce structurally valid but contradictory advice; there is no tool execution or private-data retrieval in this flow.
- External outbound requests reviewed use fixed provider hosts and timeouts. Saved plan images are filtered to approved Unsplash/placeholder hosts; the reviewed print export escapes dynamic HTML. Continue strict URL validation if user-controlled links are introduced.
- Secrets are represented with placeholders in `.env.example`; `.env*` is gitignored except `.env.example`. Verify real deployment settings outside repository scope.

### Findings by priority

#### P0 — Critical

- **No P0 defect confirmed in inspected code.** This does not establish production safety: no live auth/database, deployment configuration, adversarial test, or penetration testing occurred.

#### P1 — Resolve before India-first public claims or scale-up

1. **Factual trust gap in generated itineraries:** AI venue names, addresses, coordinates, hours, prices, ratings, and road/transit times can look precise while unverified. Places lookup verifies at most exact-name/listing identity. Establish field-level provenance, conservative UI labels and generation validation before India-first launch claims.
2. **Curated data shown as community/live records:** `TravelerDiaries` wording and source badges conflict with `/api/stories`, which maps three curated guides. Correct data provenance/copy or implement explicit opt-in publishing and consent before community stories.
3. **Failure semantics for non-final AI chat:** `/api/aimodel` catch path returns an HTTP-success chat-shaped fallback even for provider/schema failure. Client cannot reliably distinguish service failure from a valid turn. Return typed failure codes and render retry states before expanding acquisition.
4. **Reminder delivery lifecycle is incomplete:** due route reads first 100 scheduled rows repeatedly, without atomic claim/lease, pagination, marking, idempotency, notification transport or scheduler manifest. Current feature is stored reminders plus a pull endpoint, not delivery.
5. **India localization/product scope is not yet defined:** catalog is global (many non-India cities); app defaults/copy, payment/inventory, domestic transport, languages, INR amounts, India timezone and domestic traveler requirements are not a complete India product. Agree target traveler, states/cities, INR semantics and reliable data sources before changing defaults/catalog.

#### P2 — Address as core India product features are implemented

6. **No India-aware live inventory or route network:** no booking, hotel inventory, transit/flight provider, geocoding, road/transit route adapter, foreign exchange feed or travel-date weather. Google Maps link/embed is not route data. Choose data contracts/providers and attribution/quotas per feature; keep unavailable states explicit.
7. **Display transformations can invent precision:** generated images, fallback hotel rating `4.5`, “Free” activity cost fallback, default budget tier multipliers, default advice and modeled transport can be mistaken for sourced values. Audit displayed fields and preserve source metadata through transform/export.
8. **Reminder and trip data models do not represent complete trip dates:** `Trip` has duration but no start/end date/timezone; AI schema may carry dates only inside JSON. Currency projections are optional, some values remain strings, and INR minor-unit semantics must be explicit (100 paise per rupee) before conversion/reporting.
9. **JSON plus normalized records need a consistency contract:** `Trip.plan` is read for details while `TripDay`/`TripActivity`/`TripHotel` duplicate queryable portions. Legacy `ItineraryItem` remains. New saves write a subset; provider provenance/source type is flattened to `AI_GENERATED` in child rows. Decide source of truth and preserve migration/backfill semantics.
10. **Geographic query/storage capability is basic:** coordinates are floats, no PostGIS/geography type/index, address normalization or geocoding confidence. Existing destinations are hardcoded coordinate catalog entries, while AI can also supply arbitrary in-range coordinates. Build location verification first; add geospatial infrastructure only if query needs demand it.
11. **Unit test execution is blocked in this environment; no database/browser integration suite:** suite source is present, but this baseline could not start Vitest due to `spawn EPERM`. Current route tests mock boundaries. Need CI/staging checks for actual Prisma transactions, migrations, ownership between accounts, provider failures and browser flows.
12. **Analytics retention/operations are unspecified:** analytics rows are indexed but there is no retention/partition policy, APM integration, alert config or Web Vitals collector. AI analytics is best-effort. Establish privacy retention and operational targets before volume grows.
13. **Process-local infrastructure:** AI/place queues, caches and fallback limits are per process. Arcjet provides production shared limiting when configured; no durable job service or shared application cache exists. Deployment-wide queue/cache work should depend on measured throughput and deployment topology.

#### P3 — Polish and maintainability

14. `ChatBox.tsx`, `CityDetailHUD.tsx`, `UserTrips.tsx` and export code hold broad client responsibilities; `trip-transform.ts` and `trip-optimizer.ts` mix substantial heuristics and presentation/domain logic. Split only when feature work touches them and preserve behavior with tests.
15. Global landing UX mixes India catalog availability with non-India suggested trips/popular destinations. Revisit language, currency display, date entry, accessibility/mobile and local terminology during India UX phase.
16. Build compiles but sandbox prevents spawned TypeScript worker; establish repeatable CI baseline and record Next build/toolchain issue. Lint and independent typecheck pass locally.
17. Earlier audit/quality docs have older, contradictory package/security/test claims. Consolidate or date legacy reports after this audit is accepted so future work does not use stale findings as current behavior.

## Database and migration notes

Current models: `User`, `Trip`, `Reminder`, `AnalyticsEvent`, `CityGuide`, `SavedCity`, `SiteDataset`, `TripHotel` (table `hotels`), legacy `ItineraryItem`, `TripDay`, and `TripActivity`. Enums cover role, reminder type/status and source type. There is no user preference/profile for locale, language, domestic traveler status, home state, or currency preference.

Migration sequence: product intelligence (hash/projections, reminders, events/indexes), persistence hardening (enum conversion, timestamptz conversion, money columns, normalized day/activity tables and JSON backfill), city guides/saved cities, site datasets, analytics time indexes. Before deployment, rehearse all pending migrations against a copy of real data, verify enum values and timestamp assumptions, verify backfill row counts and restore process, and plan locks/downtime. Do not use `db:push` as production migration. The deployed DB state is unknown from repository inspection.

For India-specific storage, do not silently reinterpret historic currency strings or timestamps. Introduce ISO 4217 `INR`, integer paise, source and confidence fields with explicit backfills; retain old strings for compatibility until read/write cutover is measured. Store trip local dates separately from UTC instants and use an IANA destination timezone (`Asia/Kolkata` for India) where event time semantics require it. Timezone should follow destination on trip scheduling, not device/browser location.

## Dependencies and integrations

Runtime integration dependencies are Clerk, PostgreSQL, OpenRouter, optional Arcjet, optional Google Places New and Open-Meteo. No booking/availability, lodging/flight inventory, geocoder, route matrix, currency conversion, notifications, durable queue, Redis, PostGIS, email/SMS, or CI provider is configured in the scanned repository. Do not add these in audit phase; choose based on product requirement, terms, latency, cost, India coverage, attribution and fallback behavior.

## Recommended next phase

Proceed to **Phase 1: India-first product and data foundation**, starting with decisions captured in [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md): target user/launch geography, truth/provenance contract, currency and trip-time semantics, and source/provider evaluation. In that phase, fix misleading provenance and typed AI failure handling, add a runnable CI/test baseline, then implement India catalog/localization without removing global destinations or saved user data. Do not start large app/UI refactor before this scope is agreed and baseline checks run outside the restrictive process-spawn environment.
