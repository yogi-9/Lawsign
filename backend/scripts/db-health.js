'use strict';

/**
 * scripts/db-health.js
 * Comprehensive MongoDB health-check for the LawSign database.
 *
 * Usage:
 *   node scripts/db-health.js
 *
 * Reports:
 *   • Connection status (host, port, database name)
 *   • MongoDB server version
 *   • Collection document counts and storage sizes
 *   • Index verification for every expected index
 *   • Total database size
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * @module scripts/db-health
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// ── Expected indexes per collection ──────────────────────────────────────────
const EXPECTED_INDEXES = {
  users: ['_id_', 'email_1', 'plan_1'],
  documents: [
    '_id_',
    'userId_1',
    'processingStatus_1',
    'guestSessionId_1',
    'expiresAt_1',
    'userId_1_createdAt_-1',
  ],
  signatures: [
    '_id_',
    'userId_1',
    'guestSessionId_1',
    'expiresAt_1',
  ],
  auditlogs: [
    '_id_',
    'documentId_1',
    'action_1',
    'createdAt_-1',
    'userId_1_createdAt_-1',
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Draws a horizontal box line.
 * @param {number} width - inner width (excluding corners)
 * @param {'top'|'mid'|'bot'} position
 * @returns {string}
 */
function boxLine(width, position) {
  const chars = { top: ['┌', '┐'], mid: ['├', '┤'], bot: ['└', '┘'] };
  const [l, r] = chars[position];
  return `${l}${'─'.repeat(width)}${r}`;
}

/**
 * Pads a string inside a box row.
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function boxRow(text, width) {
  const padded = text.padEnd(width - 2);
  return `│ ${padded} │`;
}

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

// ── Main health check ────────────────────────────────────────────────────────
async function healthCheck() {
  const W = 62; // inner box width
  let hasWarnings = false;

  console.log('');
  console.log(boxLine(W, 'top'));
  console.log(boxRow('🏥  LawSign — Database Health Check', W));
  console.log(boxLine(W, 'bot'));
  console.log('');

  // ── 1. Connect ─────────────────────────────────────────────────────────────
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/LawSign';

  try {
    await mongoose.connect(uri);
  } catch (err) {
    console.error(`❌ Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  const db = mongoose.connection.db;
  const { host, port } = mongoose.connection;
  const dbName = db.databaseName;

  console.log(boxLine(W, 'top'));
  console.log(boxRow('📡  Connection', W));
  console.log(boxLine(W, 'mid'));
  console.log(boxRow(`Host     : ${host}`, W));
  console.log(boxRow(`Port     : ${port}`, W));
  console.log(boxRow(`Database : ${dbName}`, W));
  console.log(boxRow(`Status   : ✅ Connected`, W));
  console.log(boxLine(W, 'bot'));
  console.log('');

  // ── 2. Server version ──────────────────────────────────────────────────────
  try {
    const adminDb = db.admin();
    const serverInfo = await adminDb.serverInfo();

    console.log(boxLine(W, 'top'));
    console.log(boxRow('🖥️   Server Info', W));
    console.log(boxLine(W, 'mid'));
    console.log(boxRow(`MongoDB Version : ${serverInfo.version}`, W));
    console.log(boxLine(W, 'bot'));
    console.log('');
  } catch (err) {
    console.log(`⚠️  Could not retrieve server info: ${err.message}`);
    hasWarnings = true;
  }

  // ── 3. Collection stats ────────────────────────────────────────────────────
  console.log(boxLine(W, 'top'));
  console.log(boxRow('📦  Collections', W));
  console.log(boxLine(W, 'mid'));

  const expectedCollections = Object.keys(EXPECTED_INDEXES);
  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);
  let totalSize = 0;

  for (const colName of expectedCollections) {
    if (!existingCollections.includes(colName)) {
      console.log(boxRow(`  ⚠️  ${colName.padEnd(14)} — MISSING`, W));
      hasWarnings = true;
      continue;
    }

    try {
      const stats = await db.collection(colName).stats();
      const docCount = stats.count;
      const storageSize = stats.storageSize || 0;
      totalSize += storageSize;

      console.log(
        boxRow(
          `  ✅ ${colName.padEnd(14)} ${String(docCount).padStart(6)} docs   ${formatBytes(storageSize).padStart(12)}`,
          W,
        ),
      );
    } catch (err) {
      // stats() can fail if the collection exists but is empty in some drivers
      try {
        const count = await db.collection(colName).countDocuments();
        console.log(
          boxRow(`  ✅ ${colName.padEnd(14)} ${String(count).padStart(6)} docs   ${'N/A'.padStart(12)}`, W),
        );
      } catch {
        console.log(boxRow(`  ⚠️  ${colName.padEnd(14)} — error reading stats`, W));
        hasWarnings = true;
      }
    }
  }

  // Show any extra (unexpected) collections
  const extras = existingCollections.filter(
    (c) => !expectedCollections.includes(c) && !c.startsWith('system.'),
  );
  for (const extra of extras) {
    try {
      const count = await db.collection(extra).countDocuments();
      console.log(boxRow(`  ℹ️  ${extra.padEnd(14)} ${String(count).padStart(6)} docs   (extra)`, W));
    } catch {
      console.log(boxRow(`  ℹ️  ${extra.padEnd(14)}              (extra)`, W));
    }
  }

  console.log(boxLine(W, 'mid'));
  console.log(boxRow(`Total storage : ${formatBytes(totalSize)}`, W));
  console.log(boxLine(W, 'bot'));
  console.log('');

  // ── 4. Index verification ──────────────────────────────────────────────────
  console.log(boxLine(W, 'top'));
  console.log(boxRow('🔑  Index Verification', W));
  console.log(boxLine(W, 'mid'));

  for (const [colName, expectedIdxNames] of Object.entries(EXPECTED_INDEXES)) {
    if (!existingCollections.includes(colName)) {
      console.log(boxRow(`  ⚠️  ${colName} — collection missing, skipping`, W));
      hasWarnings = true;
      continue;
    }

    let indexes;
    try {
      indexes = await db.collection(colName).indexes();
    } catch {
      console.log(boxRow(`  ⚠️  ${colName} — could not list indexes`, W));
      hasWarnings = true;
      continue;
    }

    const existingNames = indexes.map((i) => i.name);

    let allFound = true;
    for (const expected of expectedIdxNames) {
      if (!existingNames.includes(expected)) {
        console.log(boxRow(`  ❌ ${colName}.${expected} — MISSING`, W));
        allFound = false;
        hasWarnings = true;
      }
    }

    if (allFound) {
      console.log(
        boxRow(`  ✅ ${colName.padEnd(14)} ${expectedIdxNames.length} / ${expectedIdxNames.length} indexes OK`, W),
      );
    }
  }

  console.log(boxLine(W, 'bot'));
  console.log('');

  // ── 5. Total database size ─────────────────────────────────────────────────
  try {
    const dbStats = await db.stats();
    console.log(boxLine(W, 'top'));
    console.log(boxRow('💾  Database Size', W));
    console.log(boxLine(W, 'mid'));
    console.log(boxRow(`Data size    : ${formatBytes(dbStats.dataSize || 0)}`, W));
    console.log(boxRow(`Storage size : ${formatBytes(dbStats.storageSize || 0)}`, W));
    console.log(boxRow(`Index size   : ${formatBytes(dbStats.indexSize || 0)}`, W));
    console.log(boxRow(`Total size   : ${formatBytes((dbStats.dataSize || 0) + (dbStats.indexSize || 0))}`, W));
    console.log(boxLine(W, 'bot'));
    console.log('');
  } catch (err) {
    console.log(`⚠️  Could not retrieve database size: ${err.message}`);
    hasWarnings = true;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  await mongoose.disconnect();

  if (hasWarnings) {
    console.log('⚠️  Health check completed with warnings.');
    process.exit(1);
  }

  console.log('✅ All health checks passed.\n');
  process.exit(0);
}

healthCheck().catch((err) => {
  console.error('❌ Health check failed unexpectedly:', err.message);
  process.exit(1);
});
