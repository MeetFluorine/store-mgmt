-- =========================================================
-- Migration 006: requested store name at registration
-- Free-text for now (the employee types the store they believe
-- they belong to). This is informational only, shown to the
-- admin in Pending Approvals to help pick the right store from
-- the real dropdown — it does NOT set the actual assignment.
-- Once you hand over the full official store list, this becomes
-- a proper dropdown of real stores instead of free text.
-- =========================================================

alter table employees add column if not exists requested_store_name text;
