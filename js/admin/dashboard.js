// =========================================================
// Admin — Dashboard (real Supabase data)
// =========================================================
import { supabase } from "../supabaseClient.js";
import { ICONS } from "../utils/icons.js";
import { statusBadgeClass } from "../attendance/attendance.js";
import { exportToCsv } from "../utils/export.js";

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function todayStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayLabel(d) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const STATUS_LABEL = { completed: "Completed", short_hours: "Short Hours", active: "Present" };

async function loadDashboardData() {
  const today = todayStr();
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const rangeStart = todayStr(last7[0]);

  const [
    { count: totalEmployees },
    { data: todayRows },
    { data: trendRows },
    { data: stores },
    { data: recentEvents }
  ] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("attendance")
      .select("employee_id, store_id, punch_in, punch_out, total_minutes, status, employees ( name, employee_code ), stores ( store_name )")
      .eq("attendance_date", today),
    supabase.from("attendance")
      .select("attendance_date, status")
      .gte("attendance_date", rangeStart)
      .lte("attendance_date", today),
    supabase.from("stores").select("id, store_name, store_code").eq("status", "active").order("store_name"),
    supabase.from("attendance_events")
      .select("event_type, event_timestamp, employees ( name ), stores ( store_name )")
      .order("event_timestamp", { ascending: false })
      .limit(6)
  ]);

  const presentToday = (todayRows || []).length;
  const shortHours = (todayRows || []).filter((r) => r.status === "short_hours").length;
  const absentToday = Math.max(0, (totalEmployees || 0) - presentToday);

  // Trend: for each of the last 7 days, bucket by status
  const trend = last7.map((d) => {
    const ds = todayStr(d);
    const rows = (trendRows || []).filter((r) => r.attendance_date === ds);
    const short = rows.filter((r) => r.status === "short_hours").length;
    const present = rows.length - short;
    const absent = Math.max(0, (totalEmployees || 0) - rows.length);
    return { day: dayLabel(d), present, short, absent };
  });

  // Store-wise presence: employees mapped per store vs present today per store
  const storePresence = await Promise.all((stores || []).map(async (s) => {
    const [{ count: total }, { count: present }] = await Promise.all([
      supabase.from("employee_store_mapping").select("id", { count: "exact", head: true }).eq("store_id", s.id).eq("status", "active"),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("store_id", s.id).eq("attendance_date", today)
    ]);
    return { name: s.store_name, present: present || 0, total: total || 0 };
  }));

  return {
    kpi: { totalEmployees: totalEmployees || 0, presentToday, absentToday, shortHours },
    trend,
    storePresence,
    todayRows: todayRows || [],
    recentEvents: recentEvents || []
  };
}

function barChart(trend) {
  const max = Math.max(1, ...trend.map((d) => d.present + d.absent + d.short));
  const cols = trend.map((d) => {
    const total = d.present + d.absent + d.short || 1;
    const scale = 100 / max;
    return `
      <div class="bar-chart__col">
        <div class="bar-chart__stack" style="height:${Math.max(4, total * scale)}%">
          <div class="bar-chart__seg" style="height:${(d.present / total) * 100}%; background:var(--chart-present);"></div>
          <div class="bar-chart__seg" style="height:${(d.short / total) * 100}%; background:var(--chart-short);"></div>
          <div class="bar-chart__seg" style="height:${(d.absent / total) * 100}%; background:var(--chart-absent);"></div>
        </div>
        <div class="bar-chart__label">${d.day}</div>
      </div>`;
  }).join("");
  return `<div class="bar-chart">${cols}</div>`;
}

function donutChart(storePresence) {
  const total = storePresence.reduce((s, x) => s + x.total, 0) || 1;
  const present = storePresence.reduce((s, x) => s + x.present, 0);
  const pct = Math.round((present / total) * 100);
  const colors = ["var(--color-info)", "var(--chart-bhopal)", "var(--chart-jabalpur)", "var(--chart-udaipur)", "var(--color-success)"];
  const r = 52, cx = 65, cy = 65, circumference = 2 * Math.PI * r;
  let offset = 0;
  const segs = storePresence.map((s, i) => {
    const frac = (s.present || 0) / total;
    const len = frac * circumference;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="14"
      stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" />`;
    offset += len;
    return seg;
  }).join("");

  const legend = storePresence.map((s, i) => `
    <div class="list-row">
      <span class="list-row__dot" style="background:${colors[i % colors.length]}"></span>
      <div class="list-row__main"><div class="list-row__title">${s.name.replace(" Store", "")}</div></div>
      <div class="list-row__value">${s.present}/${s.total}</div>
    </div>`).join("");

  return `
    <div class="donut-wrap">
      <div class="donut-chart">
        <svg viewBox="0 0 130 130" width="130" height="130">${segs}</svg>
        <div class="donut-center"><div class="donut-center__pct">${pct}%</div><div class="donut-center__label">Present</div></div>
      </div>
      <div class="donut-legend">${legend || `<div class="text-muted" style="font-size:12.5px;">No stores yet.</div>`}</div>
    </div>`;
}

function recentActivity(events) {
  if (events.length === 0) return `<div class="empty-state" style="padding:24px 8px;">No recent activity.</div>`;
  return events.map((e) => `
    <div class="list-row">
      <div class="avatar avatar--sm">${initials(e.employees?.name)}</div>
      <div class="list-row__main">
        <div class="list-row__title">${e.employees?.name || "Unknown"}</div>
        <div class="list-row__sub">${e.stores?.store_name || "—"}</div>
      </div>
      <div style="text-align:right;">
        <span class="badge ${e.event_type === "punch_out" ? "badge--danger" : "badge--success"}">${e.event_type === "punch_out" ? "Punch Out" : "Punch In"}</span>
        <div class="list-row__sub" style="margin-top:4px;">${new Date(e.event_timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>`).join("");
}

function todayTable(rows) {
  if (rows.length === 0) {
    return `<div class="empty-state" style="padding:24px 8px;">No punches recorded yet today.</div>`;
  }
  const trs = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
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

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>Employee</th><th>Store</th><th>Punch In</th><th>Punch Out</th><th>Total Hours</th><th>Status</th></tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`;
}

export async function renderDashboard(container) {
  container.innerHTML = `<div class="empty-state">Loading dashboard...</div>`;

  let data;
  try {
    data = await loadDashboardData();
  } catch (err) {
    container.innerHTML = `<div class="card card-pad">Couldn't load dashboard: ${err.message}</div>`;
    return;
  }

  const { kpi, trend, storePresence, todayRows, recentEvents } = data;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Overview of attendance across all stores</p>
      </div>
      <div class="page-header__actions">
        <div class="date-field">${ICONS.calendar} <span>${new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span></div>
      </div>
    </div>

    <div class="admin-grid">
      <div class="kpi-card"><div class="kpi-icon kpi-icon--blue">${ICONS.users}</div><div><div class="kpi-value">${kpi.totalEmployees}</div><div class="kpi-label">Total Employees</div></div></div>
      <div class="kpi-card"><div class="kpi-icon kpi-icon--green">${ICONS.userCheck}</div><div><div class="kpi-value">${kpi.presentToday}</div><div class="kpi-label">Present Today</div></div></div>
      <div class="kpi-card"><div class="kpi-icon kpi-icon--red">${ICONS.userX}</div><div><div class="kpi-value">${kpi.absentToday}</div><div class="kpi-label">Absent Today</div></div></div>
      <div class="kpi-card"><div class="kpi-icon kpi-icon--amber">${ICONS.clock}</div><div><div class="kpi-value">${kpi.shortHours}</div><div class="kpi-label">Short Hours</div></div></div>
    </div>

    <div class="admin-grid--split">
      <div class="card card-pad">
        <div class="card-header">
          <span class="card-title">Attendance Trend</span>
          <div class="chart-legend">
            <span class="chart-legend__item"><span class="chart-legend__dot" style="background:var(--chart-present)"></span>Present</span>
            <span class="chart-legend__item"><span class="chart-legend__dot" style="background:var(--chart-absent)"></span>Absent</span>
            <span class="chart-legend__item"><span class="chart-legend__dot" style="background:var(--chart-short)"></span>Short Hours</span>
          </div>
        </div>
        ${barChart(trend)}
      </div>
      <div class="card card-pad">
        <div class="card-header"><span class="card-title">Store-wise Presence</span></div>
        ${donutChart(storePresence)}
      </div>
    </div>

    <div class="admin-grid--split" style="grid-template-columns: 2fr 1fr;">
      <div class="card card-pad">
        <div class="card-header">
          <span class="card-title">Today's Attendance</span>
          <button class="btn btn-outline btn-sm" id="btn-export-today">${ICONS.download} Export</button>
        </div>
        ${todayTable(todayRows)}
      </div>
      <div class="card card-pad">
        <div class="card-header"><span class="card-title">Recent Activity</span></div>
        ${recentActivity(recentEvents)}
      </div>
    </div>
  `;

  container.querySelector("#btn-export-today")?.addEventListener("click", () => {
    exportToCsv("todays-attendance.csv", todayRows.map((r) => ({
      id: r.employees?.employee_code, name: r.employees?.name, store: r.stores?.store_name,
      in: r.punch_in ? new Date(r.punch_in).toLocaleTimeString("en-IN") : "",
      out: r.punch_out ? new Date(r.punch_out).toLocaleTimeString("en-IN") : "",
      hours: r.total_minutes != null ? `${Math.floor(r.total_minutes / 60)}h ${r.total_minutes % 60}m` : "",
      status: STATUS_LABEL[r.status] || r.status
    })), [
      { key: "id", label: "Employee ID" }, { key: "name", label: "Employee Name" }, { key: "store", label: "Store" },
      { key: "in", label: "Punch In" }, { key: "out", label: "Punch Out" }, { key: "hours", label: "Total Hours" }, { key: "status", label: "Status" }
    ]);
  });
}
