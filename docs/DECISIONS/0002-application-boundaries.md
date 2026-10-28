# ADR 0002: Application and provider boundaries

- **Status:** Accepted for Phase 1
- **Date:** 2026-10-27

## Decision

Keep the existing Next.js modular monolith. The intended dependency direction is:

```text
Presentation -> API transport -> application/domain services
                                  -> repositories -> PostgreSQL/Prisma
                                  -> provider ports -> provider adapters
                                  -> AI workflows
                                  -> background-work port (when needed)
```

Domain schemas and algorithms remain independent of network credentials. API route handlers validate request DTOs and auth; service functions accept typed inputs and dependencies; repository interfaces prevent Prisma-generated types from spreading into presentation. Provider-specific HTTP/SDK response types stay inside adapters. AI output is untrusted and must pass a versioned schema before use. Jobs are represented as a boundary only when a use case needs deferred/durable work; there is no microservice or queue dependency in this decision.

## Correlation and errors

API boundaries use a validated `x-request-id` when present or generate a UUID, return it in `x-request-id`, and attach request timing. Domain errors carry stable code and retryability; route adapters map them to safe HTTP responses and logs use the correlation ID without prompts, secrets or full provider payloads.

## Environment configuration

Server environment variables are parsed through a server-only Zod schema at feature composition boundaries. Optional integrations stay optional; each feature checks the required credential when invoked and reports a typed unavailable/configuration error. Do not validate every integration key as globally required at module import, which would make unrelated routes unusable.

## Consequences and remaining migration work

The repository already has much of this shape (`lib/domain`, `lib/travel-data`, `lib/ai`, `lib/observability`, `lib/db`), so this decision standardizes future work instead of introducing packages or services. Phase 1 adds shared error/environment primitives, typed provider ports and a legacy trip adapter. Existing `TravelDataProvider` remains a compatibility adapter but no longer exposes `unknown` result payloads. Environment parsing is used where optional integration credentials/settings enter feature composition. The current Prisma access in route handlers remains debt; move a handler to a repository when that feature is next changed, with owner-scoped integration coverage.

## Validation

Boundary direction is documented in `docs/ARCHITECTURE.md`; canonical port types compile without provider credentials. Lint, typecheck and Prisma validation passed in the current follow-up run. Vitest startup and the Next build's TypeScript-worker startup remain blocked by Windows `spawn EPERM`; tests did not execute and build completion is unverified.
