# Performance and production operations

## Current request and data paths

- `GET /api/trips` is owner-scoped, cursor paginated, and selects a compact trip summary. The full validated `Trip.plan` JSON is fetched only for a single-trip detail request. Admin analytics uses database counts/grouping and one SQL aggregate over the most recent 30 days.
- Additive `createdAt` indexes support the admin dashboard's 30-day trip/event scans; user-scoped trip listing keeps its existing compound indexes.
- Trip-planner AI analytics inserts its event and resolves optional Clerk-to-database user attribution in one SQL statement, avoiding a separate lookup round trip.
- The route optimizer map is an embedded map loaded only after the user opens the map view. The homepage Journey Map's interactive client module is deferred until it is within 320px of the viewport. Neither map bundles a client-side mapping SDK; directions are opened externally.
- Hero and hotel images use the Next image optimizer for the configured Unsplash, placeholder, and Clerk hosts. Use the `sizes` attribute on new responsive images so the optimizer can select an appropriate source width.
- Font files are self-hosted by `next/font`; the handwriting face remains because signup and the storytelling banner use it.

## Cache inventory

| Cache | Contents and key | TTL / capacity | Invalidation and privacy |
| --- | --- | --- | --- |
| AI trip candidate (`/api/aimodel`) | Validated candidate and generation metadata; key hashes authenticated user ID, prompt version, model, and normalized conversation | 30 minutes / 100 entries (configurable in `lib/config.ts`) | Expires or is evicted by LRU; prompt version changes create a new key. User ID in the key prevents cross-account reuse. Finalization still performs current travel-data lookup and optimization on a hit. |
| Destination suggestions | Public dataset result; normalized query and result limit | 10 minutes / 100 entries | Expires or LRU eviction; dataset edits may remain stale for at most the TTL. Results contain public destinations only. |
| Site datasets | Curated public dataset contents keyed by dataset name | 5 minutes / 20 entries | Expires or LRU eviction; edits may remain stale for at most the TTL. A process restart clears it. |

These caches live in one Node.js process. They are best-effort performance hints, not persistent state; different instances can independently miss, populate, or expire entries. There is no shared cache invalidation today.

## Queue, rate limit, and multi-instance requirements

AI and travel-provider request queues are bounded and process-local. They protect one worker from excess concurrent work but do not impose a deployment-wide concurrency cap or survive restarts. There is no durable background job queue. AI generation currently returns synchronously, so deploy with provider timeouts, per-instance capacity, and enough web workers for expected traffic. If measured demand needs cross-instance limits or deferred jobs, add a shared Redis-backed concurrency/queue adapter behind the queue boundary; do not treat the current in-memory queue as distributed.

Production rate limiting requires `ARCJET_KEY`; the local sliding-window fallback is development-only and deliberately returns service unavailable in production. Arcjet is the shared production rate-limit boundary. For multi-instance operation, also use a managed PostgreSQL deployment with suitable connection pooling and set provider/API quotas to account for aggregate worker concurrency. No Redis service is currently required or configured.

## Observability and cost

Key API routes log structured `http.request.completed` events with request ID, route, latency, status, and error code. AI logs and persisted analytics include provider/model, feature, AI request ID, latency, retry count, tokens, optional estimated cost, success, and cache-hit state. Places-provider logs include provider, feature, latency, status, result count, and failure type; queue saturation emits a structured failure code. Logs omit prompts, user content, credentials, and database identifiers. AI cost is estimated only when input and output per-million rates are configured; the admin dashboard reports it as not configured when no recorded event has a cost estimate. It is not a provider invoice.

The admin dashboard summarizes the latest 30 days of AI requests, success rate, total tokens, estimated cost, cache hits, and average uncached generation latency, alongside existing trip and destination counts. Analytics persistence is best-effort for generation requests; database failures are logged without failing the user response. Request and query latency logs can be shipped to the deployment's log/metrics backend for percentile and alerting analysis; no external APM service is configured by this repository.

## Baselines and Core Web Vitals

The repository has no production traffic trace, browser lab baseline, or configured Web Vitals collector. Therefore no LCP, INP, CLS, bundle, or end-to-end latency improvement is claimed here. Collect a deployment baseline with representative authenticated trip-list and itinerary flows, and record LCP/INP/CLS by device class before setting budgets. The request logger provides a comparable server-side latency baseline for the instrumented routes. Keep build analyzer output and browser measurements with release records when comparing changes.
