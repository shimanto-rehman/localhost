-- CreateTable
CREATE TABLE "meal_member_slots" (
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "meal_slot" INTEGER NOT NULL,
    "opted_in" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "meal_member_slots_pkey" PRIMARY KEY ("apartment_id","member_id","meal_slot")
);

-- AddForeignKey
ALTER TABLE "meal_member_slots" ADD CONSTRAINT "meal_member_slots_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_member_slots" ADD CONSTRAINT "meal_member_slots_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: all active members opted into all configured meal slots
INSERT INTO "meal_member_slots" ("apartment_id", "member_id", "meal_slot", "opted_in")
SELECT m.apartment_id, m.id, gs.i, true
FROM "members" m
INNER JOIN "meal_config" mc ON mc.apartment_id = m.apartment_id
CROSS JOIN generate_series(0, mc.meals_per_day - 1) AS gs(i)
WHERE m.is_active = true
ON CONFLICT DO NOTHING;

-- Apartments without meal_config row: default 2 slots (Lunch, Dinner)
INSERT INTO "meal_member_slots" ("apartment_id", "member_id", "meal_slot", "opted_in")
SELECT m.apartment_id, m.id, gs.i, true
FROM "members" m
CROSS JOIN generate_series(0, 1) AS gs(i)
WHERE m.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM "meal_config" mc WHERE mc.apartment_id = m.apartment_id
  )
ON CONFLICT DO NOTHING;
