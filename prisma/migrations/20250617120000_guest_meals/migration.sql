-- CreateEnum
CREATE TYPE "GuestMealMode" AS ENUM ('EQUAL_SPLIT', 'HOST_PAYS');

-- AlterTable
ALTER TABLE "meal_config" ADD COLUMN "guest_meal_mode" "GuestMealMode" NOT NULL DEFAULT 'EQUAL_SPLIT';

-- CreateTable
CREATE TABLE "guest_meal_records" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_slot" INTEGER NOT NULL,
    "guest_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_meal_records_apartment_id_meal_date_idx" ON "guest_meal_records"("apartment_id", "meal_date");

-- CreateIndex
CREATE UNIQUE INDEX "guest_meal_records_apartment_id_member_id_meal_date_meal_s_key" ON "guest_meal_records"("apartment_id", "member_id", "meal_date", "meal_slot");

-- AddForeignKey
ALTER TABLE "guest_meal_records" ADD CONSTRAINT "guest_meal_records_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meal_records" ADD CONSTRAINT "guest_meal_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
