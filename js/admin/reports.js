// =========================================================
// Admin — Reports, Attendance sub-views, Face Management
// Daily View and Face Management are real Supabase queries.
// Monthly/Store-wise/Exceptions and the Reports generator cards
// are still shells — see the phase-note on each.
// =========================================================
import { supabase } from "../supabaseClient.js";
import { ICONS } from "../utils/icons.js";
import { statusBadgeClass } from "../attendance/attendance.js";
import { showToast } from "../utils/notifications.js";

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function phaseNote(title, body) {
  return `<div class="phase-note">${ICONS.info}<div><strong>${title}</strong>${body}</div></div>`;
}

const REPORT_TYPES = [
  { key: "daily", label: "Daily Attendance", desc: "Every punch recorded for a single day, across all stores." },
  { key: "monthly", label: "Monthly Attendance", desc: "Full-month presence rollup per employee." },
  { key: "employee", label: "Employee Attendance", desc: "Complete history for one employee, any date range." },
  { key: "store", label: "Store-wise Attendance", desc: "Presence broken down by store." },
  { key: "short", label: "Short Hours", desc: "Employees who punched out under the required hours." },
  { key: "absent", label: "Absent Employees", desc: "Employees with no punch on a given day." },
  { key: "missing", label: "Missing Punch-Out", desc: "Open attendance records flagged for admin review." },
  { key: "location", label: "Location Failures", desc: "Attempted punches rejected by the geofence check." },
  { key: "face", label: "Face Verification Failures", desc: "Attempted punches rejected by face matching." }
];

export function renderReports(container) {
  const cards = REPORT_TYPES.map((r) => `
    <div class="card card-pad" style="display:flex; flex-direction:column; gap:10px;">
      <div class="card-title-row"><span class="card-title" style="font-size:14.5px;">${r.label}</span></div>
      <p class="text-muted" style="font-size:12.5px; flex:1;">${r.desc}</p>
      <button class="btn btn-outline btn-sm" data-report="${r.key}">${ICONS.download} Generate</button>
    </div>`).join("");

  container.innerHTML = `
    <div class="page-header">
      <div><h1>Reports</h1><p>Daily view below is real — the generator cards here are still shells</p></div>
    </div>
    <div class="admin-grid">${cards}</div>
  `;

  container.querySelectorAll("[data-report]").forEach((btn) => {
    btn.addEventListener("click", () => showToast("This specific report builder isn't wired up yet — use Attendance → Daily View for real data.", "info"));
  });
}

const ATTENDANCE_TABS = [
  { key: "daily", label: "Daily View" },
  { key: "monthly", label: "Monthly Report" },
  { key: "store", label: "Store-wise Report" },
  { key: "exceptions", label: "Exceptions" }
];

export async function renderAttendanceSection(container, sub = "daily") {
  const tabs = ATTENDANCE_TABS.map((t) => `<a href="#/admin/attendance/${t.key}" class="tab ${t.key === sub ? "active" : ""}">${t.label}</a>`).join("");
  const active = ATTENDANCE_TABS.find((t) => t.key === sub) || ATTENDANCE_TABS[0];

  container.innerHTML = `
    <div class="page-header"><div><h1>Attendance</h1><p>${active.label}</p></div></div>
    <div class="tabs">${tabs}</div>
    <div id="attendance-tab-body"></div>
  `;
  const body = container.querySelector("#attendance-tab-body");

  if (sub === "daily") {
    await renderDailyView(body);
  } else if (sub === "exceptions") {
    await renderExceptions(body);
  } else {
    body.innerHTML = `
      <div class="card card-pad">
        ${phaseNote("Not wired up yet", `${active.label} will pull from the attendance table once built — Daily View and Exceptions (this page) already show the pattern it'll reuse.`)}
      </div>`;
  }
}

async function renderDailyView(body) {
  body.innerHTML = `<div class="empty-state">Loading...</div>`;
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("attendance")
    .select("punch_in, punch_out, total_minutes, status, employees ( name, employee_code ), stores ( store_name )")
    .eq("attendance_date", today);

  if (error) {
    body.innerHTML = `<div class="card card-pad">Couldn't load: ${error.message}</div>`;
    return;
  }

  const STATUS_LABEL = { completed: "Completed", short_hours: "Short Hours", active: "Active" };
  const rows = (data || []).map((r) => `
    <tr>
      <td>
        <div class="cell-employee">
          <div class="avatar avatar--sm">${initials(r.employees?.name)}</div>
          <div>
            <div class="cell-employee__name">${r.employees?.name || "Unknown"}</div>
            <div class="cell-employee__sub">${r.employees?.employee_code || "—"}</div>
          </div>
        </div>
      </td>
      <td>${r.stores?.store_name || "—"}</td>
      <td>${r.punch_in ? new Date(r.punch_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
      <td>${r.punch_out ? new Date(r.punch_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
      <td>${r.total_minutes != null ? `${Math.floor(r.total_minutes / 60)}h ${String(r.total_minutes % 60).padStart(2, "0")}m` : "—"}</td>
      <td><span class="badge ${statusBadgeClass(STATUS_LABEL[r.status] || r.status)}">${STATUS_LABEL[r.status] || r.status}</span></td>
    </tr>`).join("");

  body.innerHTML = `
    <div class="card card-pad">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Store</th><th>Punch In</th><th>Punch Out</th><th>Total Hours</th><th>Status</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6" class="text-muted">No punches today.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

async function renderExceptions(body) {
  body.innerHTML = `<div class="empty-state">Loading...</div>`;
  const { data, error } = await supabase
    .from("attendance_events")
    .select("event_type, event_timestamp, verification_status, failure_reason, employees ( name, employee_code ), stores ( store_name )")
    .eq("verification_status", "rejected")
    .order("event_timestamp", { ascending: false })
    .limit(50);

  if (error) {
    body.innerHTML = `<div class="card card-pad">Couldn't load: ${error.message}</div>`;
    return;
  }

  const rows = (data || []).map((e) => `
    <tr>
      <td>${new Date(e.event_timestamp).toLocaleString("en-IN")}</td>
      <td>${e.employees?.name || "Unknown"} (${e.employees?.employee_code || "—"})</td>
      <td>${e.stores?.store_name || "—"}</td>
      <td>${e.event_type === "punch_in" ? "Punch In" : "Punch Out"}</td>
      <td><span class="badge badge--danger">${e.failure_reason || "Rejected"}</span></td>
    </tr>`).join("");

  body.innerHTML = `
    <div class="card card-pad">
      ${phaseNote("Client-only rejections aren't logged yet", "Right now the app blocks a bad punch client-side (face/GPS failure) without writing a rejected attendance_events row. This table will fill in once that logging is added server-side.")}
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Time</th><th>Employee</th><th>Store</th><th>Type</th><th>Reason</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="text-muted">No rejected events logged.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

export async function renderFaceManagement(container) {
  container.innerHTML = `<div class="empty-state">Loading...</div>`;

  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, name, employee_code, face_profiles ( status, model_version )")
    .neq("status", "pending")
    .order("name");

  if (error) {
    container.innerHTML = `<div class="card card-pad">Couldn't load: ${error.message}</div>`;
    return;
  }

  const rows = (employees || []).map((e) => {
    const enrolled = e.face_profiles?.some((f) => f.status === "active");
    return `
    <tr>
      <td>${e.name}</td>
      <td>${e.employee_code}</td>
      <td><span class="badge ${enrolled ? "badge--info" : "badge--warning"}">${enrolled ? "Enrolled" : "Not Enrolled"}</span></td>
    </tr>`;
  }).join("");

  container.innerHTML = `
    <div class="page-header"><div><h1>Face Management</h1><p>Enrollment status across all employees</p></div></div>
    <div class="card card-pad">
      ${phaseNote("Embeddings only, never raw video", "Enrollment (done by the employee during self-registration) stores embeddings in face_profiles, protected by RLS. There's no admin re-enrollment/revoke action wired up here yet.")}
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>ID</th><th>Face Status</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="3" class="text-muted">No employees yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}
