# Controlled Agentic Trip Planner

Phase 6 runs inside the existing Next.js/TypeScript application. The planner uses LangGraph JS to coordinate the current Phase 5 PostgreSQL/pgvector retrieval service and provider adapters; a separate Python service is unnecessary for this workflow.

## Graph and state

The graph carries `stateVersion: 1`, the versioned request, authenticated owner ID, run ID, preferences, retrieved evidence, a candidate, deterministic plan, validation results, model-call metrics, failure code, node attempts, step count, trace, and final response. Conversation text remains in request memory only and is not written to `AgentRun` or `AgentTask`.

Normal transitions are:

```text
requestValidation → preferenceExtraction → evidenceRetrieval → candidateGeneration
→ initialPlan → optimization → constraintValidation → explanation → finalResponse → END
```

Each node has an explicit typed input (graph state) and partial-state output and is independently tested. Conditional transitions take invalid requests, provider/model errors, insufficient evidence, and exhausted candidate retries to `finalResponse`. Invalid structured candidate output is retried at most once. A candidate proceeds only when retrieval meets the RAG evidence threshold. A graph step cap (10–12 nodes) and LangGraph recursion limit bound execution; 10 is the minimum to allow the single candidate repair path to finish.

`initialPlan` overlays explicitly extracted user preferences onto the candidate. `optimization` calls the existing deterministic `optimizeTripPlan`; LLM-proposed totals and provenance are discarded. `constraintValidation` checks day count and confirms venue/accommodation names exist in retrieved evidence. Only a passing plan can produce status `ready`.

## API contract

The authenticated `POST /api/aimodel` route keeps the existing conversational response when `isFinal` is false. Final planning requires this strict request shape:

```json
{
  "schemaVersion": "1.0",
  "isFinal": true,
  "messages": [{ "role": "user", "content": "..." }]
}
```

The final response is validated against `agentPlannerResponseSchema` version `1.0`. It includes a status, optional validated `trip_plan`, evidence citations, warnings, missing evidence, validation results, deterministic estimates, and execution metadata (workflow/prompt/provider/model versions, path, graph steps, latency, retries, token usage, and estimated cost). Failure statuses never include a plan. Provider failure and missing evidence are returned honestly; the planner does not fall back to fabricated results.

## Providers and limits

Set `AI_AGENT_PROVIDER=openrouter` or `gemini`. OpenRouter uses `OPENROUTER_API_KEY`; Gemini uses `GEMINI_API_KEY`. `AI_AGENT_MODEL` optionally overrides the provider default. `AI_AGENT_TIMEOUT_MS`, `AI_AGENT_EXECUTION_BUDGET_MS`, `AI_AGENT_MAX_GRAPH_STEPS`, `AI_AGENT_MAX_TOKENS`, and `AI_AGENT_MAX_RETRIES` bound each model call and request. Cost rates are optional; cost is `null` when rates or provider token usage are unavailable. Keep all provider credentials server-side.

Retrieved content and conversation messages are passed as untrusted data, never as policy. The planner exposes no general-purpose tools, shell, SQL, or unrestricted network operations. Retrieval uses the existing allowlisted destination catalog and bounded RAG queries. The route retains authentication and rate limits.

## Persistence and recovery

`AgentRun` stores versions, provider/model, status, timestamps, aggregate latency/retries/tokens/estimated cost, a bounded node path, and a failure code. `AgentTask` stores per-node attempt, status, timing, retry, token/cost, and failure metadata. Neither table stores prompts, chat messages, or retrieved text. The one-shot HTTP request has no pause/resume boundary; durable execution checkpoints are therefore not configured. If the process stops, the run may remain `running`; operations can identify it by its start time. The migration adds these tables.

## Verification and corpus coverage

Node and graph tests use mocked providers and retrieval, including invalid output, transient/provider failure, insufficient evidence, deterministic optimization, constraint rejection, and end-to-end ready responses. The live Phase 5 corpus currently has Jaipur evidence only. Other destinations safely return `insufficient_evidence` until verified records are ingested and the RAG evidence threshold is met.

Apply the migration with `npm run db:deploy` after reviewing the target database, then configure a provider key and run the application. Never put credentials in client code or logs.
