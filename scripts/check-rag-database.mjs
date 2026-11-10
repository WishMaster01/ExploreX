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
