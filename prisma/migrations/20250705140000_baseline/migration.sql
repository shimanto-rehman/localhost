-- CreateEnum
CREATE TYPE "GuestMealMode" AS ENUM ('EQUAL_SPLIT', 'HOST_PAYS');

-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('PLANNED', 'OPT_OUT');

-- CreateTable
CREATE TABLE "apartments" (
    "id" UUID NOT NULL,
    "registration_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "address_road" VARCHAR(100) NOT NULL,
    "address_postal" VARCHAR(20) NOT NULL,
    "address_city" VARCHAR(60) NOT NULL,
    "address_country" VARCHAR(60) NOT NULL DEFAULT 'Bangladesh',
    "apt_floor" VARCHAR(30),
    "apt_type" VARCHAR(30),
    "move_in_date" DATE,
    "member_count_hint" INTEGER,
    "registrant_name" VARCHAR(80) NOT NULL,
    "registrant_nid" TEXT NOT NULL,
    "registrant_phone" VARCHAR(20) NOT NULL,
    "registrant_email" VARCHAR(255) NOT NULL,
    "admin_member_id" UUID,
    "bill_manager_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role_permissions" JSONB,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartment_password_reset_tokens" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartment_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "photo_url" TEXT,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "nid" TEXT,
    "hometown" VARCHAR(80),
    "country" VARCHAR(60) DEFAULT 'Bangladesh',
    "move_in_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_payment_methods" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" VARCHAR(80),
    "branch_name" VARCHAR(80),
    "routing_number" VARCHAR(20),
    "wallet_type" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_costs" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "in_fixed_bucket" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optional_costs" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optional_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optional_cost_members" (
    "optional_cost_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "opted_in" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "optional_cost_members_pkey" PRIMARY KEY ("optional_cost_id","member_id")
);

-- CreateTable
CREATE TABLE "rent_splits" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "fixed_amount" INTEGER,

    CONSTRAINT "rent_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_bills" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "month_key" VARCHAR(7) NOT NULL,
    "electricity" INTEGER,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMP(3),
    "locked_by" UUID,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_adjustments" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_config" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "meals_per_day" INTEGER NOT NULL DEFAULT 2,
    "meal_names" TEXT[] DEFAULT ARRAY['Lunch', 'Dinner']::TEXT[],
    "week_start_day" INTEGER NOT NULL DEFAULT 6,
    "rate_override" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "guest_meal_mode" "GuestMealMode" NOT NULL DEFAULT 'EQUAL_SPLIT',

    CONSTRAINT "meal_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_member_slots" (
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "meal_slot" INTEGER NOT NULL,
    "opted_in" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "meal_member_slots_pkey" PRIMARY KEY ("apartment_id","member_id","meal_slot")
);

-- CreateTable
CREATE TABLE "meal_records" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_slot" INTEGER NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan_status" "MealPlanStatus",

    CONSTRAINT "meal_records_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "meal_shopping" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "month_key" VARCHAR(7) NOT NULL,
    "item_name" VARCHAR(80) NOT NULL,
    "amount" INTEGER NOT NULL,
    "purchase_date" DATE NOT NULL,
    "added_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_shopping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_months" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "month_key" VARCHAR(7) NOT NULL,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMP(3),
    "finalized_by" UUID,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "month_key" VARCHAR(7) NOT NULL,
    "item_name" VARCHAR(80) NOT NULL,
    "price" INTEGER NOT NULL,
    "category" VARCHAR(40) NOT NULL DEFAULT 'Other',
    "expense_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "actor_member_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "target_type" VARCHAR(40),
    "target_id" UUID,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_sessions" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "token_jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "href" VARCHAR(200),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_member_payments" (
    "id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'unpaid',
    "amount_due" INTEGER NOT NULL DEFAULT 0,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_member_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartment_job_runs" (
    "id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "job_key" VARCHAR(80) NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartment_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apartments_registration_id_key" ON "apartments"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartments_name_key" ON "apartments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "apartments_registrant_email_key" ON "apartments"("registrant_email");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_password_reset_tokens_token_hash_key" ON "apartment_password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "members_apartment_id_idx" ON "members"("apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_apartment_id_email_key" ON "members"("apartment_id", "email");

-- CreateIndex
CREATE INDEX "member_payment_methods_member_id_idx" ON "member_payment_methods"("member_id");

-- CreateIndex
CREATE INDEX "member_payment_methods_apartment_id_idx" ON "member_payment_methods"("apartment_id");

-- CreateIndex
CREATE INDEX "fixed_costs_apartment_id_idx" ON "fixed_costs"("apartment_id");

-- CreateIndex
CREATE INDEX "optional_costs_apartment_id_idx" ON "optional_costs"("apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "rent_splits_member_id_key" ON "rent_splits"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "rent_splits_apartment_id_member_id_key" ON "rent_splits"("apartment_id", "member_id");

-- CreateIndex
CREATE INDEX "monthly_bills_apartment_id_month_key_idx" ON "monthly_bills"("apartment_id", "month_key");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_bills_apartment_id_month_key_key" ON "monthly_bills"("apartment_id", "month_key");

-- CreateIndex
CREATE INDEX "bill_adjustments_bill_id_idx" ON "bill_adjustments"("bill_id");

-- CreateIndex
CREATE INDEX "bill_adjustments_member_id_idx" ON "bill_adjustments"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_config_apartment_id_key" ON "meal_config"("apartment_id");

-- CreateIndex
CREATE INDEX "meal_member_slots_apartment_id_member_id_idx" ON "meal_member_slots"("apartment_id", "member_id");

-- CreateIndex
CREATE INDEX "meal_records_apartment_id_member_id_idx" ON "meal_records"("apartment_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_records_apartment_id_member_id_meal_date_meal_slot_key" ON "meal_records"("apartment_id", "member_id", "meal_date", "meal_slot");

-- CreateIndex
CREATE INDEX "guest_meal_records_apartment_id_meal_date_idx" ON "guest_meal_records"("apartment_id", "meal_date");

-- CreateIndex
CREATE UNIQUE INDEX "guest_meal_records_apartment_id_member_id_meal_date_meal_sl_key" ON "guest_meal_records"("apartment_id", "member_id", "meal_date", "meal_slot");

-- CreateIndex
CREATE INDEX "meal_shopping_apartment_id_month_key_idx" ON "meal_shopping"("apartment_id", "month_key");

-- CreateIndex
CREATE UNIQUE INDEX "meal_months_apartment_id_month_key_key" ON "meal_months"("apartment_id", "month_key");

-- CreateIndex
CREATE INDEX "expenses_apartment_id_month_key_idx" ON "expenses"("apartment_id", "month_key");

-- CreateIndex
CREATE INDEX "expenses_member_id_idx" ON "expenses"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "audit_events_apartment_id_created_at_idx" ON "audit_events"("apartment_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "member_sessions_token_jti_key" ON "member_sessions"("token_jti");

-- CreateIndex
CREATE UNIQUE INDEX "login_attempts_key_key" ON "login_attempts"("key");

-- CreateIndex
CREATE INDEX "notifications_member_id_read_at_idx" ON "notifications"("member_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_apartment_id_created_at_idx" ON "notifications"("apartment_id", "created_at");

-- CreateIndex
CREATE INDEX "bill_member_payments_member_id_idx" ON "bill_member_payments"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_member_payments_bill_id_member_id_key" ON "bill_member_payments"("bill_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_job_runs_apartment_id_job_key_key" ON "apartment_job_runs"("apartment_id", "job_key");

-- AddForeignKey
ALTER TABLE "apartment_password_reset_tokens" ADD CONSTRAINT "apartment_password_reset_tokens_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_methods" ADD CONSTRAINT "member_payment_methods_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_methods" ADD CONSTRAINT "member_payment_methods_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optional_costs" ADD CONSTRAINT "optional_costs_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optional_cost_members" ADD CONSTRAINT "optional_cost_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optional_cost_members" ADD CONSTRAINT "optional_cost_members_optional_cost_id_fkey" FOREIGN KEY ("optional_cost_id") REFERENCES "optional_costs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_splits" ADD CONSTRAINT "rent_splits_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_splits" ADD CONSTRAINT "rent_splits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_bills" ADD CONSTRAINT "monthly_bills_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_bills" ADD CONSTRAINT "monthly_bills_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_adjustments" ADD CONSTRAINT "bill_adjustments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "monthly_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_adjustments" ADD CONSTRAINT "bill_adjustments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_config" ADD CONSTRAINT "meal_config_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_member_slots" ADD CONSTRAINT "meal_member_slots_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_member_slots" ADD CONSTRAINT "meal_member_slots_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meal_records" ADD CONSTRAINT "guest_meal_records_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meal_records" ADD CONSTRAINT "guest_meal_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_shopping" ADD CONSTRAINT "meal_shopping_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_shopping" ADD CONSTRAINT "meal_shopping_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_shopping" ADD CONSTRAINT "meal_shopping_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_months" ADD CONSTRAINT "meal_months_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_months" ADD CONSTRAINT "meal_months_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_member_id_fkey" FOREIGN KEY ("actor_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_member_payments" ADD CONSTRAINT "bill_member_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "monthly_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_member_payments" ADD CONSTRAINT "bill_member_payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_member_payments" ADD CONSTRAINT "bill_member_payments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_job_runs" ADD CONSTRAINT "apartment_job_runs_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;