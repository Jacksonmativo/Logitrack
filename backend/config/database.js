// backend/config/database.js
// PostgreSQL connection pool (pg). Exposes a query() helper with basic
// slow-query logging and a getClient() escape hatch for transactions
// (BEGIN / COMMIT / ROLLBACK — needed anywhere a trip/check-in update has
// to touch more than one table atomically).

const { Pool } = require('pg');
const logger = require('../utils/logger');

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `database.js: missing required environment variables: ${missing.join(', ')}. Check your .env against .env.example.`
  );
}

const SLOW_QUERY_MS = parseInt(process.env.DB_SLOW_QUERY_MS, 10) || 200;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 5000,
  // Managed Postgres (DigitalOcean, RDS, etc.) commonly needs SSL against a
  // cert chain Node won't trust by default. rejectUnauthorized: false trusts
  // the connection without validating that chain — fine to get moving, but
  // swap in the provider's CA bundle (ssl: { ca: fs.readFileSync(...) })
  // before this touches real production data.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// An idle client emitting 'error' (e.g. a connection the backend terminated)
// is NOT caught by try/catch around queries — without this listener it takes
// the whole Node process down. This is the #1 pg + Node footgun.
pool.on('error', (err) => {
  // Wrapped as { err } deliberately: pg's DatabaseError carries a `.client`
  // property with the full connection/socket internals attached. Passing
  // the raw error here gets it Object.assign-merged straight into the log
  // line; nesting it lets logger.js's Error-normalising format reduce it to
  // { message, stack, code } instead of dumping the whole client object.
  logger.error('Unexpected error on idle PostgreSQL client', { err });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected to pool');
});

/**
 * Runs a parameterised query and logs it if it's slow. Use this instead of
 * pool.query() directly from models/services so every query gets the same
 * instrumentation for free.
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const durationMs = Date.now() - start;
    if (durationMs > SLOW_QUERY_MS) {
      logger.warn('Slow query', { text, durationMs, rowCount: result.rowCount });
    }
    return result;
  } catch (err) {
    logger.error('Query failed', { text, err });
    throw err;
  }
}

/**
 * Checks out a dedicated client for multi-statement transactions. Caller is
 * responsible for client.release() when done — always in a finally block.
 */
function getClient() {
  return pool.connect();
}

/** Graceful shutdown — call from server.js on SIGTERM/SIGINT. */
async function closePool() {
  await pool.end();
  logger.info('PostgreSQL pool closed');
}

module.exports = { pool, query, getClient, closePool };
