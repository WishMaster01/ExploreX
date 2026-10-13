CREATE TABLE "city_guides" (
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "city_guides_pkey" PRIMARY KEY ("slug")
);

CREATE TABLE "saved_cities" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  CONSTRAINT "saved_cities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "saved_cities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "saved_cities_citySlug_fkey" FOREIGN KEY ("citySlug") REFERENCES "city_guides"("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "city_guides_region_name_idx" ON "city_guides"("region", "name");
CREATE UNIQUE INDEX "saved_cities_userId_citySlug_key" ON "saved_cities"("userId", "citySlug");
CREATE INDEX "saved_cities_userId_createdAt_idx" ON "saved_cities"("userId", "createdAt" DESC);
