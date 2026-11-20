const rawUrl = process.env.TEST_DATABASE_URL;
if (!rawUrl) {
  throw new Error(
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database whose database name contains 'test'.",
  );
}

const testUrl = new URL(rawUrl);
const databaseName = decodeURIComponent(testUrl.pathname.replace(/^\//, ""));
if (!new Set(["postgres:", "postgresql:"]).has(testUrl.protocol)) {
  throw new Error("TEST_DATABASE_URL must use the PostgreSQL protocol.");
}
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error(
    "Refusing integration tests: TEST_DATABASE_URL database name must clearly contain 'test'.",
  );
}
if (
  !new Set(["localhost", "127.0.0.1", "::1", "postgres"]).has(testUrl.hostname)
) {
  throw new Error(
    "Refusing integration tests against remote hosts; use a local disposable PostgreSQL service.",
  );
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run integration tests in production mode.");
}

process.env.DATABASE_URL = rawUrl;
process.env.DIRECT_URL = rawUrl;
