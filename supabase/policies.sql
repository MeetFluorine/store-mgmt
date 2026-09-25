-- =========================================================
-- Row Level Security
-- Employees can only reach their own rows; admins (identified
-- by a custom claim/role set on auth.users) can reach everything.
-- Adjust the is_admin() check to match how you flag admins once
-- Supabase Auth is wired up.
-- =========================================================

alter table employees enable row level security;
alter table stores enable row level security;
alter table employee_store_mapping enable row level security;
alter table face_profiles enable row level security;
alter table attendance enable row level security;
alter table attendance_events enable row level security;

-- Helper: is the current auth user an admin?
-- Phase 2: back this with a real `role` claim (e.g. in a profiles
-- table or auth.users.raw_app_meta_data) instead of hard-coding.
create or replace function is_admin() returns boolean as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$ language sql stable;

-- Helper: the employees.id row that matches the current auth user
create or replace function current_employee_id() returns uuid as $$
  select id from employees where auth_user_id = auth.uid();
$$ language sql stable;

-- ---- employees ----
-- A freshly signed-up user can insert their OWN pending row
-- (no store, no employee_code — those come from admin approval).
create policy "employee self-register" on employees
  for insert with check (auth_user_id = auth.uid() and status = 'pending');

create policy "employees read own row" on employees
  for select using (auth_user_id = auth.uid() or is_admin());
create policy "admins manage employees" on employees
  for all using (is_admin()) with check (is_admin());

-- ---- stores ----
-- Public read: registration needs to show the store list before
-- the person has an account yet.
create policy "anyone can read active stores" on stores
  for select using (status = 'active');
create policy "admins manage stores" on stores
  for all using (is_admin()) with check (is_admin());

-- ---- employee_store_mapping ----
create policy "employees read own mapping" on employee_store_mapping
  for select using (employee_id = current_employee_id() or is_admin());
create policy "admins manage mapping" on employee_store_mapping
  for all using (is_admin()) with check (is_admin());

-- ---- face_profiles (most sensitive — admin only, plus the owner) ----
create policy "employees read own face profile" on face_profiles
  for select using (employee_id = current_employee_id() or is_admin());
create policy "admins manage face profiles" on face_profiles
  for all using (is_admin()) with check (is_admin());

-- ---- attendance ----
create policy "employees read own attendance" on attendance
  for select using (employee_id = current_employee_id() or is_admin());
create policy "employees insert own attendance" on attendance
  for insert with check (employee_id = current_employee_id());
create policy "employees update own open attendance" on attendance
  for update
  using (employee_id = current_employee_id() and punch_out is null)
  with check (employee_id = current_employee_id());
create policy "admins manage attendance" on attendance
  for all using (is_admin()) with check (is_admin());

-- ---- attendance_events (audit trail — insert-only for employees) ----
create policy "employees read own events" on attendance_events
  for select using (employee_id = current_employee_id() or is_admin());
create policy "employees insert own events" on attendance_events
  for insert with check (employee_id = current_employee_id());
create policy "admins manage events" on attendance_events
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------
-- Added for employee self-registration (js/auth/register.js):
-- lets a newly signed-up auth user claim ONE pre-created,
-- still-unlinked employee row, and insert their own face profile
-- once linked. Run this block separately if policies.sql was
-- already applied earlier.
-- ---------------------------------------------------------
create policy "employee self-link" on employees
  for update using (auth_user_id is null) with check (auth_user_id = auth.uid());

create policy "employees insert own face profile" on face_profiles
  for insert with check (employee_id = current_employee_id());
