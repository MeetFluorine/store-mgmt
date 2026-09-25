// =========================================================
// Date / time helpers
// =========================================================

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDateLong(date = new Date()) {
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(date = new Date()) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Formats a duration given in minutes as "Xh Ym"
export function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Live elapsed time since a given Date, in minutes
export function minutesSince(startDate) {
  return (Date.now() - startDate.getTime()) / 60000;
}
