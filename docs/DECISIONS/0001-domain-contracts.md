# ADR 0001: Canonical travel domain contracts

- **Status:** Accepted for Phase 1
- **Date:** 2026-10-27

## Context

The trip AI response schema is also the current persistence/API shape, while `lib/domain/types.ts`, `lib/types/trip.ts` and `lib/travel-data/types.ts` provide overlapping aliases and provider structures. Provider methods return `unknown` for route, weather and currency. Existing UI components depend on `TripInfo` and the snake_case payload persisted in `Trip.plan`.

## Decision

Add `lib/domain/travel.ts` as a provider-neutral, Zod-backed domain vocabulary for destinations, experiences, restaurants, hotels, route legs, weather observations, travel guides, discoveries, itinerary activities, monetary estimates and provenance. Money always carries a currency code and unit. Each factual entity has source metadata; a price may have its own separate source because amount provenance can differ from venue identity.

Add `lib/travel-data/ports.ts` with typed provider ports for places, geocoding, routing, weather, accommodation, transport, currency and events. Provider result structures are domain-level values plus provenance, not vendor SDK response objects. Adapters translate vendor responses before returning them. The legacy plan adapter converts known fields without guessing country, currency or source; ambiguous fields stay absent or marked `ZZ`/AI-generated.

Keep current AI/saved-plan DTO schemas and Prisma JSON unchanged. New boundaries are additive; conversion into canonical contracts is available through `legacy-trip-adapter.ts`, while routes/UI continue using existing DTOs until an individual use case migrates. No existing UI components are rewritten.

## Provenance and freshness semantics

- `VERIFIED`: a bounded verification step established only the stated fact. State the fact and scope in `note`; this is not a blanket confidence claim. A provider listing match alone is `PROVIDER_SOURCED`, not `VERIFIED`.
- `PROVIDER_SOURCED`: the provider supplied the data; it does not imply independent verification or correctness.
- `COMMUNITY_SUBMITTED`: contributed by a traveler/community member; moderation and consent are separate concerns.
- `ESTIMATED`: deterministic or human estimate, not a quote/current fact.
- `AI_GENERATED`: model output without an authoritative source.
- `STALE`: data exceeded its known freshness window or was explicitly identified as stale. Preserve provider/retrieval timestamps where known.
- `UNAVAILABLE`: no usable source/result was available; do not fill with invented facts.
- `REJECTED`: a candidate was rejected by validation/moderation/provider matching; retain a reason where appropriate and do not present as a recommendation.

`retrievedAt` is the time the source returned the record; `validUntil` is optional source/application freshness policy, not a guarantee that the fact remains true until then. `confidence` is optional and bounded 0–1; do not interpret as probability unless a provider/model contract defines it. `attribution` records required display attribution. `source` on an entity describes that entity; nested money has its own provenance. Legacy source metadata remains compatible through existing schemas and is not silently converted because its enum has different semantics.

## Boundaries

Presentation consumes UI contracts and canonical domain objects, never vendor payloads. API handlers authenticate, validate transport input and map domain errors to HTTP. Domain services compose use cases and algorithms. Repositories own persistence mapping. Provider adapters handle credentials, HTTP, vendor response validation and translation. AI workflows own prompt construction, model orchestration, output validation and provenance assignment. Background processing remains an application boundary/port; no queue service is introduced until a durable job is required.

## Consequences

- Future providers can be introduced behind typed ports and tested with in-memory fakes.
- Current trip UI, route JSON and old rows remain unchanged.
- Canonical schemas are not yet the sole source of every existing trip field; migration must be gradual and adapters need explicit tests.
- Database persistence of canonical provenance/freshness, event delivery lifecycle, and full API/domain error mapping remain incremental follow-up work. Server env parsing is wired into DB, AI, Places, admin allowlist and cron secret composition while integrations remain optional.

## Validation

`lib/domain/travel.test.ts` covers canonical money, provenance/freshness validation, discovery intervals, independent hotel and price provenance, itinerary activities, and legacy adaptation without inferred country/currency. The follow-up Phase 1 run passed lint, typecheck and Prisma validation. Vitest could not load its config because Windows process creation returned `spawn EPERM`, so neither existing nor new tests executed. The production build compiled but Next's TypeScript worker hit the same environment error.
