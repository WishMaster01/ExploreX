export type SiteDatasetEntry = { key: string; content: unknown };
export type NamedTravelRecord = { id: string; name?: string; title?: string };

type QueryExecutor = (sql: string, values: unknown[]) => Promise<unknown>;

/** Builds a stable, duplicate-free import plan; reapplying its keys is safe via PostgreSQL upsert. */
export function createTravelDataImportPlan(
  entries: SiteDatasetEntry[],
): SiteDatasetEntry[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.key.trim())
      throw new Error("Dataset import keys must not be empty");
    if (seen.has(entry.key))
      throw new Error(`Duplicate dataset import key: ${entry.key}`);
    seen.add(entry.key);
  }
  return entries.map(({ key, content }) => ({ key, content }));
}

export function findLikelyDuplicateNames(records: NamedTravelRecord[]) {
  const seen = new Set<string>();
  const duplicates: Array<{ id: string; normalizedName: string }> = [];
  for (const record of records) {
    const name = record.name ?? record.title ?? "";
    const normalizedName = name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!normalizedName) continue;
    if (seen.has(normalizedName))
      duplicates.push({ id: record.id, normalizedName });
    seen.add(normalizedName);
  }
  return duplicates;
}

export async function applyTravelDataImportPlan(
  query: QueryExecutor,
  plan: SiteDatasetEntry[],
) {
  const sql = `INSERT INTO "site_datasets" ("key", "content", "updatedAt")
    VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "content" = EXCLUDED."content", "updatedAt" = CURRENT_TIMESTAMP`;
  for (const { key, content } of plan)
    await query(sql, [key, JSON.stringify(content)]);
  return { applied: plan.length };
}
