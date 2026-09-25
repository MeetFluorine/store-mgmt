// =========================================================
// Admin — Settings
// Reflects js/config.js. Phase 2: persist to a Supabase
// settings table instead of the static APP_CONFIG object.
// =========================================================
import { APP_CONFIG } from "../config.js";
import { ICONS } from "../utils/icons.js";
import { showToast } from "../utils/notifications.js";

export function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header"><div><h1>Settings</h1><p>Attendance rules applied across all stores</p></div></div>

    <div class="card card-pad" style="max-width:560px;">
      <div class="field-group">
        <label>Required Attendance Hours</label>
        <input type="text" value="${APP_CONFIG.requiredAttendanceMinutes / 60}" id="set-hours" />
      </div>
      <div class="field-group">
        <label>GPS Accuracy Threshold (meters)</label>
        <input type="text" value="${APP_CONFIG.gpsAccuracyThresholdMeters}" id="set-accuracy" />
      </div>
      <div class="field-group">
        <label>Default Geofence Radius (meters)</label>
        <input type="text" value="${APP_CONFIG.defaultGeofenceRadiusMeters}" id="set-radius" />
      </div>
      <div class="field-group">
        <label>Face Match Threshold (0–1)</label>
        <input type="text" value="${APP_CONFIG.faceMatchThreshold}" id="set-face" />
      </div>
      <div class="field-group">
        <label>Punch Cooldown (seconds)</label>
        <input type="text" value="${APP_CONFIG.punchCooldownSeconds}" id="set-cooldown" />
      </div>
      <button class="btn btn-primary" id="btn-save-settings">Save Changes</button>
    </div>
  `;

  container.querySelector("#btn-save-settings")?.addEventListener("click", () => {
    showToast("Settings will persist to Supabase once Phase 2 is wired up.", "info");
  });
}
