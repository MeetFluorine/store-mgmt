// =========================================================
// Admin — Employees (real Supabase data)
// =========================================================
import { supabase } from "../supabaseClient.js";
import { ICONS } from "../utils/icons.js";
import { statusBadgeClass } from "../attendance/attendance.js";
import { showToast } from "../utils/notifications.js";

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export async function renderEmployeeList(container) {
  container.innerHTML = `<div class="empty-state">Loading employees...</div>`;

  const { data: employees, error } = await supabase
    .from("employees")
    .select(`
      id, employee_code, name, designation, status,
      employee_store_mapping ( status, stores ( store_name ) ),
      face_profiles ( status ),
      attendance ( attendance_date, punch_in )
    `)
    .neq("status", "pending")
    .order("name");

  if (error) {
    container.innerHTML = `<div class="card card-pad">Couldn't load employees: ${error.message}</div>`;
    return;
  }

  const rows = (employees || []).map((e) => {
    const store = e.employee_store_mapping?.find((m) => m.status === "active")?.stores?.store_name || "Unassigned";
    const faceStatus = e.face_profiles?.some((f) => f.status === "active") ? "Enrolled" : "Pending";
    const lastAttendance = (e.attendance || []).map((a) => a.attendance_date).sort().reverse()[0];

    return `
    <tr>
      <td>
        <div class="cell-employee">
          <div class="avatar avatar--sm">${initials(e.name)}</div>
          <div>
            <div class="cell-employee__name">${e.name}</div>
            <div class="cell-employee__sub">${e.employee_code}</div>
          </div>
        </div>
      </td>
      <td>${store}</td>
      <td>${e.designation || "—"}</td>
      <td><span class="badge ${e.status === "active" ? "badge--success" : "badge--neutral"}">${e.status}</span></td>
      <td><span class="badge ${faceStatus === "Enrolled" ? "badge--info" : "badge--warning"}">${faceStatus}</span></td>
      <td>${fmtDate(lastAttendance)}</td>
      <td><button class="btn btn-ghost btn-sm" data-open-emp="${e.id}">View</button></td>
    </tr>`;
  }).join("");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Employees</h1>
        <p>${(employees || []).length} employee${(employees || []).length === 1 ? "" : "s"}</p>
      </div>
    </div>
    <div class="card card-pad">
      <div class="card-header">
        <div class="topbar-search" style="width:260px;">${ICONS.search}<input id="emp-search" placeholder="Search employee..." /></div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Store</th><th>Designation</th><th>Status</th><th>Face Status</th><th>Last Attendance</th><th>Action</th></tr></thead>
          <tbody id="emp-tbody">${rows || `<tr><td colspan="7" class="text-muted">No employees yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-open-emp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = `#/admin/employees/${btn.getAttribute("data-open-emp")}`;
    });
  });

  container.querySelector("#emp-search")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    container.querySelectorAll("#emp-tbody tr").forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

export async function renderEmployeeDetail(container, employeeId) {
  container.innerHTML = `<div class="empty-state">Loading employee...</div>`;

  const { data: emp, error } = await supabase
    .from("employees")
    .select(`
      id, employee_code, name, designation, status, mobile,
      employee_store_mapping ( status, effective_from, stores ( store_name, store_code ) ),
      face_profiles ( status, model_version, created_at )
    `)
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !emp) {
    container.innerHTML = `<div class="card card-pad">Couldn't load this employee.</div>`;
    return;
  }

  const activeMapping = emp.employee_store_mapping?.find((m) => m.status === "active");
  const activeFace = emp.face_profiles?.find((f) => f.status === "active");

  const { data: history } = await supabase
    .from("attendance")
    .select("attendance_date, punch_in, punch_out, total_minutes, status")
    .eq("employee_id", employeeId)
    .order("attendance_date", { ascending: false })
    .limit(30);

  const STATUS_LABEL = { completed: "Completed", short_hours: "Short Hours", active: "Active" };
  const historyRows = (history || []).map((h) => `
    <tr>
      <td>${fmtDate(h.attendance_date)}</td>
      <td>${h.punch_in ? new Date(h.punch_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
      <td>${h.punch_out ? new Date(h.punch_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
      <td>${h.total_minutes != null ? `${Math.floor(h.total_minutes / 60)}h ${String(h.total_minutes % 60).padStart(2, "0")}m` : "—"}</td>
      <td><span class="badge ${statusBadgeClass(STATUS_LABEL[h.status] || h.status)}">${STATUS_LABEL[h.status] || h.status}</span></td>
    </tr>`).join("");

  container.innerHTML = `
    <a href="#/admin/employees" class="back-link">${ICONS.arrowLeft} Back to Employees</a>

    <div class="card profile-header">
      <div class="avatar avatar--lg">${initials(emp.name)}</div>
      <div>
        <div class="profile-header__name">${emp.name}</div>
        <div class="profile-header__id">${emp.employee_code}</div>
      </div>
      <span class="badge ${emp.status === "active" ? "badge--success" : "badge--neutral"} profile-header__badge">${emp.status}</span>
    </div>

    <div class="tabs">
      <span class="tab active" data-tab="history">Attendance History</span>
      <span class="tab" data-tab="profile">Profile</span>
      <span class="tab" data-tab="store">Store Assignment</span>
      <span class="tab" data-tab="face">Face Data</span>
      <span class="tab" data-tab="danger" style="color:var(--color-danger);">Danger Zone</span>
    </div>
    <div id="emp-tab-content"></div>
  `;

  const tabContent = container.querySelector("#emp-tab-content");

  function showTab(tab) {
    container.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));

    if (tab === "history") {
      tabContent.innerHTML = `
        <div class="card card-pad">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Punch In</th><th>Punch Out</th><th>Total Hours</th><th>Status</th></tr></thead>
              <tbody>${historyRows || `<tr><td colspan="5" class="text-muted">No attendance recorded yet.</td></tr>`}</tbody>
            </table>
          </div>
        </div>`;
    } else if (tab === "profile") {
      tabContent.innerHTML = `
        <div class="card card-pad">
          <div class="detail-grid">
            <div><div class="detail-item__label">Employee ID</div><div class="detail-item__value">${emp.employee_code}</div></div>
            <div><div class="detail-item__label">Designation</div><div class="detail-item__value">${emp.designation || "—"}</div></div>
            <div><div class="detail-item__label">Status</div><div class="detail-item__value">${emp.status}</div></div>
            <div><div class="detail-item__label">Mobile</div><div class="detail-item__value">${emp.mobile || "—"}</div></div>
          </div>
        </div>`;
    } else if (tab === "store") {
      tabContent.innerHTML = `
        <div class="card card-pad">
          ${activeMapping
            ? `<div class="detail-grid">
                 <div><div class="detail-item__label">Current Store</div><div class="detail-item__value">${activeMapping.stores.store_name}</div></div>
                 <div><div class="detail-item__label">Store Code</div><div class="detail-item__value">${activeMapping.stores.store_code}</div></div>
                 <div><div class="detail-item__label">Effective From</div><div class="detail-item__value">${fmtDate(activeMapping.effective_from)}</div></div>
               </div>`
            : `<div class="empty-state">No store assigned.</div>`}
        </div>`;
    } else if (tab === "face") {
      tabContent.innerHTML = `
        <div class="card card-pad">
          <div class="detail-grid">
            <div><div class="detail-item__label">Face Status</div><div class="detail-item__value">${activeFace ? "Enrolled" : "Not Enrolled"}</div></div>
            <div><div class="detail-item__label">Model Version</div><div class="detail-item__value">${activeFace?.model_version || "—"}</div></div>
            <div><div class="detail-item__label">Enrolled On</div><div class="detail-item__value">${activeFace ? fmtDate(activeFace.created_at) : "—"}</div></div>
          </div>
        </div>`;
    } else {
      tabContent.innerHTML = `
        <div class="card card-pad" style="border-color:var(--color-danger-border);">
          <div class="card-title" style="color:var(--color-danger); margin-bottom:10px;">Delete This Account</div>
          <p class="text-muted" style="font-size:13px; margin-bottom:16px;">
            This permanently deletes ${emp.name}'s login, employee record, store assignment,
            face profile, and full attendance history. This cannot be undone.
          </p>
          <button class="btn btn-danger" id="btn-delete-employee">Delete Employee Permanently</button>
          <div id="delete-confirm-panel"></div>
        </div>`;

      tabContent.querySelector("#btn-delete-employee").addEventListener("click", () => {
        const panel = tabContent.querySelector("#delete-confirm-panel");
        panel.innerHTML = `
          <div class="login-error show" style="margin-top:16px;">
            Are you absolutely sure? Type <strong>DELETE</strong> below to confirm.
          </div>
          <input id="delete-confirm-input" type="text" placeholder="Type DELETE to confirm" style="width:100%; padding:10px 12px; border:1px solid var(--border-strong); border-radius:8px; margin-bottom:10px;" />
          <button class="btn btn-danger" id="btn-delete-confirm">Confirm Permanent Delete</button>
        `;
        panel.querySelector("#btn-delete-confirm").addEventListener("click", async () => {
          if (panel.querySelector("#delete-confirm-input").value.trim() !== "DELETE") {
            showToast('Type "DELETE" exactly to confirm.', "error");
            return;
          }
          const btn = panel.querySelector("#btn-delete-confirm");
          btn.disabled = true;
          btn.textContent = "Deleting...";
          const { data, error } = await supabase.functions.invoke("delete-account", { body: { employeeId: emp.id } });
          if (error || data?.error) {
            showToast(data?.error || error.message || "Could not delete this employee.", "error");
            btn.disabled = false;
            btn.textContent = "Confirm Permanent Delete";
            return;
          }
          showToast(`${emp.name} was permanently deleted.`, "success");
          window.location.hash = "#/admin/employees";
        });
      });
    }
  }
  container.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
  showTab("history");
}
