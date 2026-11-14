CREATE TYPE "DiscoveryModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'REMOVED');
CREATE TYPE "DiscoverySignalType" AS ENUM ('REPORT', 'CORRECTION_REQUEST', 'RECOMMENDATION', 'VISIT_REPORTED');

CREATE TABLE "community_discoveries" (
  "id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "destinationId" VARCHAR(100) NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "locationLabel" VARCHAR(180),
  "estimatedCostMinor" INTEGER,
  "currencyCode" VARCHAR(3),
  "durationMinutes" INTEGER,
  "sourceUrl" VARCHAR(500),
  "accessRestrictions" VARCHAR(1000),
  "sensitiveLocation" BOOLEAN NOT NULL DEFAULT false,
  "sourceCorroborated" BOOLEAN NOT NULL DEFAULT false,
  "commercialRelationship" VARCHAR(200),
  "consentToPublish" BOOLEAN NOT NULL DEFAULT false,
  "moderationStatus" "DiscoveryModerationStatus" NOT NULL DEFAULT 'PENDING',
  "moderatorNote" VARCHAR(1000),
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "moderatedAt" TIMESTAMPTZ(3),
  "contributorId" TEXT NOT NULL,
  "moderatorId" TEXT,
  CONSTRAINT "community_discoveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_discoveries_coordinates_check" CHECK (("latitude" IS NULL AND "longitude" IS NULL) OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)),
  CONSTRAINT "community_discoveries_cost_check" CHECK ("estimatedCostMinor" IS NULL OR "estimatedCostMinor" >= 0),
  CONSTRAINT "community_discoveries_duration_check" CHECK ("durationMinutes" IS NULL OR "durationMinutes" BETWEEN 1 AND 10080),
  CONSTRAINT "community_discoveries_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_discoveries_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "community_discoveries_moderationStatus_destinationId_category_idx" ON "community_discoveries"("moderationStatus", "destinationId", "category");
CREATE INDEX "community_discoveries_contributorId_submittedAt_idx" ON "community_discoveries"("contributorId", "submittedAt" DESC);

CREATE TABLE "discovery_signals" (
  "id" TEXT NOT NULL,
  "type" "DiscoverySignalType" NOT NULL,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "discoveryId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "discovery_signals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "discovery_signals_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "community_discoveries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "discovery_signals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "discovery_signals_discoveryId_userId_type_key" ON "discovery_signals"("discoveryId", "userId", "type");
CREATE INDEX "discovery_signals_discoveryId_type_createdAt_idx" ON "discovery_signals"("discoveryId", "type", "createdAt");

CREATE TABLE "saved_discoveries" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "discoveryId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "saved_discoveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "saved_discoveries_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "community_discoveries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "saved_discoveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "saved_discoveries_userId_discoveryId_key" ON "saved_discoveries"("userId", "discoveryId");
CREATE INDEX "saved_discoveries_userId_createdAt_idx" ON "saved_discoveries"("userId", "createdAt" DESC);

CREATE TABLE "discovery_feedback" (
  "id" TEXT NOT NULL,
  "satisfaction" INTEGER,
  "preferenceMatch" INTEGER,
  "writtenFeedback" VARCHAR(1000),
  "visitReported" BOOLEAN NOT NULL DEFAULT false,
  "consentToPublish" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "discoveryId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  CONSTRAINT "discovery_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "discovery_feedback_satisfaction_check" CHECK ("satisfaction" IS NULL OR "satisfaction" BETWEEN 1 AND 5),
  CONSTRAINT "discovery_feedback_preference_check" CHECK ("preferenceMatch" IS NULL OR "preferenceMatch" BETWEEN 1 AND 5),
  CONSTRAINT "discovery_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "discovery_feedback_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "discovery_feedback_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "community_discoveries"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "discovery_feedback_discoveryId_userId_tripId_key" ON "discovery_feedback"("discoveryId", "userId", "tripId");
CREATE INDEX "discovery_feedback_discoveryId_createdAt_idx" ON "discovery_feedback"("discoveryId", "createdAt");

CREATE TABLE "community_trip_feedback" (
  "id" TEXT NOT NULL,
  "overallSatisfaction" INTEGER NOT NULL,
  "writtenFeedback" VARCHAR(1000),
  "consentToPublish" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tripId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "community_trip_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_trip_feedback_rating_check" CHECK ("overallSatisfaction" BETWEEN 1 AND 5),
  CONSTRAINT "community_trip_feedback_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_trip_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "community_trip_feedback_tripId_userId_key" ON "community_trip_feedback"("tripId", "userId");
CREATE INDEX "community_trip_feedback_createdAt_idx" ON "community_trip_feedback"("createdAt");
