-- SAFE MIGRATION: Only adds indexes, no data changes
-- Run this directly in your database (Neon SQL editor, psql, etc.)

-- Index for bill_adjustments (speeds up bill queries)
CREATE INDEX IF NOT EXISTS "bill_adjustments_bill_id_idx" ON "bill_adjustments"("bill_id");
CREATE INDEX IF NOT EXISTS "bill_adjustments_member_id_idx" ON "bill_adjustments"("member_id");

-- Index for audit_events (speeds up audit log fetch)
CREATE INDEX IF NOT EXISTS "audit_events_apartment_id_created_at_idx" ON "audit_events"("apartment_id", "created_at");
