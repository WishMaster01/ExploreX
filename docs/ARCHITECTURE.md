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

## Source of truth

PostgreSQL is authoritative for saved trips, trip days, activities, hotels, reminders, users, and analytics. A trip is saved in one transaction with its relational days, activities, hotels, and analytics event. The `(userId, planHash)` unique constraint prevents duplicate saves. User-owned API operations constrain reads and writes by the authenticated database user; administrator analytics requires server-side role/allowlist authorization.

`Trip.plan` remains JSON to preserve the complete validated AI response and fields without a stable relational query use. Queryable trip/day/activity/hotel facts are separately normalized. Money estimates use optional integer minor units and ISO currency codes where the plan provides a currency; old display strings remain for compatibility and presentation. Unknown-currency estimates are not converted to minor units.

`ItineraryItem` remains as a legacy table/model. New saves populate `TripDay` and `TripActivity`. Restaurants, expenses, trip preferences, and trip calendar dates do not currently have persisted domain models because the current generated-plan contract does not expose stable records for them. Reminder timestamps are UTC instants with the originating IANA time zone stored separately. The current trip model has no destination time zone because it has no calendar dates to interpret.

## Trust boundaries

- Clerk identity is taken from the authenticated session and Clerk profile, never request-body identity fields.
- API query strings and JSON payloads have schema and size limits. Trip and reminder queries include owner predicates. Admin analytics checks authorization before querying.
- `/api/reminders/due` requires the cron bearer secret. Public destination suggestions use Arcjet's detected source IP in production; the development fallback does not trust forwarded IP headers.
- AI output is treated as untrusted input and validated before persistence. Presentation code must escape any content inserted into HTML; generated addresses, prices, hours, and recommendations are not verified live provider data.
- Production rate limiting requires `ARCJET_KEY`; the local in-memory fallback is development-only and is not distributed across instances. Queues and caches are also process-local.
- Share visibility/revocation is not implemented. Saved trips remain private to their owner.

## Migration operations

Apply committed migrations with `npm run db:deploy` after a verified backup. The persistence-hardening migration preserves `Trip.plan`, backfills normalized itinerary records, adds enum constraints and money/time-zone columns, and converts existing timestamp values by interpreting them as UTC. It aborts on unsupported enum values rather than silently coercing them. Review [the migration requirements in README](../README.md#prisma-schema) before applying it to production.
