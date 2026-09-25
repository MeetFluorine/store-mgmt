// =========================================================
// Admin — Live Attendance (real data + Supabase Realtime)
// Requires attendance_events to be added to the supabase_realtime
// publication — see supabase/migration_004_enable_realtime.sql.
// =========================================================
import { supabase } from "../supabaseClient.js";
import { ICONS } from "../utils/icons.js";

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

let channel = null;
let employeeNames = {};
let storeNames = {};

function stopSubscription() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

function rowHtml(e) {
  return `
    <tr>
      <td>${new Date(e.event_timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
      <td>
        <div class="cell-employee">
          <div class="avatar avatar--sm">${initials(employeeNames[e.employee_id])}</div>
          <div class="cell-employee__name">${employeeNames[e.employee_id] || "Unknown"}</div>
        </div>
      </td>
      <td>${storeNames[e.store_id] || "—"}</td>
      <td><span class="badge ${e.event_type === "punch_in" ? "badge--success" : "badge--danger"}">${e.event_type === "punch_in" ? "Punch In" : "Punch Out"}</span></td>
      <td>${e.distance_from_store != null ? `${e.distance_from_store} m` : "—"}</td>
      <td><span class="badge ${e.verification_status === "verified" ? "badge--info" : "badge--danger"}">${e.verification_status === "verified" ? `${ICONS.check.replace('<svg ', '<svg style="width:11px;height:11px;" ')} Verified` : "Rejected"}</span></td>
    </tr>`;
}

export async function renderLiveAttendance(container) {
  stopSubscription();
  container.innerHTML = `<div class="empty-state">Loading live attendance...</div>`;

  const [{ data: employees }, { data: stores }, { data: events, error }] = await Promise.all([
    supabase.from("employees").select("id, name"),
    supabase.from("stores").select("id, store_name"),
    supabase.from("attendance_events").select("*").order("event_timestamp", { ascending: false }).limit(50)
  ]);

  employeeNames = Object.fromEntries((employees || []).map((e) => [e.id, e.name]));
  storeNames = Object.fromEntries((stores || []).map((s) => [s.id, s.store_name]));

  if (error) {
    container.innerHTML = `<div class="card card-pad">Couldn't load live attendance: ${error.message}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Live Attendance</h1>
        <p>Real-time punch activity across stores</p>
      </div>
      <span class="badge badge--success" id="realtime-indicator">${ICONS.refresh.replace('<svg ', '<svg style="width:11px;height:11px;" ')} Live</span>
    </div>

    <div class="card card-pad">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Time</th><th>Employee</th><th>Store</th><th>Type</th><th>Distance</th><th>Status</th></tr></thead>
          <tbody id="live-tbody">${(events || []).map(rowHtml).join("") || `<tr><td colspan="6" class="text-muted">No punches yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector("#live-tbody");
  const indicator = container.querySelector("#realtime-indicator");

  channel = supabase
    .channel("attendance_events_live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_events" }, (payload) => {
      const placeholder = tbody.querySelector("td[colspan]");
      if (placeholder) placeholder.closest("tr").remove();
      tbody.insertAdjacentHTML("afterbegin", rowHtml(payload.new));
    })
    .subscribe((status) => {
      if (indicator) {
        indicator.className = `badge ${status === "SUBSCRIBED" ? "badge--success" : "badge--neutral"}`;
        indicator.innerHTML = `${ICONS.refresh.replace('<svg ', '<svg style="width:11px;height:11px;" ')} ${status === "SUBSCRIBED" ? "Live" : "Connecting..."}`;
      }
    });
}

export function teardownLiveAttendance() {
  stopSubscription();
}
