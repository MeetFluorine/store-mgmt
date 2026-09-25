// =========================================================
// Session
// Supabase's own client already persists the real auth session
// (JWT) in localStorage. This module just caches the bits our
// router needs synchronously — role, and the resolved employees
// row — so app.js doesn't have to await a Supabase call on every
// hash change.
// =========================================================

const KEY = "sfx_attendance_session";

export function setSessionCache(session) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function getSessionCache() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSessionCache() {
  sessionStorage.removeItem(KEY);
}
