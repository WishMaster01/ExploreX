CREATE TABLE "agent_runs" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "workflowVersion" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMPTZ(3),
  "latencyMs" INTEGER,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "estimatedCostUsd" DOUBLE PRECISION,
  "failureCode" TEXT,
  "trace" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "userId" TEXT,
  CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "agent_runs_latency_nonnegative_check" CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0),
  CONSTRAINT "agent_runs_retry_nonnegative_check" CHECK ("retryCount" >= 0),
  CONSTRAINT "agent_runs_tokens_nonnegative_check" CHECK (("inputTokens" IS NULL OR "inputTokens" >= 0) AND ("outputTokens" IS NULL OR "outputTokens" >= 0)),
  CONSTRAINT "agent_runs_cost_nonnegative_check" CHECK ("estimatedCostUsd" IS NULL OR "estimatedCostUsd" >= 0)
);
CREATE UNIQUE INDEX "agent_runs_requestId_key" ON "agent_runs"("requestId");
CREATE INDEX "agent_runs_userId_startedAt_idx" ON "agent_runs"("userId", "startedAt" DESC);
CREATE INDEX "agent_runs_status_startedAt_idx" ON "agent_runs"("status", "startedAt" DESC);

CREATE TABLE "agent_tasks" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "taskName" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMPTZ(3),
  "latencyMs" INTEGER,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "estimatedCostUsd" DOUBLE PRECISION,
  "failureCode" TEXT,
  CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_tasks_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_tasks_attempt_positive_check" CHECK ("attempt" > 0),
  CONSTRAINT "agent_tasks_latency_nonnegative_check" CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0),
  CONSTRAINT "agent_tasks_retry_nonnegative_check" CHECK ("retryCount" >= 0),
  CONSTRAINT "agent_tasks_tokens_nonnegative_check" CHECK (("inputTokens" IS NULL OR "inputTokens" >= 0) AND ("outputTokens" IS NULL OR "outputTokens" >= 0)),
  CONSTRAINT "agent_tasks_cost_nonnegative_check" CHECK ("estimatedCostUsd" IS NULL OR "estimatedCostUsd" >= 0)
);
CREATE UNIQUE INDEX "agent_tasks_runId_taskName_attempt_key" ON "agent_tasks"("runId", "taskName", "attempt");
CREATE INDEX "agent_tasks_runId_startedAt_idx" ON "agent_tasks"("runId", "startedAt");
