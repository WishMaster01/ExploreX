ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

ALTER TABLE "trips"
  ADD COLUMN "planHash" TEXT,
  ADD COLUMN "budgetAmount" INTEGER,
  ADD COLUMN "durationDays" INTEGER,
  ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "trips_userId_planHash_key" ON "trips"("userId", "planHash");
CREATE INDEX "trips_userId_isFavorite_createdAt_idx" ON "trips"("userId", "isFavorite", "createdAt" DESC);
CREATE INDEX "trips_userId_budgetAmount_idx" ON "trips"("userId", "budgetAmount");
CREATE INDEX "trips_userId_durationDays_idx" ON "trips"("userId", "durationDays");

CREATE TABLE "reminders" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "remindAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "tripId" TEXT,
  CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reminders_userId_status_remindAt_idx" ON "reminders"("userId", "status", "remindAt");
CREATE INDEX "reminders_tripId_idx" ON "reminders"("tripId");
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "destination" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "analytics_events_type_createdAt_idx" ON "analytics_events"("type", "createdAt");
CREATE INDEX "analytics_events_destination_createdAt_idx" ON "analytics_events"("destination", "createdAt");
CREATE INDEX "analytics_events_userId_createdAt_idx" ON "analytics_events"("userId", "createdAt");
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
