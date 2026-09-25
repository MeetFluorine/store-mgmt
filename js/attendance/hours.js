// =========================================================
// Hours / status calculation
// =========================================================
import { APP_CONFIG } from "../config.js";
import { formatDuration } from "../utils/date.js";

/**
 * Given punchIn (Date) and punchOut (Date|null), returns
 * { minutes, label, status } where status is one of:
 * ACTIVE, COMPLETED, SHORT_HOURS
 */
export function computePresence(punchIn, punchOut) {
  const end = punchOut || new Date();
  const minutes = Math.max(0, (end.getTime() - punchIn.getTime()) / 60000);
  const label = formatDuration(minutes);

  let status;
  if (!punchOut) {
    status = "ACTIVE";
  } else if (minutes >= APP_CONFIG.requiredAttendanceMinutes) {
    status = "COMPLETED";
  } else {
    status = "SHORT_HOURS";
  }

  return { minutes, label, status };
}

export const STATUS_LABELS = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  SHORT_HOURS: "Short Hours",
  ABSENT: "Absent",
  MISSING_OUT: "Missing Out",
  LOCATION_FAILED: "Location Failed",
  FACE_FAILED: "Face Failed"
};
