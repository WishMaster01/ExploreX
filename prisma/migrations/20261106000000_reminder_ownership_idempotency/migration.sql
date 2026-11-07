-- Preserve all existing rows. Abort instead of altering any reminder whose
-- trip belongs to a different user; that condition requires explicit review.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "reminders" r
    JOIN "trips" t ON t."id" = r."tripId"
    WHERE r."userId" <> t."userId"
  ) THEN
    RAISE EXCEPTION 'Cannot enforce reminder ownership: mismatched trip/user rows exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "trips"
    WHERE ("budgetAmountMinor" IS NOT NULL AND ("budgetAmountMinor" < 0 OR "budgetCurrencyCode" IS NULL))
       OR ("budgetCurrencyCode" IS NOT NULL AND "budgetCurrencyCode" !~ '^[A-Z]{3}$')
  ) THEN
    RAISE EXCEPTION 'Cannot enforce trip money semantics: invalid minor amount/currency rows exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "hotels"
    WHERE ("priceAmountMinor" IS NOT NULL AND ("priceAmountMinor" < 0 OR "currencyCode" IS NULL))
       OR ("currencyCode" IS NOT NULL AND "currencyCode" !~ '^[A-Z]{3}$')
  ) THEN
    RAISE EXCEPTION 'Cannot enforce hotel money semantics: invalid minor amount/currency rows exist';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "trip_activities"
    WHERE ("estimatedCostMinor" IS NOT NULL AND ("estimatedCostMinor" < 0 OR "currencyCode" IS NULL))
       OR ("currencyCode" IS NOT NULL AND "currencyCode" !~ '^[A-Z]{3}$')
  ) THEN
    RAISE EXCEPTION 'Cannot enforce activity money semantics: invalid minor amount/currency rows exist';
  END IF;
END $$;

ALTER TABLE "reminders" ADD COLUMN "idempotencyKey" VARCHAR(128);

CREATE UNIQUE INDEX "reminders_userId_idempotencyKey_key"
  ON "reminders"("userId", "idempotencyKey");

CREATE UNIQUE INDEX "trips_id_userId_key" ON "trips"("id", "userId");

ALTER TABLE "reminders" DROP CONSTRAINT "reminders_tripId_fkey";
ALTER TABLE "reminders"
  ADD CONSTRAINT "reminders_tripId_userId_fkey"
  FOREIGN KEY ("tripId", "userId")
  REFERENCES "trips"("id", "userId")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "reminders_tripId_idx";
CREATE INDEX "reminders_tripId_userId_idx" ON "reminders"("tripId", "userId");

ALTER TABLE "trips"
  ADD CONSTRAINT "trips_budget_minor_currency_check"
  CHECK (
    ("budgetAmountMinor" IS NULL OR ("budgetAmountMinor" >= 0 AND "budgetCurrencyCode" IS NOT NULL))
    AND ("budgetCurrencyCode" IS NULL OR "budgetCurrencyCode" ~ '^[A-Z]{3}$')
  );
ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_price_minor_currency_check"
  CHECK (
    ("priceAmountMinor" IS NULL OR ("priceAmountMinor" >= 0 AND "currencyCode" IS NOT NULL))
    AND ("currencyCode" IS NULL OR "currencyCode" ~ '^[A-Z]{3}$')
  );
ALTER TABLE "trip_activities"
  ADD CONSTRAINT "trip_activities_cost_minor_currency_check"
  CHECK (
    ("estimatedCostMinor" IS NULL OR ("estimatedCostMinor" >= 0 AND "currencyCode" IS NOT NULL))
    AND ("currencyCode" IS NULL OR "currencyCode" ~ '^[A-Z]{3}$')
  );

COMMIT;
