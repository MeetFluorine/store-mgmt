// =========================================================
// Camera access — device camera via getUserMedia
// Face processing itself (js/face/recognition.js) runs on the
// frames this module captures; nothing is uploaded anywhere.
// =========================================================

let activeStream = null;

/**
 * Starts the front camera and attaches it to the given <video> element.
 * Returns the MediaStream. Throws a typed error on failure:
 * { type: 'denied' | 'no-camera' | 'unsupported' | 'unknown', message }
 */
export async function startCamera(videoEl) {
  if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
    throw { type: "unsupported", message: "Camera access is not supported on this device." };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } },
      audio: false
    });
    activeStream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  } catch (err) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      throw { type: "denied", message: "Camera permission was denied." };
    }
    if (err.name === "NotFoundError") {
      throw { type: "no-camera", message: "No camera was found on this device." };
    }
    throw { type: "unknown", message: err.message || "Unable to access the camera." };
  }
}

export function stopCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
}
