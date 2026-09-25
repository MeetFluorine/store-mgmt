// =========================================================
// Geofence validation
// =========================================================
import { haversineDistanceMeters } from "./distance.js";
import { APP_CONFIG } from "../config.js";

/**
 * Checks a captured position against a store's location.
 * Returns { withinRadius, distance, accuracyOk, accuracy }
 */
export function checkGeofence(position, store) {
  const distance = haversineDistanceMeters(
    position.latitude,
    position.longitude,
    store.lat,
    store.lng
  );
  const accuracyOk = position.accuracy <= APP_CONFIG.gpsAccuracyThresholdMeters;
  const withinRadius = distance <= (store.radius || APP_CONFIG.defaultGeofenceRadiusMeters);

  return {
    withinRadius,
    distance,
    accuracyOk,
    accuracy: Math.round(position.accuracy)
  };
}
