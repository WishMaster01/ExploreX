import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/rag/retrieve", () => ({ retrieveKnowledge: vi.fn() }));
import type { AgentModelProvider } from "./model-provider";
import { executeAgentPlannerGraph } from "./graph";
import type { AgentPlannerDependencies } from "./nodes";
import { sufficientEvidence, testPlan, testPreferences } from "./test-fixtures";

const request = {
  schemaVersion: "1.0" as const,
  messages: [
    {
      role: "user" as const,
      content:
        "Plan a one day Jaipur trip from Delhi for two people, budget 10000 INR.",
    },
  ],
};

function model(
  overrides: Partial<AgentModelProvider> = {},
): AgentModelProvider {
  return {
    provider: "openrouter",
    model: "mock-model",
    async generateStructured<T>({
      task,
    }: {
      task: string;
      prompt: string;
      schema: import("zod").ZodType<T>;
      signal: AbortSignal;
    }) {
      return {
        value: (task === "extract_trip_preferences"
          ? testPreferences
          : { trip_plan: testPlan }) as T,
        metrics: {
          provider: "openrouter",
          model: "mock-model",
          latencyMs: 2,
          inputTokens: 20,
          outputTokens: 30,
          estimatedCostUsd: 0.0001,
          retries: 0,
        },
      };
    },
    ...overrides,
  };
}

function dependencies(
  agentModel: AgentModelProvider = model(),
  retrieved = sufficientEvidence,
): AgentPlannerDependencies {
  return {
    model: agentModel,
    retrieve: async () => retrieved,
    maxGraphSteps: 12,
    signal: new AbortController().signal,
  };
}

describe("bounded LangGraph trip planner", () => {
  it("runs the complete graph with mocked retrieval and model providers", async () => {
    const response = await executeAgentPlannerGraph({
      request,
      runId: randomUUID(),
      ownerId: null,
      dependencies: dependencies(),
    });
    expect(response.status).toBe("ready");
    expect(response.validation.passed).toBe(true);
    expect(response.trip_plan?.origin).toBe("Delhi");
    expect(response.execution.path).toEqual([
      "request_validation",
      "preference_extraction",
      "evidence_retrieval",
      "candidate_generation",
      "initial_plan",
      "optimization",
      "constraint_validation",
      "explanation",
      "final_response",
    ]);
    expect(response.execution.graphSteps).toBeLessThanOrEqual(12);
    expect(response.evidence).toHaveLength(sufficientEvidence.length);
  });

  it("retries one invalid candidate, then follows the explicit repair edge", async () => {
    let candidateCalls = 0;
    const generateStructured = vi.fn(
      async <T>({
        task,
      }: {
        task: string;
        prompt: string;
        schema: import("zod").ZodType<T>;
        signal: AbortSignal;
      }) => {
        if (task === "extract_trip_preferences")
          return {
            value: testPreferences as T,
            metrics: {
              provider: "openrouter" as const,
              model: "mock-model",
              latencyMs: 1,
              inputTokens: 10,
              outputTokens: 10,
              estimatedCostUsd: null,
              retries: 0,
            },
          };
        candidateCalls += 1;
        if (candidateCalls === 1)
          throw new Error("structured output schema parse failed");
        return {
          value: { trip_plan: testPlan } as T,
          metrics: {
            provider: "openrouter" as const,
            model: "mock-model",
            latencyMs: 1,
            inputTokens: 10,
            outputTokens: 10,
            estimatedCostUsd: null,
            retries: 0,
          },
        };
      },
    ) as AgentModelProvider["generateStructured"];
    const response = await executeAgentPlannerGraph({
      request,
      runId: randomUUID(),
      ownerId: null,
      dependencies: dependencies(model({ generateStructured })),
    });
    expect(candidateCalls).toBe(2);
    expect(response.status).toBe("ready");
    expect(
      response.execution.path.filter((node) => node === "candidate_generation"),
    ).toHaveLength(2);
    expect(response.execution.graphSteps).toBeLessThanOrEqual(12);
  });

  it("abstains before candidate generation when evidence does not cover required facts", async () => {
    let generationCalls = 0;
    const generateStructured: AgentModelProvider["generateStructured"] = async <
      T,
    >() => {
      generationCalls += 1;
      return {
        value: testPreferences as T,
        metrics: {
          provider: "openrouter",
          model: "mock-model",
          latencyMs: 1,
          inputTokens: 10,
          outputTokens: 10,
          estimatedCostUsd: null,
          retries: 0,
        },
      };
    };
    const response = await executeAgentPlannerGraph({
      request,
      runId: randomUUID(),
      ownerId: null,
      dependencies: dependencies(model({ generateStructured }), []),
    });
    expect(response.status).toBe("insufficient_evidence");
    expect(response.trip_plan).toBeUndefined();
    expect(response.missingEvidence.length).toBeGreaterThan(0);
    expect(generationCalls).toBe(1);
  });

  it("returns an honest provider failure without a fabricated plan", async () => {
    const failedModel = model({
      generateStructured: (async () => {
        throw new Error("provider unavailable");
      }) as AgentModelProvider["generateStructured"],
    });
    const response = await executeAgentPlannerGraph({
      request,
      runId: randomUUID(),
      ownerId: null,
      dependencies: dependencies(failedModel),
    });
    expect(response.status).toBe("provider_unavailable");
    expect(response.trip_plan).toBeUndefined();
  });
});
