import "server-only";
import { randomUUID } from "node:crypto";
import { END, START, StateGraph } from "@langchain/langgraph";
import { getServerEnvironment } from "@/lib/env";
import { retrieveKnowledge } from "@/lib/rag/retrieve";
import { prisma } from "@/lib/db";
import { createAgentModelProvider } from "./model-provider";
import { createPlannerNodes, type AgentPlannerDependencies } from "./nodes";
import { agentPlannerState, type AgentPlannerState } from "./state";
import {
  AGENT_PLANNER_SCHEMA_VERSION,
  AGENT_PLANNER_WORKFLOW_VERSION,
  agentPlannerRequestSchema,
  agentPlannerResponseSchema,
  type AgentPlannerRequest,
  type AgentPlannerResponse,
} from "./schemas";

export class AgentRunPersistenceError extends Error {
  constructor() {
    super("Agent run persistence is unavailable");
    this.name = "AgentRunPersistenceError";
  }
}

function buildGraph(dependencies: AgentPlannerDependencies) {
  const nodes = createPlannerNodes(dependencies);
  const decideFailure = (state: AgentPlannerState, next: string) => {
    if (!state.failureCode) return next;
    if (
      state.failureCode === "invalid_model_output" &&
      state.trace.at(-1) === "candidate_generation" &&
      state.candidateAttempt < 2
    )
      return "candidateGeneration";
    return "finalResponse";
  };
  return new StateGraph(agentPlannerState)
    .addNode("requestValidation", nodes.requestValidation)
    .addNode("preferenceExtraction", nodes.preferenceExtraction)
    .addNode("evidenceRetrieval", nodes.evidenceRetrieval)
    .addNode("candidateGeneration", nodes.candidateGeneration)
    .addNode("initialPlan", nodes.initialPlan)
    .addNode("optimization", nodes.optimization)
    .addNode("constraintValidation", nodes.constraintValidation)
    .addNode("explanation", nodes.explanation)
    .addNode("finalResponse", nodes.finalResponse)
    .addEdge(START, "requestValidation")
    .addConditionalEdges("requestValidation", (state) =>
      decideFailure(state as AgentPlannerState, "preferenceExtraction"),
    )
    .addConditionalEdges("preferenceExtraction", (state) =>
      decideFailure(state as AgentPlannerState, "evidenceRetrieval"),
    )
    .addConditionalEdges("evidenceRetrieval", (state) =>
      decideFailure(state as AgentPlannerState, "candidateGeneration"),
    )
    .addConditionalEdges("candidateGeneration", (state) =>
      decideFailure(state as AgentPlannerState, "initialPlan"),
    )
    .addConditionalEdges("initialPlan", (state) =>
      decideFailure(state as AgentPlannerState, "optimization"),
    )
    .addConditionalEdges("optimization", (state) =>
      decideFailure(state as AgentPlannerState, "constraintValidation"),
    )
    .addConditionalEdges("constraintValidation", (state) =>
      decideFailure(state as AgentPlannerState, "explanation"),
    )
    .addEdge("explanation", "finalResponse")
    .addEdge("finalResponse", END)
    .compile();
}

export async function executeAgentPlannerGraph(input: {
  request: AgentPlannerRequest;
  runId: string;
  ownerId: string | null;
  startedAtMs?: number;
  dependencies: AgentPlannerDependencies;
}): Promise<AgentPlannerResponse> {
  const request = agentPlannerRequestSchema.parse(input.request);
  const startedAtMs = input.startedAtMs ?? Date.now();
  const graph = buildGraph(input.dependencies);
  const safeSteps = Math.max(
    10,
    Math.min(12, input.dependencies.maxGraphSteps),
  );
  const initial = {
    stateVersion: 1,
    request,
    runId: input.runId,
    ownerId: input.ownerId,
    startedAtMs,
    stepCount: 0,
    trace: [],
    taskAttempts: {},
    failureCode: null,
    preferences: undefined,
    evidence: [],
    missingEvidence: [],
    candidateAttempt: 0,
    candidate: undefined,
    plan: undefined,
    validation: { passed: false, errors: [], warnings: [] },
    warnings: [],
    modelCalls: [],
    response: undefined,
  };
  const result = await graph.invoke(initial, {
    recursionLimit: safeSteps + 2,
    signal: input.dependencies.signal,
  } as never);
  return agentPlannerResponseSchema.parse(result.response);
}

/** Stateless request/response graph. No checkpoint is configured because there is no pause or resume step. */
export async function runAgentTripPlanner(
  input: unknown,
  clerkUserId: string,
): Promise<AgentPlannerResponse> {
  const request = agentPlannerRequestSchema.parse(input);
  const environment = getServerEnvironment();
  const runId = randomUUID();
  const startedAtMs = Date.now();
  let localUser: { id: string } | null;
  try {
    localUser = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
  } catch {
    throw new AgentRunPersistenceError();
  }
  const configuredProvider = environment.AI_AGENT_PROVIDER;
  const configuredModel =
    environment.AI_AGENT_MODEL ??
    (configuredProvider === "gemini"
      ? "gemini-2.5-flash"
      : "openai/gpt-4.1-mini");
  try {
    await prisma.agentRun.create({
      data: {
        id: runId,
        requestId: runId,
        schemaVersion: AGENT_PLANNER_SCHEMA_VERSION,
        workflowVersion: AGENT_PLANNER_WORKFLOW_VERSION,
        promptVersion: "india-trip-agent-v1",
        status: "running",
        provider: configuredProvider,
        model: configuredModel,
        userId: localUser?.id,
      },
    });
  } catch {
    throw new AgentRunPersistenceError();
  }

  const controller = new AbortController();
  const deadlineTimer = setTimeout(
    () => controller.abort(),
    environment.AI_AGENT_EXECUTION_BUDGET_MS,
  );
  const timeout = new Promise<never>((_, reject) => {
    const onAbort = () => reject(new Error("AGENT_CANCELLED"));
    controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  const taskAttempts = new Map<string, number>();
  const dependencies: AgentPlannerDependencies = {
    model: createAgentModelProvider(),
    retrieve: async (retrievalInput, ownerId, signal) => {
      if (signal.aborted) throw new Error("AGENT_CANCELLED");
      const result = await retrieveKnowledge(retrievalInput, ownerId, signal);
      return result.evidence;
    },
    maxGraphSteps: environment.AI_AGENT_MAX_GRAPH_STEPS,
    signal: controller.signal,
    recordTask: async (task) => {
      const attempt = taskAttempts.get(task.taskName) ?? 0;
      taskAttempts.set(task.taskName, attempt + 1);
      await prisma.agentTask.create({
        data: {
          runId: task.runId,
          taskName: task.taskName,
          attempt: attempt + 1,
          status: task.status,
          startedAt: new Date(Date.now() - task.latencyMs),
          finishedAt: new Date(),
          latencyMs: task.latencyMs,
          failureCode: task.failureCode,
          retryCount: task.metrics?.retries ?? 0,
          inputTokens: task.metrics?.inputTokens,
          outputTokens: task.metrics?.outputTokens,
          estimatedCostUsd: task.metrics?.estimatedCostUsd,
        },
      });
    },
  };

  try {
    const response = await Promise.race([
      executeAgentPlannerGraph({
        request,
        runId,
        ownerId: localUser?.id ?? null,
        startedAtMs,
        dependencies,
      }),
      timeout,
    ]);
    const status = response.status === "ready" ? "completed" : response.status;
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        latencyMs: response.execution.latencyMs,
        retryCount: response.execution.retryCount,
        inputTokens: response.execution.inputTokens,
        outputTokens: response.execution.outputTokens,
        estimatedCostUsd: response.execution.estimatedCostUsd,
        failureCode:
          response.status === "ready" ? null : response.status.toUpperCase(),
        trace: response.execution.path,
        provider: response.execution.provider ?? configuredProvider,
        model: response.execution.model ?? configuredModel,
      },
    });
    return response;
  } catch (error) {
    const timedOut =
      controller.signal.aborted ||
      (error instanceof Error && error.message === "AGENT_CANCELLED");
    const failureCode = timedOut ? "EXECUTION_LIMIT" : "AGENT_RUN_FAILED";
    await prisma.agentRun
      .update({
        where: { id: runId },
        data: {
          status: timedOut ? "execution_limit" : "provider_unavailable",
          finishedAt: new Date(),
          latencyMs: Math.max(0, Date.now() - startedAtMs),
          failureCode,
        },
      })
      .catch(() => undefined);
    return agentPlannerResponseSchema.parse({
      schemaVersion: AGENT_PLANNER_SCHEMA_VERSION,
      status: timedOut ? "execution_limit" : "provider_unavailable",
      runId,
      evidence: [],
      warnings: [],
      missingEvidence: [],
      validation: { passed: false, errors: [], warnings: [] },
      estimates: null,
      execution: {
        workflowVersion: AGENT_PLANNER_WORKFLOW_VERSION,
        promptVersion: "india-trip-agent-v1",
        path: [],
        provider: configuredProvider,
        model: configuredModel,
        latencyMs: Math.max(0, Date.now() - startedAtMs),
        retryCount: 0,
        inputTokens: null,
        outputTokens: null,
        estimatedCostUsd: null,
        graphSteps: 0,
      },
    });
  } finally {
    clearTimeout(deadlineTimer);
    if (!controller.signal.aborted) controller.abort();
  }
}

export type { AgentPlannerRequest };
