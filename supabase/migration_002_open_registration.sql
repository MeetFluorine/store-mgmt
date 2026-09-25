-- =========================================================
-- Migration: open self-registration + pending-approval status
-- Run this in the SQL Editor AFTER schema.sql / policies.sql
-- have already been applied once.
-- =========================================================

-- 1) Allow a 'pending' status (employee has registered but not
--    yet been reviewed by an admin).
alter table employees drop constraint if exists employees_status_check;
alter table employees add constraint employees_status_check
  check (status in ('pending', 'active', 'inactive'));

-- 2) Auto-generate employee_code so self-registration doesn't
--    need an admin to hand one out first. Starts at 100 so it
--    never collides with the EMP001.. seed rows.
create sequence if not exists employees_code_seq start with 100;
alter table employees alter column employee_code
  set default ('EMP' || lpad(nextval('employees_code_seq')::text, 3, '0'));

-- 3) Let a freshly-signed-up auth user insert their OWN pending
--    employee row (name/mobile/email only — no store, no code,
--    status forced to 'pending'). Approval to 'active' + store
--    assignment is admin-only, via the existing
--    "admins manage employees" / "admins manage mapping" policies.
drop policy if exists "employee self-register" on employees;
create policy "employee self-register" on employees
  for insert with check (auth_user_id = auth.uid() and status = 'pending');
