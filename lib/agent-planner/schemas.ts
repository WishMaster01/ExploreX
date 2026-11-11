import { z } from "zod";
import { chatHistorySchema, tripInfoSchema } from "@/lib/ai-schemas";

export const AGENT_PLANNER_SCHEMA_VERSION = "1.0" as const;
export const AGENT_PLANNER_WORKFLOW_VERSION = "trip-planner-1.0.0" as const;
export const AGENT_PLANNER_PROMPT_VERSION = "india-trip-agent-v1" as const;

export const agentPlannerRequestSchema = z
  .object({
    schemaVersion: z.literal(AGENT_PLANNER_SCHEMA_VERSION),
    messages: chatHistorySchema.max(40),
  })
  .strict();

export const extractedPreferencesSchema = z
  .object({
    origin: z.string().trim().min(1).max(160),
    destination: z.string().trim().min(1).max(160),
    group_size: z.string().trim().min(1).max(80),
    budget: z.string().trim().min(1).max(80),
    duration: z.string().trim().min(1).max(80),
    interests: z.array(z.string().trim().min(1).max(80)).max(20),
    requirements: z.array(z.string().trim().min(1).max(200)).max(20),
    currency_code: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    travel_style: z.string().trim().max(80).optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    food_preferences: z.string().trim().max(160).optional(),
    walking_tolerance: z.enum(["low", "moderate", "high"]).optional(),
  })
  .strict()
  .refine(
    (value) =>
      (!value.start_date && !value.end_date) ||
      (Boolean(value.start_date) &&
        Boolean(value.end_date) &&
        value.end_date! >= value.start_date!),
    { path: ["end_date"], message: "Provide a valid start and end date pair" },
  );

export const plannerEvidenceSchema = z
  .object({
    documentId: z.string().min(1),
    id: z.string().min(1),
    chunkId: z.string().min(1),
    sourceDocumentId: z.string().min(1),
    contentHash: z.string().min(1),
    version: z.number().int().positive(),
    title: z.string().min(1).max(300),
    content: z.string().max(20_000),
    destinationId: z.string().nullable(),
    categoryIds: z.array(z.string()).max(40),
    factTypes: z.array(z.string()).max(40),
    verificationStatus: z.string().min(1),
    sourceUrl: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    attribution: z.string().max(500),
    license: z.string().max(2_000),
    storagePolicy: z.string().max(2_000),
    lastVerifiedAt: z.string().date().nullable(),
    sourceId: z.string().min(1),
    sourceName: z.string().min(1),
    score: z.number().finite(),
    retrievalMethods: z.array(z.string()),
    retrievedAt: z.string().datetime(),
  })
  .strict();

export const plannerValidationSchema = z
  .object({
    passed: z.boolean(),
    errors: z.array(z.string().max(240)).max(20),
    warnings: z.array(z.string().max(240)).max(20),
  })
  .strict();

export const agentPlannerResponseSchema = z
  .object({
    schemaVersion: z.literal(AGENT_PLANNER_SCHEMA_VERSION),
    status: z.enum([
      "ready",
      "insufficient_evidence",
      "invalid_request",
      "invalid_model_output",
      "unsatisfied_constraints",
      "provider_unavailable",
      "execution_limit",
    ]),
    runId: z.string().uuid(),
    trip_plan: tripInfoSchema.optional(),
    evidence: z.array(plannerEvidenceSchema).max(12),
    warnings: z.array(z.string().max(240)).max(20),
    missingEvidence: z.array(z.string().max(240)).max(20),
    validation: plannerValidationSchema,
    estimates: z
      .object({
        currencyCode: z
          .string()
          .regex(/^[A-Z]{3}$/)
          .nullable(),
        activityBudgetCost: z.number().nonnegative().nullable(),
        note: z.string().max(300),
      })
      .strict()
      .nullable(),
    execution: z
      .object({
        workflowVersion: z.literal(AGENT_PLANNER_WORKFLOW_VERSION),
        promptVersion: z.literal(AGENT_PLANNER_PROMPT_VERSION),
        path: z.array(z.string().max(80)).max(12),
        provider: z.string().max(80).nullable(),
        model: z.string().max(120).nullable(),
        latencyMs: z.number().int().nonnegative(),
        retryCount: z.number().int().nonnegative(),
        inputTokens: z.number().int().nonnegative().nullable(),
        outputTokens: z.number().int().nonnegative().nullable(),
        estimatedCostUsd: z.number().nonnegative().nullable(),
        graphSteps: z.number().int().nonnegative().max(12),
      })
      .strict(),
  })
  .strict()
  .superRefine((response, context) => {
    if (
      response.status === "ready" &&
      (!response.trip_plan || !response.validation.passed)
    )
      context.addIssue({
        code: "custom",
        path: ["trip_plan"],
        message: "Ready responses require a validated plan",
      });
    if (response.status !== "ready" && response.trip_plan)
      context.addIssue({
        code: "custom",
        path: ["trip_plan"],
        message: "Failed and abstention responses cannot include a plan",
      });
  });

export type AgentPlannerRequest = z.infer<typeof agentPlannerRequestSchema>;
export type ExtractedPreferences = z.infer<typeof extractedPreferencesSchema>;
export type PlannerEvidence = z.infer<typeof plannerEvidenceSchema>;
export type AgentPlannerResponse = z.infer<typeof agentPlannerResponseSchema>;
