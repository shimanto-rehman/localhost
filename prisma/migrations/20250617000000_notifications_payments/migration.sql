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
