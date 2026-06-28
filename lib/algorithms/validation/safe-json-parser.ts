import type { ZodType } from "zod";

function extractJson(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const objectStart = trimmed.indexOf("{");
  const arrayStart = trimmed.indexOf("[");
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  if (!starts.length) return trimmed;
  const start = Math.min(...starts);
  const expectedEnd = trimmed[start] === "{" ? "}" : "]";
  const end = trimmed.lastIndexOf(expectedEnd);
  return end >= start ? trimmed.slice(start, end + 1) : trimmed;
}

export function safeJsonParse<T>(raw: string, schema: ZodType<T>): { data?: T; error?: string } {
  try {
    const parsed = JSON.parse(extractJson(raw));
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { error: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
    }
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

