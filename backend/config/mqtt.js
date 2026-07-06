// backend/config/mqtt.js
// MQTT broker client configuration. Connects once here and exports the raw
// client; actual topic subscriptions and payload parsing live in
// services/mqtt.service.js, matching how config/database.js only sets up
// the pool while models/ do the querying.

const mqtt = require('mqtt');
const logger = require('../utils/logger');

if (!process.env.MQTT_BROKER_URL) {
  throw new Error(
    'mqtt.js: missing required environment variable MQTT_BROKER_URL. Check your .env against .env.example.'
  );
}

if (!process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD) {
  logger.warn(
    'mqtt.js: connecting without MQTT_USERNAME/MQTT_PASSWORD — fine for local dev against a broker with anonymous access, but production should require auth.'
  );
}

const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'logitrack/trucks';

const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId: `logitrack-backend-${process.pid}-${Math.random().toString(16).slice(2, 8)}`,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  clean: true,
  keepalive: parseInt(process.env.MQTT_KEEPALIVE_SECONDS, 10) || 60,
  reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_MS, 10) || 1000,
  connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT_MS, 10) || 30000,
  rejectUnauthorized: process.env.MQTT_TLS_REJECT_UNAUTHORIZED !== 'false',
});

client.on('connect', () => {
  logger.info('MQTT client connected', { brokerUrl: process.env.MQTT_BROKER_URL });
});

client.on('reconnect', () => {
  logger.debug('MQTT client reconnecting...');
});

client.on('close', () => {
  logger.warn('MQTT client connection closed');
});

client.on('offline', () => {
  logger.warn('MQTT client is offline');
});

// Without this, an unhandled 'error' event crashes the process — same
// footgun as pg's pool.on('error') in database.js.
client.on('error', (err) => {
  logger.error('MQTT client error', { err });
});

/** Graceful shutdown — call from server.js on SIGTERM/SIGINT. */
function closeMqttClient() {
  return new Promise((resolve) => {
    client.end(false, {}, () => {
      logger.info('MQTT client disconnected');
      resolve();
    });
  });
}

module.exports = { client, TOPIC_PREFIX, closeMqttClient };
