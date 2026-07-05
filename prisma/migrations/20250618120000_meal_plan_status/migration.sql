-- Future meal planning: tri-state plan_status (PLANNED | OPT_OUT), replaces is_planned boolean

DO $$ BEGIN
  CREATE TYPE "MealPlanStatus" AS ENUM ('PLANNED', 'OPT_OUT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "meal_records" ADD COLUMN IF NOT EXISTS "plan_status" "MealPlanStatus";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meal_records' AND column_name = 'is_planned'
  ) THEN
    UPDATE "meal_records"
    SET "plan_status" = 'PLANNED'
    WHERE "is_planned" = true AND "plan_status" IS NULL;
    ALTER TABLE "meal_records" DROP COLUMN "is_planned";
  END IF;
END $$;
