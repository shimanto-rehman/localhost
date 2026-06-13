-- Member payment methods (bank + MFS), replaces bank_accounts

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

CREATE INDEX "member_payment_methods_member_id_idx" ON "member_payment_methods"("member_id");
CREATE INDEX "member_payment_methods_apartment_id_idx" ON "member_payment_methods"("apartment_id");

ALTER TABLE "member_payment_methods" ADD CONSTRAINT "member_payment_methods_apartment_id_fkey"
    FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_payment_methods" ADD CONSTRAINT "member_payment_methods_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy bank_accounts into payment methods
INSERT INTO "member_payment_methods" (
    "id", "apartment_id", "member_id", "type", "account_number",
    "bank_name", "branch_name", "routing_number", "wallet_type", "sort_order", "created_at", "updated_at"
)
SELECT
    gen_random_uuid(), "apartment_id", "member_id", 'bank', "account_number",
    "bank_name", "branch_name", "routing_number", NULL, 0, "created_at", "updated_at"
FROM "bank_accounts";

INSERT INTO "member_payment_methods" (
    "id", "apartment_id", "member_id", "type", "account_number",
    "bank_name", "branch_name", "routing_number", "wallet_type", "sort_order", "created_at", "updated_at"
)
SELECT
    gen_random_uuid(), "apartment_id", "member_id", 'mfs', "mobile_banking_number",
    NULL, NULL, NULL, "mobile_banking_type", 1, "created_at", "updated_at"
FROM "bank_accounts"
WHERE "mobile_banking_number" IS NOT NULL AND "mobile_banking_number" != '';

DROP TABLE "bank_accounts";
