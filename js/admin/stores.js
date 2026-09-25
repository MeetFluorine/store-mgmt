// =========================================================
// Admin — Stores (real Supabase data)
// =========================================================
import { supabase } from "../supabaseClient.js";
import { ICONS } from "../utils/icons.js";
import { showToast } from "../utils/notifications.js";
import { getCurrentPosition } from "../gps/location.js";

export async function renderStores(container) {
  container.innerHTML = `<div class="empty-state">Loading stores...</div>`;

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, store_code, store_name, latitude, longitude, allowed_radius, status")
    .order("store_name");

  if (error) {
    container.innerHTML = `<div class="card card-pad">Couldn't load stores: ${error.message}</div>`;
    return;
  }

  const presentCounts = await Promise.all((stores || []).map(async (s) => {
    const { count } = await supabase.from("employee_store_mapping").select("id", { count: "exact", head: true }).eq("store_id", s.id).eq("status", "active");
    return count || 0;
  }));

  const cards = (stores || []).map((s, i) => `
    <div class="card store-card">
      <div class="store-card__top">
        <div>
          <div class="store-card__code">${s.store_code}</div>
          <div class="store-card__name">${s.store_name}</div>
        </div>
        <span class="badge ${s.status === "active" ? "badge--success" : "badge--neutral"}">${s.status}</span>
      </div>
      <div class="store-card__row"><span>Latitude</span><span>${s.latitude.toFixed(4)}</span></div>
      <div class="store-card__row"><span>Longitude</span><span>${s.longitude.toFixed(4)}</span></div>
      <div class="store-card__row"><span>Allowed Radius</span><span>${s.allowed_radius} m</span></div>
      <div class="store-card__row"><span>Employees Assigned</span><span>${presentCounts[i]}</span></div>
    </div>`).join("");

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Stores</h1>
        <p>${(stores || []).length} store${(stores || []).length === 1 ? "" : "s"} configured</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn-primary btn-sm" id="btn-add-store">${ICONS.plus} Add Store</button>
      </div>
    </div>
    <div id="add-store-panel"></div>
    <div class="store-card-grid">${cards || `<div class="empty-state">No stores yet.</div>`}</div>
  `;

  container.querySelector("#btn-add-store")?.addEventListener("click", () => {
    renderAddStoreForm(container.querySelector("#add-store-panel"), container);
  });
}

function renderAddStoreForm(panel, container) {
  panel.innerHTML = `
    <div class="card card-pad" style="max-width:480px; margin-bottom:20px;">
      <div class="card-header"><span class="card-title">Add Store</span></div>
      <div class="field-group">
        <label for="new-store-code">Store Code</label>
        <input id="new-store-code" type="text" placeholder="e.g. SDFX_TEST_LOC" style="text-transform:uppercase;" />
      </div>
      <div class="field-group">
        <label for="new-store-name">Store Name</label>
        <input id="new-store-name" type="text" placeholder="e.g. Test Location" />
      </div>
      <div style="display:flex; gap:10px; margin-bottom:14px;">
        <div class="field-group" style="flex:1; margin-bottom:0;">
          <label for="new-store-lat">Latitude</label>
          <input id="new-store-lat" type="text" placeholder="e.g. 28.4998" />
        </div>
        <div class="field-group" style="flex:1; margin-bottom:0;">
          <label for="new-store-lng">Longitude</label>
          <input id="new-store-lng" type="text" placeholder="e.g. 77.0762" />
        </div>
      </div>
      <button class="btn btn-outline btn-block" id="btn-get-location" style="margin-bottom:14px;">${ICONS.mapPin} Get Current Location</button>
      <div class="field-group">
        <label for="new-store-radius">Allowed Radius (meters)</label>
        <input id="new-store-radius" type="text" value="100" />
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" id="btn-save-store">Save Store</button>
        <button class="btn btn-ghost" id="btn-cancel-store">Cancel</button>
      </div>
    </div>
  `;

  panel.querySelector("#btn-get-location").addEventListener("click", async () => {
    const btn = panel.querySelector("#btn-get-location");
    btn.disabled = true;
    btn.textContent = "Getting location...";
    try {
      const pos = await getCurrentPosition();
      panel.querySelector("#new-store-lat").value = pos.latitude.toFixed(6);
      panel.querySelector("#new-store-lng").value = pos.longitude.toFixed(6);
      showToast(`Location captured (±${Math.round(pos.accuracy)}m)`, "success");
    } catch (err) {
      showToast(err.message || "Could not get your location.", "error");
    }
    btn.disabled = false;
    btn.innerHTML = `${ICONS.mapPin} Get Current Location`;
  });

  panel.querySelector("#btn-cancel-store").addEventListener("click", () => { panel.innerHTML = ""; });

  panel.querySelector("#btn-save-store").addEventListener("click", async () => {
    const code = panel.querySelector("#new-store-code").value.trim().toUpperCase();
    const name = panel.querySelector("#new-store-name").value.trim();
    const lat = parseFloat(panel.querySelector("#new-store-lat").value);
    const lng = parseFloat(panel.querySelector("#new-store-lng").value);
    const radius = parseInt(panel.querySelector("#new-store-radius").value, 10) || 100;

    if (!code || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      showToast("Fill in store code, name, and coordinates.", "error");
      return;
    }

    const btn = panel.querySelector("#btn-save-store");
    btn.disabled = true;
    btn.textContent = "Saving...";

    const { error } = await supabase.from("stores").insert({
      store_code: code, store_name: name, latitude: lat, longitude: lng, allowed_radius: radius, status: "active"
    });

    if (error) {
      showToast(error.message, "error");
      btn.disabled = false;
      btn.textContent = "Save Store";
      return;
    }

    showToast("Store added.", "success");
    panel.innerHTML = "";
    renderStores(container);
  });
}
