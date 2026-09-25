# Shadowfax Store Attendance

Employee store attendance with face verification + GPS geofencing, built as a
static site (HTML/CSS/vanilla JS, ES Modules) for GitHub Pages, backed by
Supabase. No React/Next/Angular. No paid APIs.

## Status: real end-to-end, most of the admin console migrated off mock data

**Fully real (Supabase + browser APIs):**

- **Login** — real Supabase Auth (email + password), same form for employees
  and admins; branches on `app_metadata.role` (`js/auth/context.js`).
- **Self-registration** — open sign-up. The employee **chooses their own
  Employee ID** (checked for uniqueness) and their **GPS location is captured
  at registration time** and stored on the record — purely so an admin can
  eyeball it ("View on Map" link) before approving. It does *not* set their
  store or geofence; admin still manually assigns the store on approval, so
  employees still never pick their own store. There's also a free-text
  **"Your Store"** field the employee fills in themselves — shown to the
  admin in Pending Approvals (and used to pre-select the matching option in
  the store dropdown, if the name matches). Once you hand over the official
  store list, this becomes a real dropdown instead of free text.
- **Account deletion** — an admin can permanently delete any employee
  (Employees → open the employee → **Danger Zone** tab), and an employee can
  delete their own account (Home → **Account Settings** → Delete My Account).
  Both require typing "DELETE" to confirm, and both go through a Supabase
  **Edge Function** (`supabase/functions/delete-account`) — deleting a login
  requires the service-role key, which must never reach the browser, so this
  is the one place that key is used, server-side only. See "Deploying the
  Edge Function" below — **this needs a one-time manual deploy step**.
- **Face enrollment** — real, local face-api.js detection + embeddings
  (vendored library + model weights, no CDN/paid API), 3 angles, saved to
  `face_profiles`.
- **Admin → Pending Approvals** — real admin sign-in, real pending list (with
  each registrant's captured location), approve (pick a store → activates +
  creates `employee_store_mapping`) or reject.
- **Admin → Dashboard** — KPI cards, 7-day attendance trend, store-wise
  presence donut, today's attendance table, and recent activity are all real
  queries now.
- **Admin → Live Attendance** — real Supabase Realtime subscription on
  `attendance_events`; new punches stream in live, no refresh needed.
- **Admin → Employees** (list + detail) — real data: store assignment, face
  enrollment status, attendance history, all from Supabase.
- **Admin → Stores** — real list, and **Add Store now actually persists**,
  including a working "Get Current Location" button.
- **Admin → Attendance → Daily View** and **→ Exceptions** — real queries.
- **Admin → Face Management** — real enrollment-status list.
- **Punch in/out + camera/GPS/face verification** — unchanged from the last
  pass: all real, writing to `attendance` / `attendance_events`.

**Still not wired up (flagged in-app with a note where relevant):**

- **Admin → Attendance → Monthly Report / Store-wise Report** — shells.
- **Admin → Reports** (the 9 "Generate" report cards) — shells; Daily View
  above already shows the real-data pattern they'd reuse.
- **Admin → Settings** — still just displays the local `APP_CONFIG` values;
  doesn't read/write Supabase.
- **Exceptions table** only shows what's actually logged as `rejected` in
  `attendance_events` — right now a failed punch (bad face match, outside
  geofence, etc.) is blocked client-side and **not** written there yet, so
  this table will stay empty until that logging is added.
- Employee **Edit**, store **transfer workflow**, and face **re-enrollment/
  revoke** from the admin side aren't built.

## Required SQL migrations

Run these once, in order, in the Supabase SQL Editor (skip any already run):

1. `supabase/migration_002_open_registration.sql` — pending status, self-register policy
2. `supabase/migration_003_registration_details.sql` — employee-chosen ID support + captured registration location columns
3. `supabase/migration_004_enable_realtime.sql` — turns on Realtime for Live Attendance
4. `supabase/migration_005_fix_punch_out_rls.sql` — fixes a bug where punch-out failed with "new row violates row-level security policy"
5. `supabase/migration_006_requested_store.sql` — adds the free-text "Your Store" field at registration

A brand-new project can just run `schema.sql` → `policies.sql` →
`functions.sql` → `seed.sql` in order; those already include everything above.

## Deploying the Edge Function (required for account deletion)

`supabase/functions/delete-account/index.ts` needs to be deployed once. No
CLI needed — the Supabase Dashboard can do it directly:

1. Supabase Dashboard → **Edge Functions** (left sidebar) → **Create a new function**.
2. Name it exactly `delete-account`.
3. Open `supabase/functions/delete-account/index.ts` from this project, copy
   its entire contents, and paste them into the function editor (replacing
   the placeholder code).
4. Click **Deploy**.

That's it — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
are automatically available inside every Edge Function; you don't set any
secrets manually. Until this is deployed, the "Delete Employee" / "Delete My
Account" buttons in the app will fail with a function-not-found error.

## Testing end-to-end (at your real location)

1. Run the migrations above.
2. Add a store at your real coordinates — either via **Admin → Stores → Add
   Store → Get Current Location** now that it's real, or via SQL:
   ```sql
   insert into stores (store_code, store_name, latitude, longitude, allowed_radius, status)
   values ('SDFX_TEST_LOC', 'Test Location', <your_lat>, <your_lng>, 150, 'active');
   ```
3. Serve the app (`npx serve .` — camera/GPS need `https://` or `localhost`).
4. **Login → "New employee? Register here"** → pick your own Employee ID,
   fill in the rest, allow location + camera, enroll your face.
5. Log in as your admin account → **Pending Approvals** → assign your new
   registration to a store → Approve.
6. Log out, log back in as yourself → punch in/out for real → watch it
   appear live on **Admin → Live Attendance** and **Dashboard** in another
   tab/device.

## Running it

No build step. Serve the folder statically, e.g. `npx serve .`.

## Project structure

`css/` (one file per concern), `js/auth` (real Supabase auth, open
registration, context resolution), `js/face` (real face-api.js detection/
embedding/verification), `js/gps` (real geolocation + Haversine), `js/attendance`
(real punch read/writes + hours calc), `js/admin` (dashboard/live-attendance/
employees/stores/attendance-daily/exceptions/face-management are real;
reports/monthly/store-wise/settings are still mock — see Status above),
`js/mock` (only backs the remaining mock admin pages now), `models/face`
(vendored face-api.js weights), `supabase/` (schema, RLS policies,
migrations, a server-side validation function, and seed data).

## Roadmap (from here)

1. **Log rejected punch attempts** to `attendance_events` (currently only
   successful punches are logged) so Exceptions/Location Failures/Face
   Verification Failures reports have real data to show.
2. **Monthly Report, Store-wise Report, and the Reports generator cards** —
   same query pattern as Daily View / Dashboard, just aggregated differently.
3. **Settings** — persist to a real `app_settings` table instead of the
   static `APP_CONFIG` object.
4. **Security hardening** — never place the Supabase **service role** key in
   any file under this folder. Anything that shouldn't be decided by the
   browser (e.g. final punch validation) should call a Supabase Edge Function
   using `validate_punch()` in `supabase/functions.sql`. The open
   self-registration flow has no identity verification beyond what the
   employee types — fine for testing, worth tightening (e.g. OTP) before
   real-world use.
