-- =========================================================
-- Store Attendance — Schema
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Phase 2 of the build plan: this file is not wired up yet —
-- js/config.js still points USE_MOCK_DATA at js/mock/data.js.
-- =========================================================

create extension if not exists "pgcrypto";
create sequence if not exists employees_code_seq start with 100;

-- ---------------------------------------------------------
-- employees
-- ---------------------------------------------------------
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique not null default ('EMP' || lpad(nextval('employees_code_seq')::text, 3, '0')),
  name text not null,
  email text unique,
  mobile text,
  designation text,
  requested_store_name text,
  registration_latitude double precision,
  registration_longitude double precision,
  registration_accuracy double precision,
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  auth_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- stores
-- ---------------------------------------------------------
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  store_code text unique not null,
  store_name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  allowed_radius integer not null default 100, -- meters
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- employee_store_mapping (effective-dated, preserves history)
-- ---------------------------------------------------------
create table if not exists employee_store_mapping (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  store_id uuid not null references stores(id) on delete restrict,
  effective_from date not null default current_date,
  effective_to date,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now()
);
create index if not exists idx_mapping_employee_active
  on employee_store_mapping (employee_id) where status = 'active';

-- ---------------------------------------------------------
-- face_profiles (embeddings, never raw photographs)
-- ---------------------------------------------------------
create table if not exists face_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  embedding jsonb not null,       -- Float32Array serialized per sample
  model_version text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- attendance (one row per employee per day: first-in/last-out)
-- ---------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  store_id uuid not null references stores(id),
  attendance_date date not null,
  punch_in timestamptz,
  punch_out timestamptz,
  total_minutes integer,
  required_minutes integer not null default 480,
  status text not null default 'active'
    check (status in ('active', 'completed', 'short_hours', 'absent', 'missing_out', 'location_failed', 'face_failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, attendance_date)
);

-- ---------------------------------------------------------
-- attendance_events (full audit trail — every punch attempt)
-- ---------------------------------------------------------
create table if not exists attendance_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  store_id uuid references stores(id),
  attendance_id uuid references attendance(id),
  event_type text not null check (event_type in ('punch_in', 'punch_out')),
  event_timestamp timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  gps_accuracy double precision,
  distance_from_store integer,
  face_confidence double precision,
  device_info text,
  verification_status text not null check (verification_status in ('verified', 'rejected')),
  failure_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_employee_date
  on attendance_events (employee_id, event_timestamp desc);
