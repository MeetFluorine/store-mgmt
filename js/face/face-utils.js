// =========================================================
// Face utility helpers — real detection/embedding via face-api.js
// =========================================================

export const FACE_ERRORS = {
  NO_FACE: "no-face",
  MULTIPLE_FACES: "multiple-faces",
  LOW_CONFIDENCE: "low-confidence",
  UNKNOWN_FACE: "unknown-face"
};

const DETECTOR_OPTIONS = () => new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

/**
 * Runs detection + landmarks + descriptor extraction on the current
 * video frame. Throws { type: FACE_ERRORS.NO_FACE | MULTIPLE_FACES }
 * on a bad frame; otherwise resolves { descriptor, detectionScore }.
 */
export async function captureFaceDescriptor(videoEl) {
  const results = await window.faceapi
    .detectAllFaces(videoEl, DETECTOR_OPTIONS())
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (results.length === 0) {
    throw { type: FACE_ERRORS.NO_FACE, message: "Face not detected. Please position your face inside the frame." };
  }
  if (results.length > 1) {
    throw { type: FACE_ERRORS.MULTIPLE_FACES, message: "Please ensure only one person is visible." };
  }

  const [match] = results;
  return {
    descriptor: Array.from(match.descriptor), // plain array — JSON/Supabase-friendly
    detectionScore: match.detection.score
  };
}

/**
 * Euclidean distance between two descriptors (plain arrays or
 * Float32Arrays). Lower = more similar. face-api.js's own model is
 * typically tuned so ~0.6 is a reasonable same-person threshold.
 */
export function descriptorDistance(a, b) {
  return window.faceapi.euclideanDistance(a, b);
}

/**
 * Given a new descriptor and one or more previously enrolled
 * descriptors, returns the smallest distance found.
 */
export function bestDistance(candidate, enrolledDescriptors) {
  return Math.min(...enrolledDescriptors.map((d) => descriptorDistance(candidate, d)));
}
