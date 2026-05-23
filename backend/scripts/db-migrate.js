'use strict';

/**
 * scripts/db-migrate.js
 * Simple file-based migration framework for LawSign.
 *
 * Usage:
 *   node scripts/db-migrate.js              — run all pending migrations (same as --up)
 *   node scripts/db-migrate.js --up         — run all pending migrations
 *   node scripts/db-migrate.js --down       — rollback the last executed migration
 *   node scripts/db-migrate.js --status     — show migration status
 *
 * Migration files live in scripts/migrations/ and are loaded in alphabetical order.
 * Each file must export:
 *   { name: string, up: async (db) => void, down: async (db) => void }
 *
 * Executed migrations are tracked in the `_migrations` collection:
 *   { name: string, executedAt: Date }
 *
 * @module scripts/db-migrate
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_COLLECTION = '_migrations';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Loads all migration files sorted alphabetically.
 * @returns {Array<{ name: string, up: Function, down: Function, file: string }>}
 */
function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('⚠️  migrations/ directory not found. Nothing to migrate.');
    return [];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();

  return files.map((file) => {
    const migration = require(path.join(MIGRATIONS_DIR, file));

    if (!migration.name || typeof migration.up !== 'function' || typeof migration.down !== 'function') {
      throw new Error(`Invalid migration file: ${file}. Must export { name, up, down }.`);
    }

    return { ...migration, file };
  });
}

/**
 * Returns the set of already-executed migration names.
 * @param {import('mongodb').Db} db
 * @returns {Promise<Map<string, Date>>}
 */
async function getExecutedMigrations(db) {
  const docs = await db
    .collection(MIGRATIONS_COLLECTION)
    .find({})
    .sort({ executedAt: 1 })
    .toArray();

  const map = new Map();
  for (const doc of docs) {
    map.set(doc.name, doc.executedAt);
  }
  return map;
}

// ── Commands ─────────────────────────────────────────────────────────────────

/**
 * Run all pending (not yet executed) migrations.
 * @param {import('mongodb').Db} db
 */
async function runUp(db) {
  const allMigrations = loadMigrations();
  const executed = await getExecutedMigrations(db);

  const pending = allMigrations.filter((m) => !executed.has(m.name));

  if (pending.length === 0) {
    console.log('\n✅ No pending migrations. Database is up to date.');
    return;
  }

  console.log(`\n🚀 Running ${pending.length} pending migration(s)...\n`);

  for (const migration of pending) {
    const start = Date.now();
    console.log(`  ▶ ${migration.name} (${migration.file})`);

    try {
      await migration.up(db);

      await db.collection(MIGRATIONS_COLLECTION).insertOne({
        name: migration.name,
        executedAt: new Date(),
      });

      const elapsed = Date.now() - start;
      console.log(`  ✅ ${migration.name} — ${elapsed}ms\n`);
    } catch (err) {
      console.error(`  ❌ ${migration.name} FAILED: ${err.message}`);
      console.error('     Stopping migration run. Fix the error and retry.');
      process.exit(1);
    }
  }

  console.log(`✅ All ${pending.length} migration(s) executed successfully.`);
}

/**
 * Rollback the most recently executed migration.
 * @param {import('mongodb').Db} db
 */
async function runDown(db) {
  const allMigrations = loadMigrations();
  const executedDocs = await db
    .collection(MIGRATIONS_COLLECTION)
    .find({})
    .sort({ executedAt: -1 })
    .limit(1)
    .toArray();

  if (executedDocs.length === 0) {
    console.log('\n⚠️  No migrations to roll back.');
    return;
  }

  const lastExecuted = executedDocs[0];
  const migration = allMigrations.find((m) => m.name === lastExecuted.name);

  if (!migration) {
    console.error(`❌ Migration file for "${lastExecuted.name}" not found in migrations/ directory.`);
    process.exit(1);
  }

  console.log(`\n⏪ Rolling back: ${migration.name} (${migration.file})\n`);

  const start = Date.now();

  try {
    await migration.down(db);

    await db.collection(MIGRATIONS_COLLECTION).deleteOne({ name: migration.name });

    const elapsed = Date.now() - start;
    console.log(`  ✅ Rolled back ${migration.name} — ${elapsed}ms\n`);
  } catch (err) {
    console.error(`  ❌ Rollback of ${migration.name} FAILED: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Show the status of all known migrations.
 * @param {import('mongodb').Db} db
 */
async function showStatus(db) {
  const allMigrations = loadMigrations();
  const executed = await getExecutedMigrations(db);

  console.log('\n📋 Migration Status\n');
  console.log('  ' + '─'.repeat(60));
  console.log(`  ${'Status'.padEnd(12)} ${'Name'.padEnd(30)} ${'Executed At'}`);
  console.log('  ' + '─'.repeat(60));

  if (allMigrations.length === 0) {
    console.log('  (no migration files found)');
  }

  for (const migration of allMigrations) {
    const executedAt = executed.get(migration.name);
    if (executedAt) {
      const dateStr = executedAt.toISOString().replace('T', ' ').slice(0, 19);
      console.log(`  ${'✅ Done'.padEnd(12)} ${migration.name.padEnd(30)} ${dateStr}`);
    } else {
      console.log(`  ${'⏳ Pending'.padEnd(12)} ${migration.name.padEnd(30)} —`);
    }
  }

  console.log('  ' + '─'.repeat(60));

  const pendingCount = allMigrations.filter((m) => !executed.has(m.name)).length;
  console.log(`\n  Total: ${allMigrations.length} | Executed: ${executed.size} | Pending: ${pendingCount}\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args.includes('--down')
    ? 'down'
    : args.includes('--status')
      ? 'status'
      : 'up'; // default

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/LawSign';

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    switch (command) {
      case 'up':
        await runUp(db);
        break;
      case 'down':
        await runDown(db);
        break;
      case 'status':
        await showStatus(db);
        break;
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Migration error: ${err.message}`);
    process.exit(1);
  }
}

main();
