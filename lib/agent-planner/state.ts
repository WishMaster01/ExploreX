import { Annotation } from "@langchain/langgraph";
import type {
  AgentPlannerRequest,
  AgentPlannerResponse,
  ExtractedPreferences,
  PlannerEvidence,
} from "./schemas";
import type { AgentModelMetrics } from "./model-provider";
import type { ValidTripInfo } from "@/lib/domain/schemas";

export type PlannerValidation = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

export const agentPlannerState = Annotation.Root({
  stateVersion: Annotation<number>(),
  request: Annotation<AgentPlannerRequest>(),
  runId: Annotation<string>(),
  ownerId: Annotation<string | null>(),
  startedAtMs: Annotation<number>(),
  stepCount: Annotation<number>(),
  trace: Annotation<string[]>(),
  taskAttempts: Annotation<Record<string, number>>(),
  failureCode: Annotation<string | null>(),
  preferences: Annotation<ExtractedPreferences | undefined>(),
  evidence: Annotation<PlannerEvidence[]>(),
  missingEvidence: Annotation<string[]>(),
  candidateAttempt: Annotation<number>(),
  candidate: Annotation<ValidTripInfo | undefined>(),
  plan: Annotation<ValidTripInfo | undefined>(),
  validation: Annotation<PlannerValidation>(),
  warnings: Annotation<string[]>(),
  modelCalls: Annotation<AgentModelMetrics[]>(),
  response: Annotation<AgentPlannerResponse | undefined>(),
});

export type AgentPlannerState = typeof agentPlannerState.State;
