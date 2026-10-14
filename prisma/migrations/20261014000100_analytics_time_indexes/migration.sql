-- Additive indexes for the 30-day trip and analytics dashboards.
CREATE INDEX "trips_createdAt_idx" ON "trips"("createdAt");
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");
