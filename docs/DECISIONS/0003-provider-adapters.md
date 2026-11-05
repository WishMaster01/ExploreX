# ADR 0003: Server-side travel provider adapters

- **Status:** Accepted for Phase 3
- **Date:** 2026-11-04

## Decision

Implement provider-neutral adapters behind Phase 1 ports in the existing Next.js modular monolith. Use Google Maps Platform for places, geocoding, and routed distance/duration; Open-Meteo for current weather; and Frankfurter for reference exchange rates. Keep the current legacy Google Places itinerary-verification integration until the new normalized adapter is tested in staging and migration behavior is reviewed.

Accommodation inventory, transport availability, and events remain explicit unavailable capabilities until an authorized provider or official source is selected. Do not substitute AI estimates, route calculations, or local guesses for live availability, fares, or event dates.

## Rationale

The repository already has Google Places and Open-Meteo integration patterns, and Phase 1 defines ports for these capabilities. Google Routes and Geocoding share the configured Maps credential. Frankfurter does not require a credential and describes its output as blended daily reference rates. Open-Meteo's free endpoint is non-commercial, so production requires a customer API key; local non-production may use the free endpoint with attribution.

Adapters validate all external response payloads, return canonical ExploreX domain records, attach provider/retrieval/source metadata, and retry at most once for transient errors. Missing credentials or authorized feeds return unavailable results. Provider responses are not persisted.

## Consequences

- No new runtime dependency is introduced.
- Provider credentials remain server-side and provider-specific payloads stay in adapter modules.
- Google Places and Routes use narrow field masks to constrain returned fields and cost exposure.
- Route distance and duration are returned only when Google Routes returns them; no straight-line fallback is treated as a route.
- The public weather API response remains compatible and now includes normalized observation/provenance fields.
- Local mock mode uses only reviewed Jaipur place-name records and is refused in production.
- The legacy `TravelDataProvider` remains active pending staging verification.

## Validation

Adapter tests mock HTTP responses for normalization, schemas, timeout/retry, quota/auth errors, and unavailable provider composition. Live Google integration remains pending because no Maps key is configured. A production Open-Meteo key is also required to validate the customer endpoint.
