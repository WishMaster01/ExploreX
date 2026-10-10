import { createHash } from "node:crypto";

export function createTripPlanCacheKey(input: {
  userId: string;
  promptVersion: string;
  model: string;
  messages: unknown;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
