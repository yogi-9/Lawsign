'use strict';

/**
 * config/db.js
 * Production-grade MongoDB connection manager.
 *
 * Features:
 *  • Configurable connection pool (maxPoolSize, minPoolSize, maxIdleTimeMS)
 *  • Auto-retry with exponential backoff (1s → 2s → 4s)
 *  • Graceful shutdown on SIGINT / SIGTERM
 *  • Connection event listeners (connected, disconnected, error, reconnected)
 *  • Debug mode — logs all Mongoose queries when MONGO_DEBUG=true
 *  • getConnectionState() utility for health checks
 *  • Dev degraded mode — warns but doesn't exit on failure
 *  • Production — exits with code 1 on failure
 *
 * @module config/db
 */

const mongoose = require('mongoose');

// ── Mongoose global settings ───────────────────────────────────────────────────
mongoose.set('strictQuery', true);

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Read an integer from process.env, falling back to a default.
 * @param {string}  key          Environment variable name.
 * @param {number}  defaultVal   Fallback value.
 * @returns {number}
 */
const envInt = (key, defaultVal) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultVal;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultVal : parsed;
};

/**
 * Read a boolean from process.env, falling back to a default.
 * @param {string}  key          Environment variable name.
 * @param {boolean} defaultVal   Fallback value.
 * @returns {boolean}
 */
const envBool = (key, defaultVal) => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultVal;
  return raw.trim().toLowerCase() === 'true';
};

/**
 * Map of Mongoose readyState codes to human-readable strings.
 * @see https://mongoosejs.com/docs/api/connection.html#Connection.prototype.readyState
 */
const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

// ── Connection configuration ───────────────────────────────────────────────────

/** Maximum number of connection attempts before giving up. */
const MAX_RETRIES = 3;

/** Base delay in milliseconds — doubled on each retry (exponential backoff). */
const BASE_DELAY_MS = 1000;

/**
 * Build Mongoose connection options from environment variables.
 * Every option has a sensible default so the app works out of the box.
 *
 * @returns {import('mongoose').ConnectOptions}
 */
const buildConnectionOptions = () => ({
  maxPoolSize:               envInt('MONGO_MAX_POOL_SIZE', 10),
  minPoolSize:               envInt('MONGO_MIN_POOL_SIZE', 2),
  maxIdleTimeMS:             envInt('MONGO_MAX_IDLE_TIME_MS', 30000),
  connectTimeoutMS:          envInt('MONGO_CONNECT_TIMEOUT_MS', 10000),
  socketTimeoutMS:           envInt('MONGO_SOCKET_TIMEOUT_MS', 45000),
  serverSelectionTimeoutMS:  envInt('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
  heartbeatFrequencyMS:      envInt('MONGO_HEARTBEAT_FREQUENCY_MS', 10000),
  retryWrites:               envBool('MONGO_RETRY_WRITES', true),
});

// ── Connection event listeners ─────────────────────────────────────────────────

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB event  → connected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB event  → disconnected. Driver will auto-reconnect…');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB event  → reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB event  → error:', err.message);
});

// ── Debug mode ─────────────────────────────────────────────────────────────────

/**
 * When MONGO_DEBUG=true AND we are NOT in production, Mongoose will log every
 * query to the console.  Useful during local development.
 */
const enableDebugIfRequested = () => {
  const debugEnabled = envBool('MONGO_DEBUG', false);
  const isProd = process.env.NODE_ENV === 'production';

  if (debugEnabled && !isProd) {
    mongoose.set('debug', true);
    console.log('🔍 Mongoose debug logging enabled (MONGO_DEBUG=true)');
  } else if (debugEnabled && isProd) {
    console.warn('⚠️  MONGO_DEBUG=true is ignored in production for safety.');
  }
};

// ── Core: connectDB ────────────────────────────────────────────────────────────

/**
 * Connect to MongoDB with auto-retry and exponential backoff.
 *
 * - **Development** — if all retries fail the server starts in degraded mode
 *   (routes that hit the DB will return 500, but /api/v1/health still responds).
 * - **Production** — if all retries fail the process exits with code 1.
 *
 * @async
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  enableDebugIfRequested();

  const uri  = process.env.MONGO_URI;
  const opts = buildConnectionOptions();

  if (!uri) {
    console.error('\n❌ MONGO_URI is not defined in environment variables.');
    console.error('   Please set MONGO_URI in your .env file.\n');
    if (process.env.NODE_ENV === 'production') process.exit(1);
    console.warn('⚠️  DEGRADED MODE: Server will start WITHOUT database.\n');
    return;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(uri, opts);

      console.log(`✅ MongoDB connected → ${conn.connection.host} / ${conn.connection.name}`);
      console.log(`   Pool: ${opts.minPoolSize}–${opts.maxPoolSize} connections`);
      return; // success — stop retrying
    } catch (err) {
      console.error(`\n❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`);
      console.error(`   ${err.message}`);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1s → 2s → 4s
        console.log(`   Retrying in ${delay / 1000}s…\n`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  console.error('\n❌ MongoDB connection failed after all retries.');
  console.error('\n💡 To fix this, set a valid MONGO_URI in your .env file:');
  console.error('   Option A — MongoDB Atlas (free cloud):');
  console.error('     MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/LawSign');
  console.error('   Option B — Local MongoDB:');
  console.error('     Install from: https://www.mongodb.com/try/download/community');
  console.error('     MONGO_URI=mongodb://localhost:27017/LawSign\n');

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    console.error('🔴 Production — exiting (code 1).');
    process.exit(1);
  } else {
    console.warn('⚠️  DEGRADED MODE: Server will start WITHOUT database.');
    console.warn('   Routes that read/write data will fail with 500.');
    console.warn('   /api/v1/health will still respond ✅\n');
  }
};

// ── Graceful shutdown ──────────────────────────────────────────────────────────

/**
 * Close the Mongoose connection cleanly on process termination signals.
 * @param {string} signal  The signal that triggered shutdown.
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Closing MongoDB connection…`);
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully.');
  } catch (err) {
    console.error('❌ Error closing MongoDB connection:', err.message);
  }
  process.exit(0);
};

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ── Utility: getConnectionState ────────────────────────────────────────────────

/**
 * Returns the current MongoDB connection state.
 * Useful for health-check endpoints and monitoring dashboards.
 *
 * @returns {{ status: string, host: string|null, name: string|null, readyState: number }}
 */
const getConnectionState = () => {
  const { readyState, host, name } = mongoose.connection;

  return {
    status:     READY_STATE_LABELS[readyState] || 'unknown',
    host:       host || null,
    name:       name || null,
    readyState,
  };
};

// ── Exports ────────────────────────────────────────────────────────────────────
// Backward-compatible: `const connectDB = require('./config/db')` still works.
// New usage:            `const { getConnectionState } = require('./config/db')`
module.exports = connectDB;
module.exports.getConnectionState = getConnectionState;
