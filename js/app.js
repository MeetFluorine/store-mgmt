// =========================================================
// App — SPA router + view rendering
// index.html → app.js → load required view (no framework)
// =========================================================
import { APP_CONFIG } from "./config.js";
import { ICONS } from "./utils/icons.js";
import { showToast } from "./utils/notifications.js";
import { formatTime, formatDateLong } from "./utils/date.js";

import { login, logout } from "./auth/auth.js";
import { resolveCurrentContext } from "./auth/context.js";
import { renderRegisterStart } from "./auth/register-view.js";

import { startCamera, stopCamera } from "./face/camera.js";
import { loadFaceModels } from "./face/model-loader.js";
import { verifyAgainstEmployee } from "./face/recognition.js";
import { FACE_ERRORS } from "./face/face-utils.js";
import { getCurrentPosition } from "./gps/location.js";
import { checkGeofence } from "./gps/geofence.js";

import { getTodayState, recordPunchIn, recordPunchOut, getAttendanceHistory } from "./attendance/punch.js";
import { computePresence } from "./attendance/hours.js";
import { statusBadgeClass } from "./attendance/attendance.js";
import { supabase } from "./supabaseClient.js";

import { renderDashboard } from "./admin/dashboard.js";
import { renderLiveAttendance, teardownLiveAttendance } from "./admin/live-attendance.js";
import { renderEmployeeList, renderEmployeeDetail } from "./admin/employees.js";
import { renderStores } from "./admin/stores.js";
import { renderReports, renderAttendanceSection, renderFaceManagement } from "./admin/reports.js";
import { renderSettings } from "./admin/settings.js";
import { renderApprovals } from "./admin/approvals.js";
import { ADMIN_USER } from "./mock/data.js";

// ---------------------------------------------------------
// View containers
// ---------------------------------------------------------
const views = {
  login: document.getElementById("view-login"),
  register: document.getElementById("view-register"),
  employee: document.getElementById("view-employee"),
  admin: document.getElementById("view-admin")
};
const registerMain = document.getElementById("register-main");
const employeeMain = document.getElementById("employee-main");
const adminMain = document.getElementById("admin-main");

function showTopLevel(name) {
  Object.values(views).forEach((v) => v.classList.remove("active"));
  views[name].classList.add("active");
}

// ---------------------------------------------------------
// Auth context cache — resolved once per sign-in, cleared on logout
// ---------------------------------------------------------
let ctx = null;

async function ensureContext() {
  if (ctx) return ctx;
  ctx = await resolveCurrentContext();
  return ctx;
}

function clearContext() {
  ctx = null;
}

// ---------------------------------------------------------
// Admin shell chrome (sidebar nav + topbar) — built once
// ---------------------------------------------------------
const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard", icon: ICONS.dashboard, href: "#/admin/dashboard" },
  { key: "approvals", label: "Pending Approvals", icon: ICONS.userCheck, href: "#/admin/approvals" },
  { key: "live-attendance", label: "Live Attendance", icon: ICONS.activity, href: "#/admin/live-attendance" },
  { key: "employees", label: "Employees", icon: ICONS.users, href: "#/admin/employees" },
  { key: "stores", label: "Stores", icon: ICONS.building, href: "#/admin/stores" },
  { key: "attendance", label: "Attendance", icon: ICONS.calendar, href: "#/admin/attendance/daily" },
  { key: "reports", label: "Reports", icon: ICONS.fileText, href: "#/admin/reports" },
  { key: "face-management", label: "Face Management", icon: ICONS.scan, href: "#/admin/face-management" },
  { key: "settings", label: "Settings", icon: ICONS.settings, href: "#/admin/settings" }
];

function initAdminChrome() {
  const nav = document.getElementById("admin-nav");
  nav.innerHTML = ADMIN_NAV.map(
    (item) => `<a class="nav-item" data-key="${item.key}" href="${item.href}">${item.icon}<span>${item.label}</span></a>`
  ).join("");

  document.getElementById("admin-avatar").textContent = ADMIN_USER.initials;
  document.getElementById("admin-name").textContent = ADMIN_USER.name;
  document.getElementById("admin-role").textContent = ADMIN_USER.role;
  document.getElementById("btn-admin-logout").innerHTML = ICONS.logout;
  document.getElementById("btn-admin-logout").addEventListener("click", async () => {
    teardownLiveAttendance();
    await logout();
    clearContext();
    window.location.hash = "#/login";
  });

  document.querySelector(".topbar-search").innerHTML = `${ICONS.search}<input placeholder="Search employee, store..." />`;

  document.getElementById("admin-topbar-right").innerHTML = `
    <div class="icon-btn">${ICONS.bell}<span class="icon-btn__dot">3</span></div>
    <div class="admin-user">
      <div class="avatar avatar--sm">${ADMIN_USER.initials}</div>
      <span>${ADMIN_USER.name}</span>
      ${ICONS.chevronDown}
    </div>
  `;
}

function setActiveNav(key) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-key") === key);
  });
}

// ---------------------------------------------------------
// Employee shell chrome
// ---------------------------------------------------------
function initEmployeeChrome() {
  document.getElementById("btn-employee-logout").innerHTML = ICONS.logout;
  document.getElementById("btn-employee-logout").addEventListener("click", async () => {
    await logout();
    clearContext();
    window.location.hash = "#/login";
  });
}

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------
function initLogin() {
  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-id").value;
    const pass = document.getElementById("login-pass").value;

    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Signing in...";

    const result = await login(email, pass);
    if (!result.success) {
      errorBox.textContent = result.error;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Login";
      return;
    }

    errorBox.classList.remove("show");
    clearContext();
    const c = await ensureContext();
    btn.disabled = false;
    btn.textContent = "Login";

    if (c?.role === "admin") {
      window.location.hash = "#/admin/dashboard";
    } else {
      window.location.hash = "#/employee/home";
    }
  });
}

// ---------------------------------------------------------
// EMPLOYEE: status screens (pending / inactive / not-found)
// ---------------------------------------------------------
function renderPendingScreen() {
  employeeMain.innerHTML = `
    <div class="att-header">
      <div class="att-header__icon" style="background:var(--color-warning-bg); color:var(--color-warning);">${ICONS.clock}</div>
      <h2>Approval Pending</h2>
      <p>Your registration is waiting on an admin to review it and assign your store. Check back soon.</p>
    </div>
  `;
}

function renderInactiveScreen() {
  employeeMain.innerHTML = `
    <div class="att-header">
      <div class="att-header__icon" style="background:var(--color-danger-bg); color:var(--color-danger);">${ICONS.userX}</div>
      <h2>Account Inactive</h2>
      <p>Your account isn't currently active. Please contact your administrator.</p>
    </div>
  `;
}

function renderNoStoreScreen() {
  employeeMain.innerHTML = `
    <div class="att-header">
      <div class="att-header__icon" style="background:var(--color-warning-bg); color:var(--color-warning);">${ICONS.store}</div>
      <h2>No Store Assigned</h2>
      <p>Your account is active but has no store assignment yet. Contact your administrator.</p>
    </div>
  `;
}

function renderStoreNotConfiguredScreen(storeName) {
  employeeMain.innerHTML = `
    <div class="att-header">
      <div class="att-header__icon" style="background:var(--color-warning-bg); color:var(--color-warning);">${ICONS.mapPin}</div>
      <h2>Store Location Not Set Up</h2>
      <p>${storeName} doesn't have coordinates configured yet, so location can't be verified. Contact your administrator.</p>
    </div>
  `;
}

// ---------------------------------------------------------
// EMPLOYEE: Home
// ---------------------------------------------------------
let presenceTimer = null;

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 17) return "Good Afternoon,";
  return "Good Evening,";
}

async function renderEmployeeHome() {
  clearInterval(presenceTimer);
  const { employee, store } = ctx;
  if (!store) { renderNoStoreScreen(); return; }

  employeeMain.innerHTML = `<div class="empty-state">Loading today's status...</div>`;
  let state;
  try {
    state = await getTodayState(employee.id);
  } catch (err) {
    employeeMain.innerHTML = `<div class="empty-state">Couldn't load today's status: ${err.message}</div>`;
    return;
  }

  if (state.status === "NOT_CHECKED_IN") {
    employeeMain.innerHTML = `
      <div class="greeting">
        <div class="greeting__hi">${greetingPrefix()}</div>
        <div class="greeting__name">${employee.name}</div>
      </div>

      <div class="card store-row">
        <div class="store-row__icon">${ICONS.store}</div>
        <div>
          <div class="store-row__name">${store.name}</div>
          <div class="store-row__code">${store.code}</div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="status-badge-row" style="margin-bottom:0;">
          <span style="font-weight:700; font-size:14.5px;">Today's Status</span>
          <span class="badge badge--danger">Not Checked In</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block btn-lg" id="btn-punch-in">${ICONS.scan} VERIFY &amp; PUNCH IN</button>
      <a href="#/employee/account" class="login-hint" style="display:block; text-align:center; margin-top:16px;">Account Settings</a>
    `;
    employeeMain.querySelector("#btn-punch-in").addEventListener("click", () => {
      window.location.hash = "#/employee/verify/in";
    });
    return;
  }

  if (state.status === "CHECKED_IN") {
    let punchInAt = state.punchInAt;

    const renderPresence = () => {
      const p = computePresence(punchInAt, null);
      const el = employeeMain.querySelector("#presence-value");
      if (el) el.textContent = p.label;
    };

    employeeMain.innerHTML = `
      <div class="status-badge-row">
        <div class="greeting">
          <div class="greeting__hi">${greetingPrefix()}</div>
          <div class="greeting__name">${employee.name}</div>
        </div>
        <span class="badge badge--success">${ICONS.check.replace('<svg ', '<svg style="width:11px;height:11px;" ')} Checked In</span>
      </div>

      <div class="stat-pair">
        <div class="stat-box">
          <div class="stat-box__icon" style="background:var(--color-success-bg); color:var(--color-success);">${ICONS.arrowRight}</div>
          <div class="stat-box__label">IN Time</div>
          <div class="stat-box__value">${formatTime(punchInAt)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-box__icon" style="background:var(--color-info-bg); color:var(--color-info);">${ICONS.clock}</div>
          <div class="stat-box__label">Current Presence</div>
          <div class="stat-box__value" id="presence-value">${state.presence.label}</div>
        </div>
      </div>

      <div class="card store-row">
        <div class="store-row__icon">${ICONS.store}</div>
        <div>
          <div class="store-row__name">${store.name}</div>
          <div class="store-row__code">${store.code}</div>
        </div>
      </div>

      <button class="btn btn-danger btn-block btn-lg" id="btn-punch-out">${ICONS.scan} PUNCH OUT</button>

      <div class="info-note">
        ${ICONS.info}
        <div>Your attendance will be calculated from first Punch In to final Punch Out.</div>
      </div>
      <a href="#/employee/account" class="login-hint" style="display:block; text-align:center; margin-top:16px;">Account Settings</a>
    `;

    presenceTimer = setInterval(renderPresence, 30000);

    employeeMain.querySelector("#btn-punch-out").addEventListener("click", () => {
      window.location.hash = "#/employee/verify/out";
    });
    return;
  }

  // CHECKED_OUT (completed for the day)
  employeeMain.innerHTML = `
    <div class="greeting">
      <div class="greeting__hi">${greetingPrefix()}</div>
      <div class="greeting__name">${employee.name}</div>
    </div>

    <div class="card card-pad" style="margin-bottom:20px;">
      <div class="status-badge-row" style="margin-bottom:0;">
        <span style="font-weight:700; font-size:14.5px;">Today's Status</span>
        <span class="badge ${statusBadgeClass(state.presence.status)}">${state.presence.status === "COMPLETED" ? "Completed" : "Short Hours"}</span>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-box">
        <div class="stat-box__label">IN Time</div>
        <div class="stat-box__value">${formatTime(state.punchInAt)}</div>
      </div>
      <div class="summary-box">
        <div class="stat-box__label">OUT Time</div>
        <div class="stat-box__value">${formatTime(state.punchOutAt)}</div>
      </div>
    </div>

    <div class="card store-row">
      <div class="store-row__icon">${ICONS.store}</div>
      <div>
        <div class="store-row__name">${store.name}</div>
        <div class="store-row__code">${store.code}</div>
      </div>
      <span class="badge badge--success store-row__badge">Total ${state.presence.label}</span>
    </div>

    <button class="btn btn-outline btn-block" id="btn-view-history">View Attendance History</button>
    <a href="#/employee/account" class="login-hint" style="display:block; text-align:center; margin-top:16px;">Account Settings</a>
  `;
  employeeMain.querySelector("#btn-view-history").addEventListener("click", () => {
    window.location.hash = "#/employee/history";
  });
}

// ---------------------------------------------------------
// EMPLOYEE: Verify & Punch (camera + GPS + real face match)
// ---------------------------------------------------------
function renderVerifyError(icon, title, message, { retryLabel = "Try Again" } = {}) {
  employeeMain.innerHTML = `
    <div class="att-header">
      <div class="att-header__icon" style="background:var(--color-danger-bg); color:var(--color-danger);">${icon}</div>
      <h2>${title}</h2>
      <p>${message}</p>
    </div>
    <button class="btn btn-outline btn-block btn-lg" id="btn-verify-retry">${retryLabel}</button>
    <button class="btn btn-ghost btn-block" id="btn-verify-cancel" style="margin-top:10px;">Back to Home</button>
  `;
  employeeMain.querySelector("#btn-verify-retry").addEventListener("click", () => renderVerify(currentVerifyAction));
  employeeMain.querySelector("#btn-verify-cancel").addEventListener("click", () => { window.location.hash = "#/employee/home"; });
}

let currentVerifyAction = "in";

async function renderVerify(action) {
  currentVerifyAction = action;
  const { employee, store, faceDescriptors } = ctx;
  if (!store) { renderNoStoreScreen(); return; }
  if (store.lat == null || store.lng == null) { renderStoreNotConfiguredScreen(store.name); return; }

  let state;
  try {
    state = await getTodayState(employee.id);
  } catch (err) {
    renderVerifyError(ICONS.alertTriangle, "Couldn't Load Status", err.message);
    return;
  }

  if (action === "in" && state.status !== "NOT_CHECKED_IN") {
    showToast("Already Checked In", "error");
    window.location.hash = "#/employee/home";
    return;
  }
  if (action === "out" && state.status !== "CHECKED_IN") {
    showToast("Please Punch In first", "error");
    window.location.hash = "#/employee/home";
    return;
  }

  employeeMain.innerHTML = `
    <div class="att-header">
      <h2>Mark Your Attendance</h2>
      <p>Look at the camera and stay still.</p>
    </div>

    <div class="camera-frame" id="camera-frame">
      <video id="camera-video" muted playsinline></video>
      <div class="camera-frame__corners">
        <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div><div class="corner corner-br"></div>
      </div>
    </div>

    <div class="camera-status" id="camera-status"><span class="spinner"></span> <span id="camera-status-text">Loading face model...</span></div>
    <p class="camera-hint">Make sure you are in good lighting</p>
  `;

  const video = document.getElementById("camera-video");
  const statusText = document.getElementById("camera-status-text");

  try {
    await loadFaceModels();
    await startCamera(video);
  } catch (err) {
    stopCamera();
    if (err.type === "denied") {
      renderVerifyError(ICONS.camera, "Camera Permission Required",
        "Please allow camera access in your browser settings, then try again.");
    } else if (err.type === "no-camera") {
      renderVerifyError(ICONS.camera, "No Camera Found",
        "We couldn't find a camera on this device. Contact your administrator.");
    } else {
      renderVerifyError(ICONS.camera, "Camera Unavailable",
        err.message || "Unable to access the camera on this device.");
    }
    return;
  }

  statusText.textContent = "Detecting face...";

  let recognition;
  try {
    recognition = await verifyAgainstEmployee(video, faceDescriptors);
  } catch (err) {
    stopCamera();
    if (err.type === FACE_ERRORS.NO_FACE) {
      renderVerifyError(ICONS.alertTriangle, "Face Not Detected", "Please position your face inside the frame.");
    } else if (err.type === FACE_ERRORS.MULTIPLE_FACES) {
      renderVerifyError(ICONS.alertTriangle, "Multiple Faces Detected", "Please ensure only one person is visible.");
    } else {
      renderVerifyError(ICONS.alertTriangle, "Face Detection Failed", err.message || "Please try again.");
    }
    return;
  }

  if (recognition.reason === "not-enrolled") {
    stopCamera();
    renderVerifyError(ICONS.scan, "No Face Profile Found",
      "Your account has no enrolled face data. Please contact your administrator.");
    return;
  }

  if (!recognition.matched) {
    stopCamera();
    renderVerifyError(ICONS.alertTriangle, "Face Not Recognized",
      "Please try again or contact your administrator.");
    return;
  }

  statusText.textContent = "Verifying your location...";

  let position;
  try {
    position = await getCurrentPosition();
  } catch (err) {
    stopCamera();
    if (err.type === "denied") {
      renderVerifyError(ICONS.mapPin, "Location Permission Required",
        "Please allow location access in your browser settings, then try again.");
    } else {
      renderVerifyError(ICONS.mapPin, "Location Unavailable", err.message);
    }
    return;
  }

  const geo = checkGeofence(position, store);

  if (!geo.accuracyOk) {
    stopCamera();
    renderVerifyError(ICONS.mapPin, "Location Accuracy Too Low",
      "Please enable high-accuracy location and try again.");
    return;
  }

  if (!geo.withinRadius) {
    stopCamera();
    renderVerifyError(ICONS.mapPin, "Location Verification Failed",
      `You're ${geo.distance}m from ${store.name}. Please ensure you are at the assigned store while punching in.`);
    return;
  }

  stopCamera();
  renderVerified(action, recognition, geo, position);
}

function renderVerified(action, recognition, geo, position) {
  const { employee, store } = ctx;
  const now = new Date();
  const isIn = action === "in";

  employeeMain.innerHTML = `
    <div class="card identity-card" style="margin-bottom:16px;">
      <div class="avatar avatar--lg">${employee.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</div>
      <div>
        <div class="identity-card__name">${employee.name}</div>
        <div class="identity-card__id">${employee.employee_code}</div>
      </div>
      <span class="badge badge--success identity-card__badge">${ICONS.check.replace('<svg ', '<svg style="width:11px;height:11px;" ')} Verified</span>
    </div>

    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="verify-grid">
        <div class="verify-item">
          <div class="verify-item__icon">${ICONS.store}</div>
          <div>
            <div class="verify-item__label">Store</div>
            <div class="verify-item__value">${store.name}</div>
          </div>
        </div>
        <div class="verify-item">
          <div class="verify-item__icon">${ICONS.mapPin}</div>
          <div>
            <div class="verify-item__label">Location</div>
            <div class="verify-item__value">Within ${geo.distance} m <span class="badge badge--success" style="padding:2px 8px;">Valid</span></div>
          </div>
        </div>
        <div class="verify-item">
          <div class="verify-item__icon">${ICONS.calendar}</div>
          <div>
            <div class="verify-item__label">Date</div>
            <div class="verify-item__value">${formatDateLong(now)}</div>
          </div>
        </div>
        <div class="verify-item">
          <div class="verify-item__icon">${ICONS.clock}</div>
          <div>
            <div class="verify-item__label">Time</div>
            <div class="verify-item__value">${formatTime(now)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="camera-status" id="verified-status" style="background:var(--color-info-bg); color:var(--color-info); border-color:var(--color-info-border);">
      <span class="spinner" style="border-color:var(--color-info-border); border-top-color:var(--color-info);"></span>
      <span>Saving your ${isIn ? "punch in" : "punch out"}...</span>
    </div>

    <div class="info-note">
      ${ICONS.info}
      <div><strong>Important</strong>Please ensure you are at the assigned store while punching ${isIn ? "in" : "out"}.</div>
    </div>
  `;

  const saveNow = async () => {
    const statusBox = employeeMain.querySelector("#verified-status");
    const meta = {
      distance: geo.distance,
      accuracy: geo.accuracy,
      faceConfidence: recognition.confidence,
      latitude: position.latitude,
      longitude: position.longitude
    };
    try {
      if (isIn) {
        await recordPunchIn(employee.id, store.id, meta);
        showToast("Punched In successfully", "success");
        window.location.hash = "#/employee/home";
      } else {
        await recordPunchOut(employee.id, store.id, meta);
        window.location.hash = "#/employee/success";
      }
    } catch (err) {
      statusBox.style.background = "var(--color-danger-bg)";
      statusBox.style.color = "var(--color-danger)";
      statusBox.style.borderColor = "var(--color-danger-border)";
      statusBox.innerHTML = `<span>${err.message || "Could not save your punch."}</span>`;
      let retryBtn = employeeMain.querySelector("#btn-punch-retry");
      if (!retryBtn) {
        retryBtn = document.createElement("button");
        retryBtn.id = "btn-punch-retry";
        retryBtn.className = "btn btn-outline btn-block btn-lg";
        retryBtn.style.marginTop = "14px";
        retryBtn.textContent = "Try Again";
        retryBtn.addEventListener("click", saveNow);
        statusBox.insertAdjacentElement("afterend", retryBtn);
      }
    }
  };

  // Auto-save immediately — no extra tap needed. The system already
  // knows whether this is a punch-in or punch-out from today's
  // attendance state, so verification alone is enough to act.
  saveNow();
}

async function renderPunchSuccess() {
  const { employee, store } = ctx;
  const state = await getTodayState(employee.id);
  if (state.status !== "CHECKED_OUT") {
    window.location.hash = "#/employee/home";
    return;
  }

  employeeMain.innerHTML = `
    <div class="success-screen">
      <div class="success-check">${ICONS.check}</div>
      <h2>Punched Out Successfully</h2>
      <p>Have a great day!</p>
    </div>

    <div class="summary-grid">
      <div class="summary-box">
        <div class="stat-box__label">IN</div>
        <div class="stat-box__value">${formatTime(state.punchInAt)}</div>
      </div>
      <div class="summary-box">
        <div class="stat-box__label">OUT</div>
        <div class="stat-box__value">${formatTime(state.punchOutAt)}</div>
      </div>
      <div class="summary-box">
        <div class="stat-box__label">Total Presence</div>
        <div class="stat-box__value">${state.presence.label}</div>
      </div>
      <div class="summary-box">
        <div class="stat-box__label">Status</div>
        <span class="badge ${statusBadgeClass(state.presence.status)}">${state.presence.status === "COMPLETED" ? "Completed" : "Short Hours"}</span>
      </div>
    </div>

    <div class="card store-row">
      <div class="store-row__icon">${ICONS.store}</div>
      <div>
        <div class="store-row__name">${store.name}</div>
        <div class="store-row__code">${store.code}</div>
      </div>
    </div>

    <button class="btn btn-outline btn-block" id="btn-back-home">${ICONS.home} Back to Home</button>
  `;
  employeeMain.querySelector("#btn-back-home").addEventListener("click", () => {
    window.location.hash = "#/employee/home";
  });
}

// ---------------------------------------------------------
// EMPLOYEE: Attendance History
// ---------------------------------------------------------
async function renderEmployeeHistory() {
  employeeMain.innerHTML = `<div class="empty-state">Loading your attendance history...</div>`;
  let rows;
  try {
    rows = await getAttendanceHistory(ctx.employee.id);
  } catch (err) {
    employeeMain.innerHTML = `<div class="empty-state">Couldn't load history: ${err.message}</div>`;
    return;
  }

  const tableRows = rows.map((h) => `
    <tr>
      <td>${h.date}</td>
      <td>${h.in}</td>
      <td>${h.out}</td>
      <td>${h.hours}</td>
      <td><span class="badge ${statusBadgeClass(h.status)}">${h.status}</span></td>
    </tr>`).join("");

  employeeMain.innerHTML = `
    <a href="#/employee/home" class="back-link">${ICONS.arrowLeft} Back to Home</a>
    <div class="history-toolbar">
      <div class="history-month">My Attendance</div>
    </div>
    <div class="card card-pad">
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Date</th><th>IN</th><th>OUT</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>${tableRows.length ? tableRows : `<tr><td colspan="5" class="text-muted">No attendance recorded yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------
// EMPLOYEE: Account Settings (self-service delete)
// ---------------------------------------------------------
function renderAccountPage() {
  const { employee } = ctx;
  employeeMain.innerHTML = `
    <a href="#/employee/home" class="back-link">${ICONS.arrowLeft} Back to Home</a>

    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="detail-item__label">Name</div>
      <div class="detail-item__value" style="margin-bottom:12px;">${employee.name}</div>
      <div class="detail-item__label">Employee ID</div>
      <div class="detail-item__value">${employee.employee_code}</div>
    </div>

    <div class="card card-pad" style="border-color:var(--color-danger-border);">
      <div class="card-title" style="color:var(--color-danger); margin-bottom:10px;">Delete My Account</div>
      <p class="text-muted" style="font-size:13px; margin-bottom:16px;">
        This permanently deletes your login, employee record, store assignment, face profile,
        and full attendance history. This cannot be undone.
      </p>
      <button class="btn btn-danger btn-block" id="btn-delete-account">Delete My Account Permanently</button>
      <div id="delete-account-panel"></div>
    </div>
  `;

  employeeMain.querySelector("#btn-delete-account").addEventListener("click", () => {
    const panel = employeeMain.querySelector("#delete-account-panel");
    panel.innerHTML = `
      <div class="login-error show" style="margin-top:16px;">
        Are you absolutely sure? Type <strong>DELETE</strong> below to confirm.
      </div>
      <input id="delete-account-input" type="text" placeholder="Type DELETE to confirm" style="width:100%; padding:10px 12px; border:1px solid var(--border-strong); border-radius:8px; margin-bottom:10px;" />
      <button class="btn btn-danger btn-block" id="btn-delete-account-confirm">Confirm Permanent Delete</button>
    `;
    panel.querySelector("#btn-delete-account-confirm").addEventListener("click", async () => {
      if (panel.querySelector("#delete-account-input").value.trim() !== "DELETE") {
        showToast('Type "DELETE" exactly to confirm.', "error");
        return;
      }
      const btn = panel.querySelector("#btn-delete-account-confirm");
      btn.disabled = true;
      btn.textContent = "Deleting...";
      const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error || data?.error) {
        showToast(data?.error || error.message || "Could not delete your account.", "error");
        btn.disabled = false;
        btn.textContent = "Confirm Permanent Delete";
        return;
      }
      clearContext();
      showToast("Your account has been deleted.", "info");
      window.location.hash = "#/login";
    });
  });
}

// ---------------------------------------------------------
// ROUTER
// ---------------------------------------------------------
async function handleRoute() {
  const hash = window.location.hash || "#/login";
  const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);
  const [section, ...rest] = parts;

  if (section === "register") {
    showTopLevel("register");
    document.querySelector('#view-register .icon-btn').innerHTML = ICONS.arrowLeft;
    renderRegisterStart(registerMain);
    return;
  }

  if (section === "employee") {
    const c = await ensureContext();
    if (!c || c.role !== "employee") {
      window.location.hash = "#/login";
      return;
    }
    showTopLevel("employee");

    if (c.status === "pending") { renderPendingScreen(); return; }
    if (c.status === "inactive") { renderInactiveScreen(); return; }
    if (c.status === "not-found") {
      employeeMain.innerHTML = `<div class="empty-state">We couldn't find your employee record. Contact your administrator.</div>`;
      return;
    }

    const sub = rest[0] || "home";
    if (sub === "home") renderEmployeeHome();
    else if (sub === "verify") renderVerify(rest[1] || "in");
    else if (sub === "success") renderPunchSuccess();
    else if (sub === "history") renderEmployeeHistory();
    else if (sub === "account") renderAccountPage();
    else renderEmployeeHome();
    return;
  }

  if (section === "admin") {
    const c = await ensureContext();
    if (!c || c.role !== "admin") {
      window.location.hash = "#/login";
      return;
    }
    document.getElementById("admin-name").textContent = c.email || "Admin";
    document.getElementById("admin-avatar").textContent = (c.email || "A").slice(0, 2).toUpperCase();
    showTopLevel("admin");
    const sub = rest[0] || "dashboard";
    setActiveNav(sub);
    if (sub !== "live-attendance") teardownLiveAttendance();

    if (sub === "dashboard") renderDashboard(adminMain);
    else if (sub === "approvals") renderApprovals(adminMain);
    else if (sub === "live-attendance") renderLiveAttendance(adminMain);
    else if (sub === "employees") {
      if (rest[1]) renderEmployeeDetail(adminMain, rest[1]);
      else renderEmployeeList(adminMain);
    }
    else if (sub === "stores") renderStores(adminMain);
    else if (sub === "attendance") renderAttendanceSection(adminMain, rest[1] || "daily");
    else if (sub === "reports") renderReports(adminMain);
    else if (sub === "face-management") renderFaceManagement(adminMain);
    else if (sub === "settings") renderSettings(adminMain);
    else renderDashboard(adminMain);
    return;
  }

  // default: login
  showTopLevel("login");
}

// ---------------------------------------------------------
// INIT
// ---------------------------------------------------------
function init() {
  initLogin();
  initEmployeeChrome();
  initAdminChrome();
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

init();
