-- =========================================================
-- Migration 003: employee-chosen Employee ID at registration,
-- plus capturing the employee's GPS location at registration
-- time (for admin to visually sanity-check, not for auto store
-- assignment — admin still manually picks the store).
-- =========================================================

-- employee_code is now supplied by the employee at sign-up, not
-- auto-generated. Keep the sequence-based default as a harmless
-- fallback (never used by the app now, since the client always
-- supplies a value) rather than removing it.

alter table employees add column if not exists registration_latitude double precision;
alter table employees add column if not exists registration_longitude double precision;
alter table employees add column if not exists registration_accuracy double precision;
