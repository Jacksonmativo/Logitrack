// backend/utils/haversine.js
// Great-circle distance calculations between GPS coordinates (Haversine formula).
// Used by deviation.service.js (route deviation, stop detection) and gps.service.js
// (trip total distance).

const EARTH_RADIUS_METRES = 6371000; // mean Earth radius

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180
  );
}

/**
 * Great-circle distance between two points, in metres.
 * Throws RangeError on invalid/out-of-range coordinates — callers processing
 * raw tracker payloads should validate/catch rather than let bad GPS data
 * silently corrupt deviation or theft-alert calculations.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new RangeError(
      `haversineDistance received invalid coordinates: (${lat1}, ${lon1}) -> (${lat2}, ${lon2})`
    );
  }

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METRES * c; // divide by 1000 for km
}

/**
 * Convenience wrapper for { lat, lng } point objects — matches the GPS
 * payload shape from README §7.2 (mqtt_payload_format.md).
 */
function distanceBetweenPoints(pointA, pointB) {
  return haversineDistance(pointA.lat, pointA.lng, pointB.lat, pointB.lng);
}

/**
 * Sums consecutive distances along an ordered array of { lat, lng } points.
 * Used for computing trips.total_distance_km from a trip's GPS trail.
 */
function totalPathDistance(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceBetweenPoints(points[i - 1], points[i]);
  }
  return total;
}

/**
 * True if `point` is within `radiusMetres` of `center`.
 * Useful for simple circular checks (e.g. stop detection: has the truck
 * stayed within a small radius for N seconds) as opposed to the polygon
 * geofences handled in geofence.service.js.
 */
function isWithinRadius(center, point, radiusMetres) {
  return distanceBetweenPoints(center, point) <= radiusMetres;
}

module.exports = {
  haversineDistance,
  distanceBetweenPoints,
  totalPathDistance,
  isWithinRadius,
};
