// =========================================================
// Face model loader
// Loads face-api.js (vendored at assets/vendor/face-api.min.js,
// exposed as window.faceapi) and its model weights from
// /models/face — everything runs locally in the browser, no
// camera frame is ever uploaded anywhere.
// =========================================================

let loadingPromise = null;
let ready = false;

export function isModelReady() {
  return ready;
}

export async function loadFaceModels() {
  if (ready) return true;
  if (loadingPromise) return loadingPromise;

  if (!window.faceapi) {
    throw new Error("face-api.js did not load (assets/vendor/face-api.min.js missing?)");
  }

  const MODEL_URL = "models/face";
  loadingPromise = Promise.all([
    window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]).then(() => {
    ready = true;
    return true;
  });

  return loadingPromise;
}
