# ExploreX architecture

## Request and persistence flow

Next.js App Router pages and route handlers are the web boundary. Route handlers authenticate with Clerk, validate query/body input with shared Zod schemas, apply rate limits, then call server-only application modules. Prisma is the persistence boundary for PostgreSQL. External AI requests go through the OpenRouter client, bounded queues, timeouts/retries, and response schemas before data reaches the UI or database.

```text
UI / App Router
  -> route handlers and domain validation
  -> application logic and algorithms
  -> server-only services (Prisma, AI, rate limits, cache, logging)
  -> PostgreSQL / OpenRouter / Arcjet
```

`lib/domain` contains shared schemas and ownership predicates. `lib/algorithms` contains pure search, scheduling, ranking, cache, and rate-limit utilities. `lib/observability` contains redacted structured logging and best-effort analytics. `lib/config.ts` owns queue, cache, pagination, and rate-limit defaults. Prisma and authentication modules are marked server-only.

See [performance and production operations](./PERFORMANCE.md) for cache keys/TTLs, request telemetry, admin AI usage metrics, local queue/cache behavior, and multi-instance deployment requirements.

## AI and travel facts

`lib/ai` owns versioned prompts, bounded OpenRouter generation, response validation, deterministic cache keys, and request metrics. The flow is: authenticated user preferences → AI candidate → optional travel-data lookup → deterministic optimization → final strict Zod validation. AI prompts treat conversation and provider content as untrusted data; conversation contents are not written to logs or analytics.

`lib/travel-data` defines provider capabilities and source metadata. `GOOGLE_MAPS_API_KEY` enables bounded Google Places checks for up to three hotels, five restaurant candidates, and five activity candidates. A candidate is marked `VERIFIED` only when the provider returns an exact normalized name match. This verifies the name/listing match only; provider addresses, coordinates, ratings, hours, prices, images, and availability are not used. Only place IDs are retained from Google responses, and Google Maps attribution links are generated from those IDs. Provider errors/timeouts preserve the candidate as `AI_GENERATED`. Without credentials, the unavailable adapter labels all place candidates accordingly. Google Places results are not cached. The travel provider contract supports routing, but no actual route adapter is configured; route optimization therefore reports Haversine straight-line estimates and does not present generated travel times as road/transit times. A caller with route distances and durations can pass them to the optimizer, which distinguishes provider-backed, straight-line, mixed, and unavailable route distances and uses provider durations for hard travel-time caps.

The optimizer retains nearest-neighbor and 2-opt ordering, then applies schedule feasibility checks for stated opening/closing windows, reservations, unavailable periods, per-stop travel caps, and trip date boundaries. Missing/infeasible stops are removed with a short reason. Because the configured Places adapter does not return business hours, candidate hours remain estimates and must be checked. Budget allocation uses trip length, party size, and travel style to split accommodation, food, transport, activities, emergency reserve, and miscellaneous categories. Hotel and restaurant ranking weights are configurable and include concise reasons. Restaurant candidates are separate from attractions and rank on cuisine, dietary needs, meal type, price, rating, distance, and source reliability. A 0–100 quality score aggregates measurable schedule feasibility, route distance per stop, modeled budget fit, preference matches, and schedule density; it is a heuristic, not an AI judgment.

AI analytics store model/provider, prompt version, feature, latency, token counts, optional account-priced cost estimate, retry count, success, request ID, and cache-hit status. They exclude conversation text. Cache keys include the authenticated user, prompt version, model, and normalized conversation, so private trip plans are never shared between users.

## Source of truth

PostgreSQL is authoritative for saved trips, trip days, activities, hotels, reminders, users, and analytics. A trip is saved in one transaction with its relational days, activities, hotels, and analytics event. The `(userId, planHash)` unique constraint prevents duplicate saves. User-owned API operations constrain reads and writes by the authenticated database user; administrator analytics requires server-side role/allowlist authorization.

`Trip.plan` remains JSON to preserve the complete validated AI response and fields without a stable relational query use. Queryable trip/day/activity/hotel facts are separately normalized. Money estimates use optional integer minor units and ISO currency codes where the plan provides a currency; old display strings remain for compatibility and presentation. Unknown-currency estimates are not converted to minor units.

`ItineraryItem` remains as a legacy table/model. New saves populate `TripDay` and `TripActivity`. Restaurant candidates and optional trip dates/time zone are part of the validated JSON plan but do not yet have separate relational models. Expenses and trip preferences also have no dedicated persistence models. Reminder timestamps are UTC instants with the originating IANA time zone stored separately.

## Trust boundaries

- Clerk identity is taken from the authenticated session and Clerk profile, never request-body identity fields.
- API query strings and JSON payloads have schema and size limits. Trip and reminder queries include owner predicates. Admin analytics checks authorization before querying.
- `/api/reminders/due` requires the cron bearer secret. Public destination suggestions use Arcjet's detected source IP in production; the development fallback does not trust forwarded IP headers.
- AI output is treated as untrusted input and strictly validated before persistence. Unmatched hotel/activity candidates and all generated restaurants, prices, hours, budget estimates, and advice are labeled as AI-generated or estimated. Presentation code must escape any content inserted into HTML.
- Production rate limiting requires `ARCJET_KEY`; the local in-memory fallback is development-only and is not distributed across instances. Queues and caches are also process-local.
- Share visibility/revocation is not implemented. Saved trips remain private to their owner.

## Migration operations

Apply committed migrations with `npm run db:deploy` after a verified backup. The persistence-hardening migration preserves `Trip.plan`, backfills normalized itinerary records, adds enum constraints and money/time-zone columns, and converts existing timestamp values by interpreting them as UTC. It aborts on unsupported enum values rather than silently coercing them. Review [the migration requirements in README](../README.md#prisma-schema) before applying it to production.
