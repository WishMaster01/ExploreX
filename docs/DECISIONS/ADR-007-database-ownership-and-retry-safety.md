# ADR-007: Database ownership and retry safety

- Status: accepted
- Date: 2026-11-07

## Context

ExploreX stores private trips, reminders, and saved-city relations in PostgreSQL. Route handlers already derive the account from the server session and scope trip/reminder writes by owner. However, the old reminder foreign key checked only that `tripId` existed; it did not ensure the reminder owner also owned that trip. Reminder creation also had no key for identifying a retried POST. The application has no persisted expense, review, discovery, or AI-run workflow, and trip sharing is not implemented.

## Decisions

1. Keep the current relational trip/day/activity model and the versioned `Trip.plan` JSON snapshot for backward compatibility. Do not duplicate checked-in destination catalog data into new relational tables without a database-backed use case.
2. Add a unique `(id, userId)` target on trips and a composite `(tripId, userId)` reminder foreign key. Abort the migration if existing records violate the ownership invariant; preserve and investigate those rows rather than silently reassigning or deleting them.
3. Add an optional per-user reminder idempotency key. An identical replay returns the original reminder; key reuse with different request data returns a conflict. Existing clients can omit the header.
4. Keep server-side session identity authoritative. Email-based linking to an existing user requires a verified primary Clerk email.
5. Keep monetary compatibility fields and persisted rows unchanged. Machine calculations use integer minor units plus explicit currency code. Legacy formatted strings and whole-unit compatibility values must not be treated as precise quotes.
6. Make saved-city catalog and user relation writes transactional and rate-limited. Existing unique constraints retain idempotent create/delete behavior.
7. There is no trip-sharing permission or public identifier in the current product. Do not expose private trip reads through a share URL until a revocable visibility/authorization model is explicitly designed.

## Migration and rollback

The migration is additive except that it replaces the reminder-to-trip FK with a stricter composite FK and supporting index. It adds database checks that money minor units are nonnegative and paired with a three-letter uppercase currency code; its preflight aborts if existing rows do not satisfy these semantics. It does not rewrite user content. Back up and restore-test first, run against staging, and resolve the migration preflight before production. Prisma migration history should be advanced with a forward fix; dropping the new column or FK is not a complete rollback strategy. Recovery requirements are documented in `docs/SECURITY-AUDIT.md`.

## Consequences

- Cross-user reminder references are rejected by PostgreSQL even if a future handler omits a check.
- A client can safely retry reminder POST when it supplies a stable key.
- Nullable idempotency keys preserve compatibility with existing callers and stored reminders.
- No schema is added for workflows that do not yet exist, reducing migration and retention burden.
- Database migration behavior, row counts, and restore paths still require staging verification; route tests with mocks are not production-database proof.
