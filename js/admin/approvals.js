// =========================================================
// Admin — Pending Approvals
// The employee already chose their store at registration
// (requested_store_id). Admin's job here is just to review the
// person + their captured location and approve or reject — no
// separate store picker needed. Older registrations made before
// this change only have a free-text requested_store_name (no id);
// those get a one-off fallback picker so they can still be
// approved.
// =========================================================
import { supabase } from "../supabaseClient.js";
import { ICONS } from "../utils/icons.js";
import { showToast } from "../utils/notifications.js";

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

async function getAdminSession() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;
  if (user && user.app_metadata?.role === "admin") return user;
  return null;
}

export async function renderApprovals(container) {
  container.innerHTML = `<div class="empty-state">Checking admin session...</div>`;
  const adminUser = await getAdminSession();

  if (!adminUser) {
    renderAdminLoginGate(container);
    return;
  }

  await renderPendingList(container, adminUser);
}

function renderAdminLoginGate(container) {
  container.innerHTML = `
    <div class="page-header"><div><h1>Pending Approvals</h1><p>Sign in with your admin account to review registrations</p></div></div>
    <div class="card card-pad" style="max-width:420px;">
      <div id="approvals-login-error" class="login-error"></div>
      <form id="approvals-login-form">
        <div class="field-group">
          <label for="appr-email">Admin Email</label>
          <input id="appr-email" type="email" placeholder="admin@shadowfax.local" />
        </div>
        <div class="field-group">
          <label for="appr-pass">Password</label>
          <input id="appr-pass" type="password" placeholder="••••••••" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Sign In</button>
      </form>
    </div>
  `;

  const form = container.querySelector("#approvals-login-form");
  const errorBox = container.querySelector("#approvals-login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("show");
    const email = container.querySelector("#appr-email").value.trim();
    const password = container.querySelector("#appr-pass").value;

    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Signing in...";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorBox.textContent = error.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "Sign In";
      return;
    }
    if (data.user.app_metadata?.role !== "admin") {
      errorBox.textContent = "This account isn't marked as an admin.";
      errorBox.classList.add("show");
      await supabase.auth.signOut();
      btn.disabled = false;
      btn.textContent = "Sign In";
      return;
    }
    renderPendingList(container, data.user);
  });
}

async function renderPendingList(container, adminUser) {
  const [{ data: pending, error: pendErr }, { data: stores }] = await Promise.all([
    supabase.from("employees")
      .select("id, employee_code, name, mobile, created_at, requested_store_name, requested_store_id, registration_latitude, registration_longitude, registration_accuracy, stores:requested_store_id ( store_name, store_code, latitude, longitude )")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("stores").select("id, store_name, store_code").eq("status", "active").order("store_name")
  ]);

  if (pendErr) {
    container.innerHTML = `<div class="card card-pad">Error loading approvals: ${pendErr.message}</div>`;
    return;
  }

  const fallbackStoreOptions = (stores || []).map((s) => `<option value="${s.id}">${s.store_name} (${s.store_code})</option>`).join("");

  const rows = (pending || []).map((p) => {
    const hasLoc = p.registration_latitude != null && p.registration_longitude != null;
    const mapUrl = hasLoc ? `https://www.google.com/maps?q=${p.registration_latitude},${p.registration_longitude}` : null;
    const requestedStore = p.stores; // joined via requested_store_id, null for legacy rows
    const storeHasCoords = requestedStore && requestedStore.latitude != null && requestedStore.longitude != null;

    const storeCell = requestedStore
      ? `<div style="font-weight:600; font-size:12.5px;">${requestedStore.store_name}</div>
         <div class="text-muted" style="font-size:11px;">${requestedStore.store_code}</div>
         ${!storeHasCoords ? `<span class="badge badge--warning" style="margin-top:4px;">${ICONS.alertTriangle.replace('<svg ', '<svg style="width:10px;height:10px;" ')} No coordinates set</span>` : ""}`
      : p.requested_store_name
        ? `<div class="text-muted" style="font-size:12px; margin-bottom:6px;">"${p.requested_store_name}" (typed before dropdown existed)</div>
           <div class="select-field" style="width:200px;">
             <select data-store-select="${p.id}">
               <option value="">Assign a store...</option>
               ${fallbackStoreOptions}
             </select>
           </div>`
        : `<div class="select-field" style="width:200px;">
             <select data-store-select="${p.id}">
               <option value="">Assign a store...</option>
               ${fallbackStoreOptions}
             </select>
           </div>`;

    return `
    <tr data-row="${p.id}">
      <td>
        <div class="cell-employee">
          <div class="avatar avatar--sm">${initials(p.name)}</div>
          <div>
            <div class="cell-employee__name">${p.name}</div>
            <div class="cell-employee__sub">${p.employee_code}</div>
          </div>
        </div>
      </td>
      <td>${p.mobile || "—"}</td>
      <td>${storeCell}</td>
      <td>${new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
      <td>
        ${hasLoc
          ? `<a href="${mapUrl}" target="_blank" rel="noopener" class="badge badge--info" style="text-decoration:none;">${ICONS.mapPin.replace('<svg ', '<svg style="width:11px;height:11px;" ')} View on Map${p.registration_accuracy ? ` (±${Math.round(p.registration_accuracy)}m)` : ""}</a>`
          : `<span class="text-muted" style="font-size:12px;">Not captured</span>`
        }
      </td>
      <td style="display:flex; gap:6px;">
        <button class="btn btn-primary btn-sm" data-approve="${p.id}" data-has-store="${requestedStore ? "1" : "0"}">${ICONS.check.replace('<svg ', '<svg style="width:12px;height:12px;" ')} Approve</button>
        <button class="btn btn-ghost btn-sm" data-reject="${p.id}">Reject</button>
      </td>
    </tr>`;
  }).join("");

  container.innerHTML = `
    <div class="page-header">
      <div><h1>Pending Approvals</h1><p>Signed in as ${adminUser.email} · ${(pending || []).length} awaiting review</p></div>
      <button class="btn btn-ghost btn-sm" id="btn-admin-signout">Sign Out</button>
    </div>
    <div class="card card-pad">
      ${(pending || []).length === 0
        ? `<div class="empty-state">No pending registrations right now.</div>`
        : `<div class="table-wrap">
             <table class="data-table">
               <thead><tr><th>Employee</th><th>Mobile</th><th>Requested Store</th><th>Registered</th><th>Location</th><th>Action</th></tr></thead>
               <tbody>${rows}</tbody>
             </table>
           </div>`
      }
    </div>
  `;

  container.querySelector("#btn-admin-signout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    renderApprovals(container);
  });

  container.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-approve");
      const hasStore = btn.getAttribute("data-has-store") === "1";
      let storeId = null;

      if (hasStore) {
        const row = pending.find((p) => p.id === id);
        storeId = row.requested_store_id;
      } else {
        const select = container.querySelector(`[data-store-select="${id}"]`);
        storeId = select?.value;
        if (!storeId) {
          showToast("Pick a store before approving.", "error");
          return;
        }
      }

      btn.disabled = true;
      btn.textContent = "Approving...";
      try {
        const { error: updErr } = await supabase.from("employees").update({ status: "active" }).eq("id", id);
        if (updErr) throw updErr;
        const { error: mapErr } = await supabase.from("employee_store_mapping").insert({
          employee_id: id, store_id: storeId, status: "active"
        });
        if (mapErr) throw mapErr;
        showToast("Employee approved.", "success");
        renderPendingList(container, adminUser);
      } catch (err) {
        showToast(err.message || "Could not approve this employee.", "error");
        btn.disabled = false;
        btn.textContent = "Approve";
      }
    });
  });

  container.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-reject");
      btn.disabled = true;
      const { error } = await supabase.from("employees").update({ status: "inactive" }).eq("id", id);
      if (error) {
        showToast(error.message, "error");
        btn.disabled = false;
        return;
      }
      showToast("Registration rejected.", "info");
      renderPendingList(container, adminUser);
    });
  });
}
