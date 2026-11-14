import "dotenv/config";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const requiredBaselineMigrations = [
  "20260628000000_product_intelligence",
  "20261010000000_persistence_hardening",
  "20261013000000_city_guides_and_saved_cities",
  "20261013000100_site_datasets",
  "20261014000100_analytics_time_indexes",
  "20261106000000_reminder_ownership_idempotency",
];
if (!connectionString) {
  process.stderr.write(
    "DATABASE_URL is not configured; database preflight was not run.\n",
  );
  process.exitCode = 2;
} else {
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 8_000,
  });
  try {
    const result = await pool.query(`
      SELECT current_setting('server_version') AS "serverVersion",
        current_database() AS database,
        EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector') AS "vectorInstalled",
        (SELECT default_version FROM pg_available_extensions WHERE name='vector') AS "vectorAvailableVersion",
        to_regclass('public.users')::text AS "usersTable",
        to_regclass('public.trips')::text AS "tripsTable",
        to_regclass('public._prisma_migrations')::text AS "migrationHistoryTable",
        to_regclass('public.agent_runs')::text AS "agentRunsTable",
        to_regclass('public.agent_tasks')::text AS "agentTasksTable",
        to_regclass('public.community_discoveries')::text AS "communityDiscoveriesTable",
        to_regclass('public.saved_discoveries')::text AS "savedDiscoveriesTable",
        to_regclass('public.discovery_signals')::text AS "discoverySignalsTable",
        to_regclass('public.discovery_feedback')::text AS "discoveryFeedbackTable",
        to_regclass('public.community_trip_feedback')::text AS "communityTripFeedbackTable",
        (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='id') AS "usersIdType"
    `);
    const row = result.rows[0];
    const migrationState = row.migrationHistoryTable
      ? await pool.query(
          `SELECT migration_name, finished_at IS NOT NULL AS applied
           FROM public."_prisma_migrations"
           WHERE migration_name = ANY($1::text[])`,
          [
            [
              ...requiredBaselineMigrations,
              "20261108000000_travel_knowledge_rag",
              "20261110000000_agentic_trip_planner",
              "20261112000000_community_discoveries",
            ],
          ],
        )
      : null;
    const extensionAvailable = Boolean(
      row.vectorInstalled || row.vectorAvailableVersion,
    );
    const migrationHistoryPresent = Boolean(row.migrationHistoryTable);
    const applicationTablesPresent = Boolean(row.usersTable && row.tripsTable);
    const appliedMigrations = new Map(
      (migrationState?.rows ?? []).map((migration) => [
        migration.migration_name,
        migration.applied,
      ]),
    );
    const missingBaselineMigrations = requiredBaselineMigrations.filter(
      (migration) => appliedMigrations.get(migration) !== true,
    );
    const baselineComplete =
      migrationHistoryPresent && missingBaselineMigrations.length === 0;
    const migrationApplied =
      appliedMigrations.get("20261108000000_travel_knowledge_rag") === true;
    const plannerMigrationApplied =
      appliedMigrations.get("20261110000000_agentic_trip_planner") === true;
    const communityMigrationApplied =
      appliedMigrations.get("20261112000000_community_discoveries") === true;
    const knowledgeCounts = await pool.query(`
      SELECT "destinationId" AS destination, count(*)::int AS documents
      FROM public.knowledge_documents
      WHERE "isCurrent" = true AND "isActive" = true AND "visibility" = 'PUBLIC'
      GROUP BY "destinationId" ORDER BY "destinationId"
    `);
    const plannerSchemaReady = Boolean(
      plannerMigrationApplied && row.agentRunsTable && row.agentTasksTable,
    );
    const publicKnowledgeDocumentCount = knowledgeCounts.rows.reduce(
      (total, destination) => total + destination.documents,
      0,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          connected: true,
          serverVersion: row.serverVersion,
          database: row.database,
          vectorInstalled: row.vectorInstalled,
          vectorAvailableVersion: row.vectorAvailableVersion,
          vectorExtensionAvailable: extensionAvailable,
          usersTable: row.usersTable,
          tripsTable: row.tripsTable,
          migrationHistoryTable: row.migrationHistoryTable,
          usersIdType: row.usersIdType,
          migrationHistoryPresent,
          applicationTablesPresent,
          baselineComplete,
          missingBaselineMigrations,
          readyForRagMigration: Boolean(
            extensionAvailable && applicationTablesPresent && baselineComplete,
          ),
          migrationApplied: migrationHistoryPresent ? migrationApplied : null,
          plannerMigrationApplied: migrationHistoryPresent
            ? plannerMigrationApplied
            : null,
          agentRunsTable: row.agentRunsTable,
          agentTasksTable: row.agentTasksTable,
          agentPlannerReady: plannerSchemaReady,
          communityMigrationApplied: migrationHistoryPresent
            ? communityMigrationApplied
            : null,
          communityDiscoveriesTable: row.communityDiscoveriesTable,
          savedDiscoveriesTable: row.savedDiscoveriesTable,
          discoverySignalsTable: row.discoverySignalsTable,
          discoveryFeedbackTable: row.discoveryFeedbackTable,
          communityTripFeedbackTable: row.communityTripFeedbackTable,
          communitySystemReady: Boolean(
            communityMigrationApplied &&
            row.communityDiscoveriesTable &&
            row.savedDiscoveriesTable &&
            row.discoverySignalsTable &&
            row.discoveryFeedbackTable &&
            row.communityTripFeedbackTable,
          ),
          plannerEvidenceReady: false,
          plannerEvidenceNote:
            "Document presence is not evidence sufficiency; the planner requires verified place details and accommodation evidence. Review docs/AGENTIC-TRIP-PLANNER.md and docs/AI-AND-RAG-EVALUATION.md.",
          publicKnowledgeDocumentCount,
          currentPublicKnowledgeDocuments: knowledgeCounts.rows,
          nextStep: !migrationHistoryPresent
            ? "Reconcile existing application schema with the six pre-RAG migrations; do not run migrate deploy until a verified baseline exists."
            : missingBaselineMigrations.length
              ? "Apply or reconcile the listed baseline migrations after reviewing schema drift and backup/restore readiness."
              : migrationApplied
                ? "RAG migration is recorded as applied."
                : !extensionAvailable
                  ? "Enable pgvector on the database before applying the RAG migration."
                  : "Database baseline is complete; apply the RAG migration, then rerun this check.",
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify(
        {
          connected: false,
          errorCode: error?.code ?? "DATABASE_CONNECTION_FAILED",
          message:
            error instanceof Error
              ? error.message.slice(0, 300)
              : "Database preflight failed",
          migrationApplied: false,
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
