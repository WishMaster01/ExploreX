DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "role" NOT IN ('user', 'admin')) THEN
    RAISE EXCEPTION 'Cannot migrate users.role: unrecognized value exists';
  END IF;
  IF EXISTS (SELECT 1 FROM "reminders" WHERE "type" NOT IN ('trip', 'packing', 'booking')) THEN
    RAISE EXCEPTION 'Cannot migrate reminders.type: unrecognized value exists';
  END IF;
  IF EXISTS (SELECT 1 FROM "reminders" WHERE "status" NOT IN ('scheduled', 'cancelled', 'completed')) THEN
    RAISE EXCEPTION 'Cannot migrate reminders.status: unrecognized value exists';
  END IF;
END $$;

CREATE TYPE "user_role" AS ENUM ('user', 'admin');
CREATE TYPE "reminder_type" AS ENUM ('trip', 'packing', 'booking');
CREATE TYPE "reminder_status" AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE "source_type" AS ENUM ('AI_GENERATED', 'PROVIDER', 'CURATED');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING "role"::"user_role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';

ALTER TABLE "reminders" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "reminders" ALTER COLUMN "type" TYPE "reminder_type" USING "type"::"reminder_type";
ALTER TABLE "reminders" ALTER COLUMN "type" SET DEFAULT 'trip';
ALTER TABLE "reminders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reminders" ALTER COLUMN "status" TYPE "reminder_status" USING "status"::"reminder_status";
ALTER TABLE "reminders" ALTER COLUMN "status" SET DEFAULT 'scheduled';
ALTER TABLE "reminders" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';

-- Existing Prisma DateTime values were serialized as UTC instants into timestamp
-- without time zone. Interpret those stored values as UTC during conversion.
ALTER TABLE "users"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "trips"
  ALTER COLUMN "lastViewedAt" TYPE TIMESTAMPTZ(3) USING "lastViewedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "reminders"
  ALTER COLUMN "remindAt" TYPE TIMESTAMPTZ(3) USING "remindAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "analytics_events"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "trips"
  ADD COLUMN "budgetAmountMinor" INTEGER,
  ADD COLUMN "budgetCurrencyCode" TEXT;

ALTER TABLE "hotels"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "itinerary_items"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "hotels"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "priceAmountMinor" INTEGER,
  ADD COLUMN "currencyCode" TEXT,
  ADD COLUMN "recommendationScore" DOUBLE PRECISION,
  ADD COLUMN "sourceType" "source_type" NOT NULL DEFAULT 'AI_GENERATED';

CREATE INDEX "reminders_status_remindAt_id_idx" ON "reminders"("status", "remindAt", "id");

-- Trip lookups are owner-scoped, and the hotel tripId index already covers its prefix.
DROP INDEX IF EXISTS "trips_destination_idx";
DROP INDEX IF EXISTS "hotels_tripId_rating_idx";

CREATE TABLE "trip_days" (
  "id" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "bestTime" TEXT,
  "tripId" TEXT NOT NULL,
  CONSTRAINT "trip_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trip_days_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "trip_days_tripId_dayNumber_key" ON "trip_days"("tripId", "dayNumber");

CREATE TABLE "trip_activities" (
  "id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "placeName" TEXT,
  "details" TEXT,
  "imageUrl" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "address" TEXT,
  "ticketPricing" TEXT,
  "estimatedCostMinor" INTEGER,
  "currencyCode" TEXT,
  "travelTime" TEXT,
  "bestTime" TEXT,
  "openingTime" TEXT,
  "closingTime" TEXT,
  "visitDurationMinutes" INTEGER,
  "scheduledStart" TEXT,
  "scheduledEnd" TEXT,
  "distanceFromPreviousKm" DOUBLE PRECISION,
  "sourceType" "source_type" NOT NULL DEFAULT 'AI_GENERATED',
  "dayId" TEXT NOT NULL,
  CONSTRAINT "trip_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trip_activities_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "trip_days"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "trip_activities_dayId_position_key" ON "trip_activities"("dayId", "position");

-- Backfill from the persisted plan without deleting or rewriting the source JSON.
WITH day_source AS (
  SELECT t."id" AS "tripId", d.value, d.ordinality,
         d.ordinality::integer AS "dayNumber"
  FROM "trips" AS t
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(t."plan"->'itinerary') = 'array' THEN t."plan"->'itinerary' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS d(value, ordinality)
)
INSERT INTO "trip_days" ("id", "dayNumber", "title", "bestTime", "tripId")
SELECT md5("tripId" || ':' || ordinality::text), "dayNumber",
       COALESCE(value->>'day_plan', 'Trip day'),
       NULLIF(value->>'best_time_to_visit_day', ''), "tripId"
FROM day_source;

WITH day_source AS (
  SELECT t."id" AS "tripId", d.value, d.ordinality,
         d.ordinality::integer AS "dayNumber"
  FROM "trips" AS t
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(t."plan"->'itinerary') = 'array' THEN t."plan"->'itinerary' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS d(value, ordinality)
), activity_source AS (
  SELECT md5(d."tripId" || ':' || d.ordinality::text) AS "dayId",
         a.value, a.ordinality
  FROM day_source AS d
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(d.value->'activities') = 'array' THEN d.value->'activities' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS a(value, ordinality)
)
INSERT INTO "trip_activities" (
  "id", "position", "placeName", "details", "imageUrl", "latitude", "longitude",
  "address", "ticketPricing", "travelTime", "bestTime", "openingTime", "closingTime",
  "visitDurationMinutes", "scheduledStart", "scheduledEnd", "distanceFromPreviousKm", "dayId"
)
SELECT md5("dayId" || ':' || (ordinality - 1)::text),
       (ordinality - 1)::integer,
       value->>'place_name',
       value->>'place_details',
       NULLIF(value->>'place_image_url', ''),
       CASE WHEN value->'geo_coordinates'->>'latitude' ~ '^-?[0-9]{1,3}(\.[0-9]{1,12})?$'
                  AND (value->'geo_coordinates'->>'latitude')::numeric BETWEEN -90 AND 90
            THEN (value->'geo_coordinates'->>'latitude')::double precision END,
       CASE WHEN value->'geo_coordinates'->>'longitude' ~ '^-?[0-9]{1,3}(\.[0-9]{1,12})?$'
                  AND (value->'geo_coordinates'->>'longitude')::numeric BETWEEN -180 AND 180
            THEN (value->'geo_coordinates'->>'longitude')::double precision END,
       value->>'place_address',
       NULLIF(value->>'ticket_pricing', ''),
       NULLIF(value->>'time_travel_each_location', ''),
       NULLIF(value->>'best_time_to_visit', ''),
       NULLIF(value->>'opening_time', ''),
       NULLIF(value->>'closing_time', ''),
       CASE WHEN value->>'visit_duration_minutes' ~ '^[0-9]{1,3}$'
                  AND (value->>'visit_duration_minutes')::integer BETWEEN 15 AND 720
            THEN (value->>'visit_duration_minutes')::integer END,
       NULLIF(value->>'scheduled_start', ''),
       NULLIF(value->>'scheduled_end', ''),
       CASE WHEN value->>'distance_from_previous_km' ~ '^[0-9]{1,7}(\.[0-9]{1,6})?$'
                  AND (value->>'distance_from_previous_km')::numeric <= 1000000
            THEN (value->>'distance_from_previous_km')::double precision END,
       "dayId"
FROM activity_source;

