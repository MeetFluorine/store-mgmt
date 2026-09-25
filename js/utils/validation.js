// =========================================================
// Validation helpers
// =========================================================

export function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidMobile(value) {
  return /^[+]?[\d\s-]{10,15}$/.test(value.trim());
}

export function isValidLatLng(lat, lng) {
  const la = Number(lat), ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
}
