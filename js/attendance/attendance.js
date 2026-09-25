// =========================================================
// Attendance status → badge presentation
// =========================================================

export function statusBadgeClass(status) {
  switch (status) {
    case "Completed":
    case "COMPLETED":
    case "Verified":
    case "Active":
    case "ACTIVE":
      return "badge--success";
    case "Absent":
    case "ABSENT":
    case "Location Failed":
    case "LOCATION_FAILED":
    case "Face Failed":
    case "FACE_FAILED":
      return "badge--danger";
    case "Short Hours":
    case "SHORT_HOURS":
    case "Missing Out":
    case "MISSING_OUT":
      return "badge--warning";
    case "Present":
      return "badge--info";
    default:
      return "badge--neutral";
  }
}
