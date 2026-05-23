'use strict';

/**
 * scripts/db-restore.js
 * JSON-based restore script for LawSign.
 *
 * Usage:
 *   node scripts/db-restore.js backups/2026-05-22_10-30
 *   node scripts/db-restore.js backups/2026-05-22_10-30 --force
 *   node scripts/db-restore.js backups/2026-05-22_10-30 --collections users,documents
 *   node scripts/db-restore.js backups/2026-05-22_10-30 --force --collections users,documents
 *
 * Arguments:
 *   <backup-dir>               — path to the backup directory (required)
 *   --force                    — skip confirmation prompt
 *   --collections col1,col2    — restore only specific collections
 *
 * Exit codes:
 *   0 — restore successful
 *   1 — restore failed
 *
 * @module scripts/db-restore
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Prompts the user for confirmation via readline.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

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
 * Parse --collections flag from CLI arguments.
 * @returns {string[]|null} null means "all"
 */
function parseCollections() {
  const idx = process.argv.indexOf('--collections');
  if (idx === -1 || idx + 1 >= process.argv.length) return null;

  const raw = process.argv[idx + 1];
  return raw.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
}

/**
 * Resolve the backup directory from CLI arguments.
 * @returns {string}
 */
function resolveBackupDir() {
  // First non-flag argument after 'node' and script path
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  // Also skip the value after --collections
  const colIdx = process.argv.indexOf('--collections');
  const colValue = colIdx !== -1 && colIdx + 1 < process.argv.length ? process.argv[colIdx + 1] : null;
  const filtered = args.filter((a) => a !== colValue);

  if (filtered.length === 0) {
    console.error('❌ Usage: node scripts/db-restore.js <backup-directory> [--force] [--collections col1,col2]');
    process.exit(1);
  }

  const dir = path.resolve(filtered[0]);

  if (!fs.existsSync(dir)) {
    console.error(`❌ Backup directory not found: ${dir}`);
    process.exit(1);
  }

  return dir;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function restore() {
  const backupDir = resolveBackupDir();
  const isForce = process.argv.includes('--force');
  const filterCollections = parseCollections();

  console.log('');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  📥  LawSign — Database Restore                         │');
  console.log('└──────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`📁 Backup directory: ${backupDir}`);

  // ── Read metadata ──────────────────────────────────────────────────────────
  const metadataPath = path.join(backupDir, 'metadata.json');
  let metadata = null;

  if (fs.existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      console.log(`📋 Backup metadata:`);
      console.log(`   Timestamp : ${metadata.timestamp}`);
      console.log(`   Database  : ${metadata.database}`);

      if (metadata.collections) {
        console.log(`   Collections:`);
        for (const [col, info] of Object.entries(metadata.collections)) {
          if (info.documentCount !== undefined) {
            console.log(`     • ${col}: ${info.documentCount} documents`);
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️  Could not parse metadata.json: ${err.message}`);
    }
  } else {
    console.warn('⚠️  No metadata.json found. Proceeding with available .json files.');
  }

  console.log('');

  // ── Discover collection files ──────────────────────────────────────────────
  const jsonFiles = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.json') && f !== 'metadata.json')
    .map((f) => ({
      file: f,
      colName: f.replace('.json', ''),
      fullPath: path.join(backupDir, f),
    }));

  // Apply --collections filter
  const toRestore = filterCollections
    ? jsonFiles.filter((f) => filterCollections.includes(f.colName))
    : jsonFiles;

  if (toRestore.length === 0) {
    console.log('⚠️  No collection files to restore.');
    process.exit(0);
  }

  console.log(`📦 Collections to restore: ${toRestore.map((f) => f.colName).join(', ')}`);
  console.log('');

  // ── Confirmation ───────────────────────────────────────────────────────────
  if (!isForce) {
    console.log('⚠️  WARNING: This will DROP existing data in the collections above');
    console.log('   and replace it with backup data. This action cannot be undone.');
    console.log('');

    const ok = await confirm('   Are you sure you want to continue? (y/N): ');
    if (!ok) {
      console.log('\n🚫 Restore cancelled.');
      process.exit(0);
    }
    console.log('');
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/LawSign';

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error(`❌ Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  const db = mongoose.connection.db;

  // ── Restore each collection ────────────────────────────────────────────────
  console.log('\n  Restoring collections:');
  console.log('  ' + '─'.repeat(50));

  let totalDocs = 0;

  for (const { colName, fullPath } of toRestore) {
    const start = Date.now();

    try {
      // Read the JSON file
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const docs = JSON.parse(raw);

      if (!Array.isArray(docs)) {
        console.error(`  ❌ ${colName.padEnd(16)} — file does not contain a JSON array`);
        continue;
      }

      // Drop existing collection
      try {
        await db.collection(colName).drop();
      } catch (e) {
        // Collection might not exist — that's fine
      }

      // Insert documents (skip if empty)
      if (docs.length > 0) {
        await db.collection(colName).insertMany(docs);
      }

      const elapsed = Date.now() - start;
      totalDocs += docs.length;

      console.log(
        `  ✅ ${colName.padEnd(16)} ${String(docs.length).padStart(6)} docs   ${formatBytes(Buffer.byteLength(raw, 'utf-8')).padStart(10)}   ${elapsed}ms`,
      );
    } catch (err) {
      console.error(`  ❌ ${colName.padEnd(16)} FAILED: ${err.message}`);
    }
  }

  console.log('  ' + '─'.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Collections restored : ${toRestore.length}`);
  console.log(`   Total documents      : ${totalDocs}`);

  await mongoose.disconnect();

  console.log('\n✅ Restore complete.\n');
  process.exit(0);
}

restore().catch((err) => {
  console.error(`\n❌ Restore failed: ${err.message}`);
  process.exit(1);
});
