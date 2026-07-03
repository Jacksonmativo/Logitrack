// backend/utils/timeHelpers.js
// Date formatting and time-comparison utilities for alert rules and reporting.
// Pure functions with sensible defaults matching the README's alert thresholds —
// callers (alert.service.js) should still pass explicit values from THRESHOLDS
// so behaviour stays driven by .env, not by the defaults baked in here.

/**
 * True if `date` falls within the "night" window, which wraps past midnight
 * (e.g. 22:00 -> 05:00). A naive `hour >= start && hour <= end` check breaks
 * for wrapping ranges, so both wrapping and non-wrapping cases are handled.
 */
function isWithinNightWindow(date, nightStartHour = 22, nightEndHour = 5) {
  const hour = new Date(date).getHours();

  if (nightStartHour === nightEndHour) return true; // full 24h window
  if (nightStartHour < nightEndHour) {
    return hour >= nightStartHour && hour < nightEndHour; // e.g. 01:00 -> 05:00
  }
  return hour >= nightStartHour || hour < nightEndHour; // e.g. 22:00 -> 05:00
}

/** Absolute difference between two timestamps, in minutes (direction-agnostic). */
function diffInMinutes(dateA, dateB) {
  return Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / (1000 * 60);
}

/** Absolute difference between two timestamps, in seconds (direction-agnostic). */
function diffInSeconds(dateA, dateB) {
  return Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / 1000;
}

/**
 * True if `date` is more than `minutes` in the past relative to `referenceDate`.
 * Direction-aware (unlike diffInMinutes) — a future `date` is never "older".
 * Used for EXCESSIVE_IDLE (engine on, no movement beyond threshold).
 */
function isOlderThanMinutes(date, minutes, referenceDate = new Date()) {
  const ageMs = new Date(referenceDate).getTime() - new Date(date).getTime();
  return ageMs > minutes * 60 * 1000;
}

/**
 * True if the time since `lastSeenAt` exceeds `expectedIntervalSeconds` — i.e.
 * the tracker has gone quiet longer than its GPS_MODE allows. Direction-aware.
 * Pass GPS_PING_INTERVAL_SECONDS[mode] from constants.js as the interval.
 */
function isStale(lastSeenAt, expectedIntervalSeconds, referenceDate = new Date()) {
  const ageSeconds = (new Date(referenceDate).getTime() - new Date(lastSeenAt).getTime()) / 1000;
  return ageSeconds > expectedIntervalSeconds;
}

/**
 * Human-readable duration between two timestamps, e.g. "2h 14m" or "45m".
 * Used for trip summaries and PDF/Excel report generation.
 */
function formatDuration(startDate, endDate = new Date()) {
  const totalMinutes = Math.floor(diffInMinutes(startDate, endDate));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

/**
 * Consistent display string for reports/SMS, e.g. "03 Jul 2026, 14:05".
 * Defaults to Africa/Nairobi (UTC+3, no DST) per the Kenyan operational context.
 */
function formatDateTime(date, timeZone = 'Africa/Nairobi') {
  return new Date(date).toLocaleString('en-KE', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * True if `date` parses to a valid timestamp that isn't unreasonably far in
 * the future. A cheap guard against malformed or spoofed tracker payloads
 * before they reach alert/deviation logic.
 */
function isPlausibleTimestamp(date, maxFutureSkewMinutes = 5) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  const skewMinutes = (parsed.getTime() - Date.now()) / (1000 * 60);
  return skewMinutes <= maxFutureSkewMinutes;
}

module.exports = {
  isWithinNightWindow,
  diffInMinutes,
  diffInSeconds,
  isOlderThanMinutes,
  isStale,
  formatDuration,
  formatDateTime,
  isPlausibleTimestamp,
};
