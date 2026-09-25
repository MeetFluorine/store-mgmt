// =========================================================
// Face enrollment
// Captures Front / Slight Left / Slight Right descriptors with
// face-api.js and persists them to Supabase `face_profiles` as
// real embeddings (never raw photographs).
// =========================================================
import { supabase } from "../supabaseClient.js";
import { captureFaceDescriptor, descriptorDistance } from "./face-utils.js";

export const ENROLLMENT_ANGLES = ["Front", "Slight Left", "Slight Right"];

// Samples further apart than this suggest a bad capture (movement,
// lighting change, or someone else stepping in mid-sequence).
const MAX_INTRA_SAMPLE_DISTANCE = 0.6;

export function createEmptyEnrollmentSession() {
  return { samples: [], complete: false };
}

/**
 * Captures one angle's descriptor from the current video frame.
 * Throws the same typed errors as captureFaceDescriptor (no-face /
 * multiple-faces) so the UI can show the same messages used during
 * punch verification.
 */
export async function captureEnrollmentSample(videoEl) {
  const { descriptor, detectionScore } = await captureFaceDescriptor(videoEl);
  return { descriptor, detectionScore, capturedAt: Date.now() };
}

/**
 * Cross-checks all captured samples against each other. Returns
 * { consistent, maxDistance }. Call this once all angles are in,
 * before saving — catches "the last capture wasn't really the
 * same person/position" without needing a second model.
 */
export function checkSampleConsistency(samples) {
  let maxDistance = 0;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const d = descriptorDistance(samples[i].descriptor, samples[j].descriptor);
      if (d > maxDistance) maxDistance = d;
    }
  }
  return { consistent: maxDistance <= MAX_INTRA_SAMPLE_DISTANCE, maxDistance };
}

/**
 * Persists the captured samples as one face_profiles row.
 * `embedding` stores all samples (one descriptor per enrolled
 * angle) so verification can match against the closest one.
 */
export async function saveFaceProfile(employeeId, samples) {
  const { error } = await supabase.from("face_profiles").insert({
    employee_id: employeeId,
    embedding: samples.map((s) => s.descriptor),
    model_version: "face-api-tiny-v1",
    status: "active"
  });
  if (error) throw error;
  return true;
}
