// backend/utils/constants.js
// System-wide constants: roles, statuses, GPS modes, and alert definitions/thresholds.
// Centralising these avoids magic strings scattered across models/services/controllers.
// Assumes dotenv has already been loaded by the entry point (server.js / migrate.js / seed.js).

// ─── User Roles ────────────────────────────────────────────────────
const ROLES = Object.freeze({
  MANAGER: 'manager',
  DRIVER: 'driver',
});

// ─── Persisted record status (trucks.status / drivers.status columns) ──
const RECORD_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',       // trucks only
  DECOMMISSIONED: 'decommissioned', // trucks only
});

// ─── Trip lifecycle ──────────────────────────────────────────────────
const TRIP_STATUS = Object.freeze({
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

// ─── Live truck state ────────────────────────────────────────────────
// Computed, not stored: the dashboard status pill (StatusBadge.jsx).
// Derived from latest GPS point + active trip + unacknowledged alerts.
const TRUCK_LIVE_STATE = Object.freeze({
  ACTIVE: 'active',   // on an active trip, moving
  PARKED: 'parked',   // checked in, engine off, no trip
  ALERT: 'alert',     // 1+ unacknowledged alerts (overlays the states above)
  OFFLINE: 'offline', // no GPS signal beyond the expected ping interval
});

// ─── GPS tracking modes (README §2) ──────────────────────────────────
// Drives expected ping cadence; gps.service.js uses this to flag trackers
// that have gone quiet longer than their mode allows.
const GPS_MODE = Object.freeze({
  ACTIVE_TRIP: 'active_trip',
  ENGINE_ON_IDLE: 'engine_on_idle',
  PARKED_HEARTBEAT: 'parked_heartbeat',
  OFFLINE_BUFFER: 'offline_buffer',
});

const GPS_PING_INTERVAL_SECONDS = Object.freeze({
  [GPS_MODE.ACTIVE_TRIP]: 10,        // README §9: 10s in trip
  [GPS_MODE.ENGINE_ON_IDLE]: 120,    // README §9: 120s idle
  [GPS_MODE.PARKED_HEARTBEAT]: 1800, // README §9: 1800s parked
  // OFFLINE_BUFFER has no cadence — points are stored on-device until reconnect.
});

// ─── Alert severities & channels ─────────────────────────────────────
const SEVERITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

const CHANNEL = Object.freeze({
  SMS: 'sms',
  PUSH: 'push',
  EMAIL: 'email',
  DASHBOARD: 'dashboard',
});

// ─── Alert type definitions (README §10 "Alert Rules") ───────────────
// alert.service.js looks these up by id to get severity, channels, and
// the default message — one source of truth instead of hardcoding per rule.
const ALERT_TYPES = Object.freeze({
  UNAUTHORISED_MOVEMENT: {
    id: 'UNAUTHORISED_MOVEMENT',
    severity: SEVERITY.CRITICAL,
    channels: [CHANNEL.SMS, CHANNEL.PUSH],
    message: 'Engine ignition detected with no active driver check-in',
  },
  POSSIBLE_THEFT: {
    id: 'POSSIBLE_THEFT',
    severity: SEVERITY.CRITICAL,
    channels: [CHANNEL.SMS, CHANNEL.PUSH, CHANNEL.EMAIL],
    message: 'Movement detected during night hours with no active check-in',
  },
  FUEL_DROP_STATIONARY: {
    id: 'FUEL_DROP_STATIONARY',
    severity: SEVERITY.HIGH,
    channels: [CHANNEL.PUSH, CHANNEL.EMAIL],
    message: 'Fuel level dropped while truck was parked with engine off',
  },
  ROUTE_DEVIATION: {
    id: 'ROUTE_DEVIATION',
    severity: SEVERITY.MEDIUM,
    channels: [CHANNEL.PUSH],
    message: 'Truck has deviated from its assigned route',
  },
  GEOFENCE_BREACH: {
    id: 'GEOFENCE_BREACH',
    severity: SEVERITY.HIGH,
    channels: [CHANNEL.SMS, CHANNEL.PUSH],
    message: 'Truck has exited its defined operating zone',
  },
  CHECKIN_DISCREPANCY: {
    id: 'CHECKIN_DISCREPANCY',
    severity: SEVERITY.MEDIUM,
    channels: [CHANNEL.DASHBOARD],
    message: 'App check-in time and ignition time differ beyond tolerance',
  },
  ACTIVE_AFTER_SIGNOFF: {
    id: 'ACTIVE_AFTER_SIGNOFF',
    severity: SEVERITY.HIGH,
    channels: [CHANNEL.PUSH, CHANNEL.DASHBOARD],
    message: 'Driver checked out but engine is still running',
  },
  EXCESSIVE_IDLE: {
    id: 'EXCESSIVE_IDLE',
    severity: SEVERITY.LOW,
    channels: [CHANNEL.DASHBOARD],
    message: 'Engine has been on with no movement beyond the idle threshold',
  },
  LOW_FUEL: {
    id: 'LOW_FUEL',
    severity: SEVERITY.MEDIUM,
    channels: [CHANNEL.PUSH, CHANNEL.SMS],
    message: 'Fuel level has fallen below the configured threshold',
  },
});

// ─── Alert thresholds (README §6 .env.example + §10 rule table) ──────
// Read from env with the same defaults documented in .env.example, so
// behaviour stays sane even if a value is left unset.
const THRESHOLDS = Object.freeze({
  NIGHT_START_HOUR: parseInt(process.env.ALERT_NIGHT_START_HOUR, 10) || 22,
  NIGHT_END_HOUR: parseInt(process.env.ALERT_NIGHT_END_HOUR, 10) || 5,
  CHECKIN_TIME_TOLERANCE_MIN: parseInt(process.env.ALERT_CHECKIN_TIME_TOLERANCE_MIN, 10) || 10,
  DEVIATION_THRESHOLD_METRES: parseInt(process.env.ALERT_DEVIATION_THRESHOLD_METRES, 10) || 500,
  STOP_DETECTION_SECONDS: parseInt(process.env.ALERT_STOP_DETECTION_SECONDS, 10) || 300,
  IDLE_THRESHOLD_MINUTES: parseInt(process.env.ALERT_IDLE_THRESHOLD_MINUTES, 10) || 15,
  // Not in the original .env.example — new vars, defaults match README §10.
  FUEL_DROP_STATIONARY_PCT: parseFloat(process.env.ALERT_FUEL_DROP_THRESHOLD_PCT) || 5,
  LOW_FUEL_PCT: parseFloat(process.env.ALERT_LOW_FUEL_THRESHOLD_PCT) || 15,
});

module.exports = {
  ROLES,
  RECORD_STATUS,
  TRIP_STATUS,
  TRUCK_LIVE_STATE,
  GPS_MODE,
  GPS_PING_INTERVAL_SECONDS,
  SEVERITY,
  CHANNEL,
  ALERT_TYPES,
  THRESHOLDS,
};
