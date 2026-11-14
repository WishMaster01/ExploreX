import { z } from "zod";

export type DiscoveryDraft = {
  title: string;
  description: string;
  destinationId: string;
  category: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  estimatedCostMinor?: number;
  currencyCode?: string;
  durationMinutes?: number;
  sourceUrl?: string;
  accessRestrictions?: string;
  sensitiveLocation: boolean;
  commercialRelationship?: string;
  consentToPublish: boolean;
};

export function findDuplicate<
  T extends { title: string; destinationId: string; category: string },
>(
  draft: Pick<DiscoveryDraft, "title" | "destinationId" | "category">,
  existing: T[],
) {
  const key = `${draft.destinationId}|${draft.category}|${draft.title}`
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return (
    existing.find(
      (item) =>
        `${item.destinationId}|${item.category}|${item.title}`
          .normalize("NFKC")
          .toLocaleLowerCase("en-IN")
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim() === key,
    ) ?? null
  );
}

export function canEditDiscovery(input: {
  contributorId: string;
  userId: string;
  status: string;
}) {
  return (
    input.contributorId === input.userId &&
    (input.status === "PENDING" || input.status === "CORRECTION_REQUESTED")
  );
}

export function submissionLimitReached(
  recentSubmissionCount: number,
  limit = 5,
) {
  return recentSubmissionCount >= limit;
}

export function publicDiscoveryLocation<
  T extends {
    sensitiveLocation: boolean;
    locationLabel: string | null;
    latitude: number | null;
    longitude: number | null;
  },
>(item: T) {
  return item.sensitiveLocation
    ? { locationLabel: null, latitude: null, longitude: null }
    : {
        locationLabel: item.locationLabel,
        latitude: item.latitude,
        longitude: item.longitude,
      };
}

export function rankDiscovery<
  T extends {
    category: string;
    savedCount: number;
    recommendationCount: number;
    reportedVisitCount: number;
    satisfactionAverage: number | null;
    inaccurateReportCount: number;
    submittedAt: Date | string;
  },
>(item: T, interests: string[] = []) {
  // Transparent bounded signals. A reported visit is not proof of quality;
  // inaccurate-content reports reduce rank and prevent popularity-only ranking.
  const recencyDays = Math.max(
    0,
    (Date.now() - new Date(item.submittedAt).getTime()) / 86_400_000,
  );
  return Math.max(
    0,
    Math.min(item.savedCount, 20) * 0.5 +
      Math.min(item.recommendationCount, 20) * 0.75 +
      Math.min(item.reportedVisitCount, 10) * 0.25 +
      (item.satisfactionAverage ?? 0) * 0.5 -
      Math.min(item.inaccurateReportCount, 10) * 2 -
      Math.min(recencyDays / 90, 2) +
      (interests.includes(item.category.toLocaleLowerCase("en")) ? 2 : 0),
  );
}

export const discoveryDraftSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(20).max(2000),
    destinationId: z.string().trim().min(2).max(100),
    category: z.string().trim().min(2).max(50),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationLabel: z.string().trim().max(180).optional(),
    estimatedCostMinor: z.number().int().min(0).optional(),
    currencyCode: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    durationMinutes: z.number().int().min(1).max(10080).optional(),
    sourceUrl: z.string().url().max(500).optional(),
    accessRestrictions: z.string().trim().max(1000).optional(),
    sensitiveLocation: z.boolean().default(false),
    commercialRelationship: z.string().trim().max(200).optional(),
    consentToPublish: z.literal(true),
  })
  .strict()
  .refine(
    (data) => (data.latitude === undefined) === (data.longitude === undefined),
    {
      message: "Latitude and longitude must be supplied together",
    },
  )
  .refine(
    (data) =>
      data.estimatedCostMinor === undefined || data.currencyCode !== undefined,
    {
      message: "Provide a currency code with an estimated cost",
      path: ["currencyCode"],
    },
  );
