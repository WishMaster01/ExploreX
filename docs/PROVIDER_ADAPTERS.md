# Provider adapters

The normalized provider ports live in `lib/travel-data/ports.ts`; server-only HTTP adapters and their composition live in `lib/travel-data/adapters/`. Components consume ExploreX domain contracts. They do not import provider payload types.

## Current providers and limits

| Capability | Adapter | Credential and policy | Current behavior |
| --- | --- | --- | --- |
| Places | Google Places API (New) Text Search | `GOOGLE_MAPS_API_KEY`; billing and field-mask SKU apply. Only place ID and display name are requested. Results are ephemeral; do not persist the response. | Normalizes to `Place`; no address, rating, hours, price, or availability claims. The legacy trip verifier remains in place until a separate migration is tested. |
| Geocoding | Google Geocoding API | `GOOGLE_MAPS_API_KEY`; request key is sent only from server code. | Returns validated coordinate candidates with retrieval/source metadata; does not store results. |
| Routing | Google Routes API Compute Routes | `GOOGLE_MAPS_API_KEY`; billing and API enablement apply. | Returns provider distance and duration only for supported drive, walk, and transit modes. Unsupported modes return a typed validation error. No straight-line fallback is returned. |
| Weather | Open-Meteo Forecast API | `OPEN_METEO_API_KEY` selects the customer endpoint for production. The public free endpoint is non-commercial and used only outside production. Weather data requires CC BY 4.0 attribution. | Returns a normalized current observation, observation time, retrieval time, and attribution. No forecast is represented as a current observation. |
| Currency | Frankfurter v2 rate endpoint | No key. Blended rates are free for commercial use; source provider terms apply when requesting a provider-specific rate. | Returns a daily reference rate with as-of date. The result is explicitly not a cash, card, or transaction quote. |
| Accommodation | None | No authorized booking/availability integration is configured. | Empty, `UNAVAILABLE` result. No prices or availability are fabricated. |
| Transport inventory | None | No authorized booking/transport inventory integration is configured. | Empty, `UNAVAILABLE` result. Route calculation does not imply seat or fare availability. |
| Events | None | No official event API or licensed event feed is configured. | Empty, `UNAVAILABLE` result. Checked-in catalog event datasets remain empty. |

Google's Places Text Search requires an explicit response field mask; the adapter limits requested fields to ID and display name. Google Routes uses its Compute Routes REST endpoint and a narrow distance/duration field mask. See the [Places Text Search documentation](https://developers.google.com/maps/documentation/places/web-service/text-search), [Routes API documentation](https://developers.google.com/maps/documentation/routes/compute_route_directions), and [Geocoding API documentation](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding).

Open-Meteo's public free API is limited to non-commercial usage; production therefore returns unavailable unless the customer API key is configured. Its data requires CC BY 4.0 attribution. See [Open-Meteo terms](https://open-meteo.com/en/terms) and [pricing and attribution](https://open-meteo.com/en/pricing). Frankfurter documents blended reference rates, data caveats, and commercial use at its [API documentation](https://frankfurter.dev/) and [data license](https://frankfurter.dev/license/).

## Configuration

Provider variables are validated by `lib/env.ts` and read only from server code:

- `TRAVEL_ADAPTER_MODE=auto|mock|disabled`
- `TRAVEL_PLACES_PROVIDER=auto|google_places|disabled`
- `TRAVEL_GEOCODING_PROVIDER=auto|google_geocoding|disabled`
- `TRAVEL_ROUTING_PROVIDER=auto|google_routes|disabled`
- `TRAVEL_WEATHER_PROVIDER=auto|open_meteo|disabled`
- `TRAVEL_CURRENCY_PROVIDER=auto|frankfurter|disabled`
- `GOOGLE_MAPS_API_KEY` for Places, Geocoding, and Routes.
- `OPEN_METEO_API_KEY` for commercial production weather.

`auto` uses the listed adapter when its source and requirements are available; otherwise the capability returns a controlled unavailable result. An explicit `disabled` selection never makes a network request. `mock` is rejected in production and serves only the reviewed checked-in Jaipur name records; unrepresented mock capabilities remain unavailable. It does not synthesize route, weather, currency, booking, transport, or event data.

There is no automatic vendor-to-vendor failover today: no alternate provider has been approved for the same data rights, coverage, and semantics. A provider outage therefore degrades to a typed error or `UNAVAILABLE` result rather than silently switching to a source with different terms or implying unsupported data.

`TRAVEL_DATA_PROVIDER` still selects the older itinerary-verification adapter. It has not been replaced. The new Places adapter must pass mocked tests and then live staging verification before that legacy path is migrated.

## Failure behavior and freshness

External JSON is parsed with Zod before normalization. HTTP 401/403 errors become configuration errors; 429 responses become rate-limit errors; network failures, timeouts, and selected 5xx statuses receive at most one retry. Malformed JSON and schema-invalid payloads are not retried. Error messages do not include provider bodies, request URLs, or credentials.

Every successful provider result has a `retrievedAt`, provider name, and where available a provider record ID. `validUntil` is `null` when the provider gives no contractual freshness boundary. Currency results carry the published rate date; weather results carry the observation time. Provider failures are surfaced as typed errors or explicit `UNAVAILABLE` results; the adapter layer does not manufacture fallback facts.

No provider responses are persisted by these adapters. Review provider terms and enablement before changing that policy or storing new fields. Provider HTTP tests use mocked responses. No live Google credential is currently configured, and live credentials/quotas have not been verified in staging.
