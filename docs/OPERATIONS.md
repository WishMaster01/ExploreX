# ExploreX operations and scaling

This document describes the current Next.js/Node.js deployment boundary. The application is stateless for correctness; its small local caches and admission queues are performance/resource guards only. They do not coordinate instances or survive a restart.

## Request and work boundaries

| Work | Execution | Reason and limit |
| --- | --- | --- |
| Trip CRUD, sharing, saved places, community submission/moderation, search, weather | Synchronous HTTP | The caller needs an immediate validated result. Provider calls use fixed adapters, bounded timeouts/retries, and the response reports unavailable data honestly. |
| AI chat and itinerary planning | Synchronous HTTP | The UI needs the result before editing the plan. Rate limits, bounded local concurrency, input/token limits, provider timeouts, graph step limits, and execution deadlines cap resource use. Sustained queue rejection or request duration is a signal to split this work into an async API with persisted status. |
| Curated catalog/RAG import and re-index | Operator-run scripts | These are controlled release/maintenance operations and are not user-triggered. They validate input and can be rerun. No durable worker is currently justified. |
| Due reminder discovery | Scheduled platform request | `GET /api/reminders/due` returns at most 100 due rows; it does not send notifications or claim rows. A real notification delivery feature needs an idempotent durable job/outbox before it is enabled. |
| Analytics event writes | Best-effort asynchronous database writes | Request success does not depend on analytics. Failed writes are logged; this is not a durable queue. |

Do not report reminders as delivered: the current endpoint only selects due reminder records. Do not run ingestion in request handlers.

## Health and load balancer probes

- `GET /api/health/live` returns `200` when the Next.js process can serve a request. Configure the platform to restart an instance that fails liveness; do not use it to gate traffic on external APIs.
- `GET /api/health/ready` runs `SELECT 1` using a one-connection probe pool, a 1.5-second PostgreSQL `statement_timeout`, a bounded connection/query timeout, and a two-second response deadline. PostgreSQL cancels a query that exceeds its statement timeout, so timed-out probes do not leave an unbounded query running. It returns `503` on database failure/timeout and never exposes connection details. Use it for load-balancer admission and deployment rollout checks.
- The readiness probe does not call Clerk, Arcjet, Google, Open-Meteo, OpenRouter, or Gemini. Those providers are optional or request-scoped; outages should degrade the affected feature rather than remove every web instance from service.
- Both responses are `no-store`. The readiness probe itself adds a small database query, so configure ordinary probe intervals and avoid aggressive per-second polling across many instances.

## Rate limits, cache, and queues

- Production API rate limiting requires `ARCJET_KEY`. Arcjet is the shared, cross-instance enforcement boundary. Missing configuration fails closed with `503`; the in-memory sliding-window fallback is development-only and must never be treated as distributed protection. Configure Arcjet policies for aggregate expected traffic and review its dashboard for denials and provider/API abuse.
- The LRU/TTL caches currently hold public destination suggestions and curated site datasets. They have bounded entry counts and short TTLs. Cache misses load from the catalog/database; cache loss or stale entries do not change authorization or data ownership. Deployments with multiple instances may see different hit rates and brief staleness until TTL expiry.
- AI plan caching is user-scoped and process-local. Do not move it into a shared cache without preserving the user, model, prompt/schema version and normalized-input dimensions in its key, enforcing data retention rules, and testing cross-user isolation. Never put credentials, private trip records, or raw conversations in shared cache.
- There is no Redis dependency and no BullMQ worker today. No current user operation can be safely detached from its HTTP response without adding a persisted job-status contract. If measured load justifies async ingestion or notifications, add a durable queue with job IDs, unique/idempotency keys, bounded attempts, exponential backoff plus jitter, a dead-letter/recovery procedure, and separate worker deployment. Redis presence alone is not evidence of distributed correctness.
- The in-process AI/travel queues bound work per instance only. Aggregate provider concurrency can be approximately instance count multiplied by each queue's concurrency. Use provider account quotas and platform instance limits accordingly.
- Queue depth events (`queue.depth`) report active and pending counts for AI and travel-data queues. Values are per process; aggregate them across instance logs for fleet estimates, and use queue-full errors as overload signals.

## Database and resource limits

- Set `DATABASE_URL` to the provider's pooled PostgreSQL connection URL in application instances. Set `DIRECT_URL` only for migration/deployment commands that need direct access. Never expose either URL to browser code or logs.
- Size the database pool and provider pooler for the maximum simultaneous web instances and any operator/worker processes. Reserve capacity for migrations and health checks. Monitor active connections, pooler saturation, query latency, timeouts, and database errors before increasing instance count.
- The app uses a single Prisma client per Node.js process. Reuse it for warm requests; do not instantiate clients in handlers. Serverless platforms may create many independent processes, so database pool limits must reflect their maximum concurrency.
- Set platform request deadlines above configured bounded provider execution time but below the platform's hard maximum. Keep the AI agent execution budget, model timeout, retry count and token limit bounded. On cancellation, propagate abort signals to provider fetches and avoid starting additional work.
- Graceful shutdown is provided by the hosting runtime: stop routing new requests, let in-flight bounded requests finish within the platform termination grace period, then terminate. There are no local durable jobs to drain. Do not add custom signal handlers in serverless instances that interfere with Next.js lifecycle.

## Logging, metrics, and traces

- Every API route handler is wrapped by `withRequestMetrics` and emits JSON completion/failure events with request ID, W3C trace ID, route template, status, latency, and safe error code. The proxy generates or validates a UUID request ID and forwards it with trace context. Responses return `x-request-id`, `traceparent`, and (on measured routes) `server-timing`.
- Never log authorization headers, cookies, request bodies, prompts, raw provider responses, database URLs, API keys, precise private trip locations, or private user content. Logs should use route templates, error classes, and aggregate counts.
- Existing AI usage records capture provider/model, prompt version, latency, token counts, estimated cost when pricing is configured, retries and cache-hit state. Missing price configuration means cost is unknown, not zero. Protect admin analytics and keep retention bounded at the database/provider level.
- PostgreSQL query duration is emitted as `database.query` without SQL text or bind values. Use these events with the database provider's connection/pooler metrics; they do not identify individual query shapes.
- Export JSON logs to the deployment's log system and alert on elevated 5xx/504s, provider timeout/quota errors, queue-full responses, Arcjet configuration failure, readiness failures, database saturation, and AI cost/token anomalies. Correlate with `x-request-id`.
- When `OTEL_EXPORTER_OTLP_ENDPOINT` is configured, HTTP spans are exported as OTLP/HTTP JSON to `/v1/traces`; optional `OTEL_EXPORTER_OTLP_TOKEN` is sent as a bearer token. Export has a 750 ms deadline and failures are logged without endpoint/token details. The app defaults to no export when the endpoint is absent. Configure sampling, collector retention, and alerting in the deployment; this app does not provide a metrics backend or a vendor-specific error-tracking account.

## Recovery and release procedure

1. Check `/api/health/live` and `/api/health/ready`, then inspect provider status, database/pooler metrics, Arcjet configuration, and error logs.
2. For database readiness failures, verify pooler availability and connection capacity before restarting all instances. Keep at least one prior application version available during rollout.
3. For provider failures, rely on bounded retry and honest degraded responses; do not replay user requests automatically if they can create writes. Retry only idempotent operations or requests with an enforced idempotency key.
4. Run `npm run db:deploy` as a release step against `DIRECT_URL`; do not run schema migrations independently in every web instance. Take/verify database backups according to the database provider's recovery objectives.
5. Catalog and RAG imports are operator-triggered. Validate the source/manifest first, apply once, then run the database check/evaluation scripts and inspect import reports. Keep the prior data snapshot available for recovery.
6. If a future durable queue is introduced, document replay, poison-job inspection, duplicate suppression, retention and operator recovery before enabling producers.

## Scaling guidance and current limits

Start with multiple stateless web instances behind the platform load balancer only when traffic requires them. Keep session/auth state in Clerk, application data in PostgreSQL, and rate limits in Arcjet. Scale web instances based on request latency, CPU/memory, database pooler saturation and 5xx rate, not cache hit rate alone. Increase provider limits only after confirming aggregate quota and cost budgets.

Current bottlenecks are synchronous AI/provider latency, per-instance concurrency queues, per-instance caches, and PostgreSQL connection capacity. The local queues do not cap fleet-wide provider concurrency; database writes for analytics are best-effort; reminder delivery and automated content freshness jobs are not implemented. There is no Kubernetes, Kafka, Redis, or worker deployment requirement in the current workload. Revisit these choices from measured queue rejection, request deadline, import runtime, database pressure, and notification requirements.
