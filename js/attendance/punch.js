// =========================================================
// Punch state — real Supabase reads/writes against `attendance`
// (one row per employee per day) and `attendance_events` (full
// audit trail of every punch attempt).
// =========================================================
import { supabase } from "../supabaseClient.js";
import { computePresence } from "./hours.js";
import { APP_CONFIG } from "../config.js";

function todayDateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Reads today's attendance row (if any) for this employee and
 * returns the same shape the UI already expects:
 *   { status: "NOT_CHECKED_IN" }
 *   { status: "CHECKED_IN", punchInAt, presence }
 *   { status: "CHECKED_OUT", punchInAt, punchOutAt, presence }
 */
export async function getTodayState(employeeId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("punch_in, punch_out")
    .eq("employee_id", employeeId)
    .eq("attendance_date", todayDateStr())
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.punch_in) return { status: "NOT_CHECKED_IN" };

  const punchInAt = new Date(data.punch_in);
  if (!data.punch_out) {
    return { status: "CHECKED_IN", punchInAt, presence: computePresence(punchInAt, null) };
  }
  const punchOutAt = new Date(data.punch_out);
  return {
    status: "CHECKED_OUT",
    punchInAt,
    punchOutAt,
    presence: computePresence(punchInAt, punchOutAt)
  };
}

async function logEvent({ employeeId, storeId, attendanceId, eventType, meta, verified, failureReason }) {
  await supabase.from("attendance_events").insert({
    employee_id: employeeId,
    store_id: storeId,
    attendance_id: attendanceId || null,
    event_type: eventType,
    latitude: meta?.latitude ?? null,
    longitude: meta?.longitude ?? null,
    gps_accuracy: meta?.accuracy ?? null,
    distance_from_store: meta?.distance ?? null,
    face_confidence: meta?.faceConfidence ?? null,
    verification_status: verified ? "verified" : "rejected",
    failure_reason: failureReason || null
  });
}

export async function recordPunchIn(employeeId, storeId, meta) {
  const { data, error } = await supabase
    .from("attendance")
    .insert({
      employee_id: employeeId,
      store_id: storeId,
      attendance_date: todayDateStr(),
      punch_in: new Date().toISOString(),
      required_minutes: APP_CONFIG.requiredAttendanceMinutes,
      status: "active"
    })
    .select("id")
    .single();

  if (error) throw error;
  await logEvent({ employeeId, storeId, attendanceId: data.id, eventType: "punch_in", meta, verified: true });
  return data.id;
}

export async function recordPunchOut(employeeId, storeId, meta) {
  const { data: existing, error: findErr } = await supabase
    .from("attendance")
    .select("id, punch_in")
    .eq("employee_id", employeeId)
    .eq("attendance_date", todayDateStr())
    .is("punch_out", null)
    .maybeSingle();

  if (findErr) throw findErr;
  if (!existing) throw new Error("No open punch-in found for today.");

  const punchOutAt = new Date();
  const presence = computePresence(new Date(existing.punch_in), punchOutAt);
  const finalStatus = presence.status === "COMPLETED" ? "completed" : "short_hours";

  const { error: updateErr } = await supabase
    .from("attendance")
    .update({
      punch_out: punchOutAt.toISOString(),
      total_minutes: Math.round(presence.minutes),
      status: finalStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", existing.id);

  if (updateErr) throw updateErr;
  await logEvent({ employeeId, storeId, attendanceId: existing.id, eventType: "punch_out", meta, verified: true });
  return existing.id;
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_DISPLAY = {
  completed: "Completed",
  short_hours: "Short Hours",
  active: "Active",
  absent: "Absent",
  missing_out: "Missing Out",
  location_failed: "Location Failed",
  face_failed: "Face Failed"
};

/**
 * Full attendance history for an employee, most recent first,
 * shaped for the history table (date/in/out/hours/status labels).
 */
export async function getAttendanceHistory(employeeId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("attendance_date, punch_in, punch_out, total_minutes, status")
    .eq("employee_id", employeeId)
    .order("attendance_date", { ascending: false })
    .limit(60);

  if (error) throw error;

  return (data || []).map((row) => ({
    date: fmtDate(row.attendance_date),
    in: fmtTime(row.punch_in),
    out: fmtTime(row.punch_out),
    hours: row.total_minutes != null ? `${Math.floor(row.total_minutes / 60)}h ${String(row.total_minutes % 60).padStart(2, "0")}m` : "—",
    status: STATUS_DISPLAY[row.status] || row.status
  }));
}
