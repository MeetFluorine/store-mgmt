// =========================================================
// Face recognition — real 1:1 verification
// Compares the live camera frame against the signed-in employee's
// own enrolled descriptors (fetched at login via auth/context.js).
// This is 1:1 verification ("is this really them?"), not 1:N
// search across all employees — the person is already identified
// by having logged in; the face check confirms it's really them.
// =========================================================
import { captureFaceDescriptor, bestDistance } from "./face-utils.js";
import { APP_CONFIG } from "../config.js";

/**
 * Throws the same typed errors as captureFaceDescriptor on a bad
 * frame (no-face / multiple-faces). Otherwise resolves:
 *   { matched: boolean, distance: number, confidence: number }
 */
export async function verifyAgainstEmployee(videoEl, enrolledDescriptors) {
  const { descriptor } = await captureFaceDescriptor(videoEl);

  if (!enrolledDescriptors || enrolledDescriptors.length === 0) {
    return { matched: false, distance: null, confidence: 0, reason: "not-enrolled" };
  }

  const distance = bestDistance(descriptor, enrolledDescriptors);
  const matched = distance <= APP_CONFIG.faceMatchThreshold;
  const confidence = Math.max(0, 1 - distance);

  return { matched, distance, confidence };
}
