// =========================================================
// Location capture — wraps navigator.geolocation
// =========================================================

/**
 * Resolves with { latitude, longitude, accuracy, timestamp }.
 * Rejects with a typed error: { type: 'denied' | 'unsupported' | 'timeout' | 'unknown', message }
 */
export function getCurrentPosition({ timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ type: "unsupported", message: "Geolocation is not supported on this device." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject({ type: "denied", message: "Location permission was denied." });
        } else if (err.code === err.TIMEOUT) {
          reject({ type: "timeout", message: "Location request timed out." });
        } else {
          reject({ type: "unknown", message: err.message || "Unable to determine location." });
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
