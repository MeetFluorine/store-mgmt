// =========================================================
// Public configuration
// SAFE FOR THE BROWSER — never put the Supabase service-role
// key here or in any other file shipped to GitHub Pages.
// =========================================================

// Project: Shadowfax "Attendance tracker" (Supabase)
export const SUPABASE_URL = "https://lydcfwaprsvgcxckasxl.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZGNmd2FwcnN2Z2N4Y2thc3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTQ3MTgsImV4cCI6MjEwNTc5MDcxOH0.MnAkBhxX7MgkrV9oHeLiZlYiblkXrwp12oeBfIxq4CI";

// Feature flag: true while js/mock/data.js is standing in for
// Supabase. Flip to false as each area is migrated to real queries
// (see js/supabaseClient.js for the shared client instance).
export const USE_MOCK_DATA = true;

// Business rules — all configurable, none hard-coded elsewhere.
export const APP_CONFIG = {
  requiredAttendanceMinutes: 8 * 60,     // 8 hours
  gpsAccuracyThresholdMeters: 50,        // reject fixes worse than this
  defaultGeofenceRadiusMeters: 100,
  // Maximum Euclidean distance between a live face-api.js descriptor
  // and an enrolled one to count as a match. Lower = stricter.
  // face-api.js's own model is typically tuned so ~0.5-0.6 is a
  // reasonable same-person threshold.
  faceMatchThreshold: 0.5,
  punchCooldownSeconds: 30               // prevents duplicate punches from repeated detections
};
