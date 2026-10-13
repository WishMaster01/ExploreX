CREATE TABLE "site_datasets" (
  "key" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "site_datasets_pkey" PRIMARY KEY ("key")
);
