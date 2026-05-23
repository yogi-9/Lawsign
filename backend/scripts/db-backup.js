'use strict';

/**
 * scripts/db-backup.js
 * JSON-based backup script for LawSign.
 *
 * Usage:
 *   node scripts/db-backup.js                           — backup all collections
 *   node scripts/db-backup.js --collections users,documents  — backup specific collections
 *
 * Output:
 *   Creates backups/YYYY-MM-DD_HH-mm/ with:
 *     • <collectionName>.json for each collection
 *     • metadata.json with backup info
 *
 * Exit codes:
 *   0 — backup successful
 *   1 — backup failed
 *
 * @module scripts/db-backup
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const DEFAULT_COLLECTIONS = ['users', 'documents', 'signatures', 'auditlogs'];
const BACKUPS_ROOT = path.resolve(__dirname, '..', 'backups');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Generates a timestamp string for directory naming.
 * @returns {string} YYYY-MM-DD_HH-mm
 */
function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    '-',
    pad(now.getMonth() + 1),
    '-',
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    '-',
    pad(now.getMinutes()),
  ].join('');
}

/**
 * Parse --collections flag from CLI arguments.
 * @returns {string[]}
 */
function parseCollections() {
  const idx = process.argv.indexOf('--collections');
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return DEFAULT_COLLECTIONS;
  }

  const raw = process.argv[idx + 1];
  const requested = raw.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);

  if (requested.length === 0) {
    console.warn('⚠️  --collections flag provided but no collection names given. Using defaults.');
    return DEFAULT_COLLECTIONS;
  }

  return requested;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function backup() {
  const collections = parseCollections();
  const ts = timestamp();
  const backupDir = path.join(BACKUPS_ROOT, ts);

  console.log('');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  💾  LawSign — Database Backup                          │');
  console.log('└──────────────────────────────────────────────────────────┘');
  console.log('');

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/LawSign';

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error(`❌ Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  const db = mongoose.connection.db;
  const dbName = db.databaseName;

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Backup directory: ${backupDir}\n`);

  const metadata = {
    timestamp: new Date().toISOString(),
    database: dbName,
    mongoUri: uri.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@'), // redact creds
    collections: {},
  };

  let totalDocs = 0;
  let totalBytes = 0;

  console.log('  Exporting collections:');
  console.log('  ' + '─'.repeat(50));

  for (const colName of collections) {
    const start = Date.now();

    try {
      const docs = await db.collection(colName).find({}).toArray();
      const json = JSON.stringify(docs, null, 2);
      const filePath = path.join(backupDir, `${colName}.json`);

      fs.writeFileSync(filePath, json, 'utf-8');

      const fileSize = Buffer.byteLength(json, 'utf-8');
      const elapsed = Date.now() - start;

      totalDocs += docs.length;
      totalBytes += fileSize;

      metadata.collections[colName] = {
        documentCount: docs.length,
        fileSize,
        exportedAt: new Date().toISOString(),
      };

      console.log(
        `  ✅ ${colName.padEnd(16)} ${String(docs.length).padStart(6)} docs   ${formatBytes(fileSize).padStart(10)}   ${elapsed}ms`,
      );
    } catch (err) {
      console.error(`  ❌ ${colName.padEnd(16)} FAILED: ${err.message}`);
      metadata.collections[colName] = { error: err.message };
    }
  }

  // Write metadata
  const metadataPath = path.join(backupDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  console.log('  ' + '─'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Collections : ${collections.length}`);
  console.log(`   Documents   : ${totalDocs}`);
  console.log(`   Total size  : ${formatBytes(totalBytes)}`);
  console.log(`   Location    : ${backupDir}`);

  await mongoose.disconnect();

  console.log('\n✅ Backup complete.\n');
  process.exit(0);
}

backup().catch((err) => {
  console.error(`\n❌ Backup failed: ${err.message}`);
  process.exit(1);
});
