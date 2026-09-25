-- =========================================================
-- Migration 004: enable Supabase Realtime on attendance_events
-- so Admin → Live Attendance can stream new punches as they
-- happen instead of showing a static list.
-- =========================================================

alter publication supabase_realtime add table attendance_events;
