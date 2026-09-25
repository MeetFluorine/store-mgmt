-- =========================================================
-- Migration 005: fix punch-out RLS bug
--
-- The original "employees update own open attendance" policy only
-- defined USING, no WITH CHECK. Postgres then reuses USING as the
-- WITH CHECK too — evaluated against the POST-update row. Since
-- punch-out's entire job is to set punch_out to a timestamp, the
-- row fails its own "punch_out is null" check the moment it's
-- updated, and the whole update is rejected with "new row violates
-- row-level security policy for table attendance".
--
-- Fix: keep USING as the gate on which row can be updated (must be
-- your own, still-open row), but give WITH CHECK its own condition
-- that doesn't re-check punch_out on the new row.
-- =========================================================

drop policy if exists "employees update own open attendance" on attendance;

create policy "employees update own open attendance" on attendance
  for update
  using (employee_id = current_employee_id() and punch_out is null)
  with check (employee_id = current_employee_id());
