ALTER TABLE "trips" ADD COLUMN "shareTokenHash" TEXT;
CREATE UNIQUE INDEX "trips_shareTokenHash_key" ON "trips"("shareTokenHash");
