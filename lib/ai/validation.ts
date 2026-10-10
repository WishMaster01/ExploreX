import type { ZodType } from "zod";
import { MalformedAiOutputError } from "./errors";

export function parseAiOutput<T>(
  raw: string,
  schema: ZodType<T>,
  jsonMode: boolean,
): T {
  let candidate: unknown = raw;
  if (jsonMode) {
    try {
      candidate = JSON.parse(raw) as unknown;
    } catch {
      throw new MalformedAiOutputError();
    }
  }
  const parsed = schema.safeParse(candidate);
  if (!parsed.success) throw new MalformedAiOutputError();
  return parsed.data;
}
