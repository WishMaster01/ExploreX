import { z } from "zod";

export const ragSourceSchema = z
  .object({
    id: z.string().trim().min(2).max(160),
    name: z.string().trim().min(2).max(240),
    url: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    owner: z.string().trim().min(2).max(240),
    dataTypes: z.array(z.string().trim().min(1).max(120)).max(40),
    licenseStatus: z.string().trim().min(2).max(120),
    license: z.string().trim().min(3).max(2_000),
    termsUrl: z.string().url().nullable(),
    attribution: z.string().trim().min(3).max(500),
    storagePolicy: z.string().trim().min(3).max(2_000),
    currentUse: z.string().trim().min(2).max(80),
    lastCheckedAt: z.string().date(),
  })
  .strict();

export const ragSourcesRegistrySchema = z
  .object({
    version: z.string().min(1).max(40),
    sources: z.array(ragSourceSchema).max(2_000),
  })
  .strict();

export const knowledgeDocumentInputSchema = z
  .object({
    sourceId: z.string().trim().min(2).max(160),
    sourceDocumentId: z.string().trim().min(2).max(240),
    title: z.string().trim().min(1).max(300),
    content: z.string().trim().min(1).max(20_000),
    destinationId: z.string().trim().min(2).max(160).optional(),
    categoryIds: z.array(z.string().trim().min(1).max(160)).max(40),
    factTypes: z.array(z.string().trim().min(1).max(80)).max(40),
    language: z.string().trim().min(2).max(20),
    verificationStatus: z.enum([
      "VERIFIED",
      "PROVIDER_SOURCED",
      "COMMUNITY_SUBMITTED",
      "ESTIMATED",
      "AI_GENERATED",
      "STALE",
      "UNAVAILABLE",
      "REJECTED",
      "CURATED",
      "NEEDS_REVIEW",
    ]),
    sourceUrl: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    attribution: z.string().trim().min(3).max(500),
    license: z.string().trim().min(3).max(2_000),
    storagePolicy: z.string().trim().min(3).max(2_000),
    lastVerifiedAt: z.string().date().optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
  })
  .strict()
  .superRefine((document, context) => {
    if (
      (document.latitude === undefined) !==
      (document.longitude === undefined)
    )
      context.addIssue({
        code: "custom",
        path: ["longitude"],
        message: "Coordinates must be supplied as a pair",
      });
  });

export const knowledgeSearchSchema = z
  .object({
    query: z.string().trim().min(2).max(1_000),
    destinationId: z.string().trim().min(2).max(160).optional(),
    categoryIds: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
    language: z.string().trim().min(2).max(20).optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    radiusKm: z.number().finite().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(12).default(6),
  })
  .strict()
  .superRefine((query, context) => {
    if ((query.latitude === undefined) !== (query.longitude === undefined))
      context.addIssue({
        code: "custom",
        path: ["longitude"],
        message: "Provide both coordinates",
      });
    if (query.radiusKm !== undefined && query.latitude === undefined)
      context.addIssue({
        code: "custom",
        path: ["radiusKm"],
        message: "A radius requires coordinates",
      });
  });

export type RagSource = z.infer<typeof ragSourceSchema>;
export type ValidKnowledgeDocumentInput = z.infer<
  typeof knowledgeDocumentInputSchema
>;
export type KnowledgeSearchInput = z.infer<typeof knowledgeSearchSchema>;
