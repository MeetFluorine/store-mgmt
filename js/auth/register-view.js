// =========================================================
// Registration view — multi-step wizard (open self-registration)
// Step 1: Name + mobile + email + password (sign up + pending row)
// Step 2: Face enrollment (real face-api.js capture, 3 angles)
// Step 3: Done — pending admin approval
// =========================================================
import { ICONS } from "../utils/icons.js";
import { showToast } from "../utils/notifications.js";
import { signUpEmployee, createPendingEmployee, fetchActiveStores } from "./register.js";
import { getCurrentPosition } from "../gps/location.js";
import { loadFaceModels } from "../face/model-loader.js";
import { startCamera, stopCamera } from "../face/camera.js";
import { ENROLLMENT_ANGLES, captureEnrollmentSample, checkSampleConsistency, saveFaceProfile } from "../face/enrollment.js";
import { FACE_ERRORS } from "../face/face-utils.js";

const wizard = {
  employeeId: null,
  employeeCode: null,
  samples: []
};

function resetWizard() {
  wizard.employeeId = null;
  wizard.employeeCode = null;
  wizard.samples = [];
}

export async function renderRegisterStart(container) {
  resetWizard();
  container.innerHTML = `
    <div class="att-header">
      <div class="att-header__icon" style="background:var(--color-info-bg); color:var(--color-info);">${ICONS.userCheck}</div>
      <h2>Create Your Account</h2>
      <p>An admin will review and approve your access before you can punch in.</p>
    </div>

    <div id="register-error" class="login-error"></div>

    <form id="register-step1-form">
      <div class="field-group">
        <label for="reg-name">Full Name</label>
        <input id="reg-name" type="text" placeholder="e.g. Priya Nair" autocomplete="name" />
      </div>
      <div class="field-group">
        <label for="reg-code">Choose Your Employee ID</label>
        <input id="reg-code" type="text" placeholder="e.g. EMP101" autocomplete="off" style="text-transform:uppercase;" />
      </div>
      <div class="field-group">
        <label for="reg-mobile">Mobile Number</label>
        <input id="reg-mobile" type="tel" placeholder="e.g. 98765 43210" autocomplete="tel" />
      </div>
      <div class="field-group">
        <label for="reg-store">Your Store</label>
        <div class="select-field" style="width:100%;">
          <select id="reg-store" style="width:100%; border:none; background:transparent; outline:none; padding:4px 0;">
            <option value="">Loading stores...</option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <label for="reg-email">Email</label>
        <input id="reg-email" type="email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="field-group">
        <label for="reg-pass">Password</label>
        <input id="reg-pass" type="password" placeholder="At least 8 characters" autocomplete="new-password" />
      </div>
      <div class="field-group">
        <label for="reg-pass2">Confirm Password</label>
        <input id="reg-pass2" type="password" placeholder="Re-enter password" autocomplete="new-password" />
      </div>
      <button type="submit" class="btn btn-primary btn-block btn-lg">Continue</button>
    </form>
  `;

  const form = container.querySelector("#register-step1-form");
  const errorBox = container.querySelector("#register-error");
  const storeSelect = container.querySelector("#reg-store");

  try {
    const stores = await fetchActiveStores();
    storeSelect.innerHTML = `<option value="">Select your store...</option>` +
      stores.map((s) => `<option value="${s.id}">${s.store_name}</option>`).join("");
  } catch {
    storeSelect.innerHTML = `<option value="">Couldn't load stores — contact your admin</option>`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("show");

    const name = container.querySelector("#reg-name").value.trim();
    const employeeCode = container.querySelector("#reg-code").value.trim();
    const mobile = container.querySelector("#reg-mobile").value.trim();
    const requestedStoreId = container.querySelector("#reg-store").value;
    const email = container.querySelector("#reg-email").value.trim();
    const pass = container.querySelector("#reg-pass").value;
    const pass2 = container.querySelector("#reg-pass2").value;

    if (!name || !employeeCode || !mobile || !email || !requestedStoreId) return;
    if (pass.length < 8) {
      errorBox.textContent = "Password must be at least 8 characters.";
      errorBox.classList.add("show");
      return;
    }
    if (pass !== pass2) {
      errorBox.textContent = "Passwords don't match.";
      errorBox.classList.add("show");
      return;
    }

    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      submitBtn.textContent = "Capturing your location...";
      let location = null;
      try {
        location = await getCurrentPosition();
      } catch {
        // Location is best-effort context for the admin, not a
        // hard requirement — proceed without it if denied/unavailable.
      }

      submitBtn.textContent = "Creating account...";
      const { user } = await signUpEmployee(email, pass);
      if (!user) throw new Error("Sign-up did not return a user.");
      const employee = await createPendingEmployee({ authUserId: user.id, employeeCode, name, mobile, requestedStoreId, location });
      wizard.employeeId = employee.id;
      wizard.employeeCode = employee.employee_code;
      renderRegisterFace(container);
    } catch (err) {
      errorBox.textContent = err.message || "Could not create your account. Please try again.";
      errorBox.classList.add("show");
      submitBtn.disabled = false;
      submitBtn.textContent = "Continue";
    }
  });
}

async function renderRegisterFace(container) {
  wizard.samples = [];
  let angleIndex = 0;

  container.innerHTML = `
    <div class="att-header">
      <h2>Enroll Your Face</h2>
      <p>We'll capture 3 angles so recognition works reliably.</p>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:14px;" id="angle-progress"></div>
    <div class="camera-frame" id="camera-frame">
      <video id="reg-video" muted playsinline></video>
      <div class="camera-frame__corners">
        <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
        <div class="corner corner-bl"></div><div class="corner corner-br"></div>
      </div>
    </div>
    <div class="camera-status" id="camera-status"><span class="spinner"></span> <span id="camera-status-text">Loading face model...</span></div>
    <p class="camera-hint" id="angle-hint">Make sure you are in good lighting</p>
    <button class="btn btn-primary btn-block btn-lg" id="btn-capture-angle" style="margin-top:14px;" disabled>Capture</button>
  `;

  function renderProgress() {
    container.querySelector("#angle-progress").innerHTML = ENROLLMENT_ANGLES.map((label, i) => `
      <div style="flex:1; text-align:center;">
        <div style="width:100%; height:6px; border-radius:4px; background:${i < wizard.samples.length ? "var(--color-success)" : "var(--border-default)"}; margin-bottom:6px;"></div>
        <div style="font-size:11px; color:${i < wizard.samples.length ? "var(--color-success)" : "var(--text-muted)"}; font-weight:600;">${label}</div>
      </div>`).join("");
  }
  renderProgress();

  const video = container.querySelector("#reg-video");
  const statusText = container.querySelector("#camera-status-text");
  const hint = container.querySelector("#angle-hint");
  const captureBtn = container.querySelector("#btn-capture-angle");

  try {
    await loadFaceModels();
    await startCamera(video);
  } catch (err) {
    container.innerHTML = `
      <div class="att-header">
        <div class="att-header__icon" style="background:var(--color-danger-bg); color:var(--color-danger);">${ICONS.camera}</div>
        <h2>Camera Unavailable</h2>
        <p>${err.message || "Please allow camera access and try again."}</p>
      </div>
      <button class="btn btn-outline btn-block btn-lg" id="btn-retry-cam">Try Again</button>
    `;
    container.querySelector("#btn-retry-cam").addEventListener("click", () => renderRegisterFace(container));
    return;
  }

  statusText.textContent = `Position for: ${ENROLLMENT_ANGLES[angleIndex]}`;
  hint.textContent = "Look straight at the camera";
  captureBtn.disabled = false;
  captureBtn.textContent = `Capture — ${ENROLLMENT_ANGLES[angleIndex]}`;

  captureBtn.addEventListener("click", async () => {
    captureBtn.disabled = true;
    statusText.textContent = "Capturing...";
    try {
      const sample = await captureEnrollmentSample(video);
      wizard.samples.push(sample);
      renderProgress();

      if (wizard.samples.length < ENROLLMENT_ANGLES.length) {
        angleIndex++;
        statusText.textContent = `Position for: ${ENROLLMENT_ANGLES[angleIndex]}`;
        hint.textContent = angleIndex === 1 ? "Turn your head slightly left" : "Turn your head slightly right";
        captureBtn.textContent = `Capture — ${ENROLLMENT_ANGLES[angleIndex]}`;
        captureBtn.disabled = false;
        return;
      }

      const { consistent } = checkSampleConsistency(wizard.samples);
      if (!consistent) {
        stopCamera();
        container.innerHTML = `
          <div class="att-header">
            <div class="att-header__icon" style="background:var(--color-warning-bg); color:var(--color-warning);">${ICONS.alertTriangle}</div>
            <h2>Captures Didn't Match Well</h2>
            <p>The three samples looked too different from each other. Let's try again with steady, even lighting.</p>
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="btn-redo">Retake</button>
        `;
        container.querySelector("#btn-redo").addEventListener("click", () => renderRegisterFace(container));
        return;
      }

      statusText.textContent = "Saving your face profile...";
      stopCamera();
      await saveFaceProfile(wizard.employeeId, wizard.samples);
      renderRegisterDone(container);
    } catch (err) {
      captureBtn.disabled = false;
      if (err.type === FACE_ERRORS.NO_FACE) {
        showToast("Face not detected. Please position your face inside the frame.", "error");
      } else if (err.type === FACE_ERRORS.MULTIPLE_FACES) {
        showToast("Please ensure only one person is visible.", "error");
      } else {
        showToast(err.message || "Could not save your face profile.", "error");
      }
    }
  });
}

function renderRegisterDone(container) {
  container.innerHTML = `
    <div class="success-screen">
      <div class="success-check" style="background:var(--color-warning); color:#fff;">${ICONS.clock}</div>
      <h2>Registration Submitted</h2>
      <p>Your Employee ID is <strong>${wizard.employeeCode}</strong>. An admin needs to review and approve your account — store assignment and activation happen on their side — before you can log in and punch.</p>
    </div>
    <button class="btn btn-primary btn-block btn-lg" id="btn-go-login">Back to Login</button>
  `;
  container.querySelector("#btn-go-login").addEventListener("click", () => {
    window.location.hash = "#/login";
  });
}
