'use strict';

/**
 * scripts/migrations/001_initial_indexes.js
 * First migration — ensures all expected indexes exist on every collection.
 *
 * Run via: node scripts/db-migrate.js --up
 *
 * @module scripts/migrations/001_initial_indexes
 */

module.exports = {
  name: '001_initial_indexes',

  /**
   * Create all required indexes.
   * @param {import('mongodb').Db} db
   */
  async up(db) {
    // ── Users ────────────────────────────────────────────────────────────────
    await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
    await db.collection('users').createIndex({ plan: 1 }, { name: 'plan_1' });

    // ── Documents ────────────────────────────────────────────────────────────
    await db
      .collection('documents')
      .createIndex({ userId: 1, createdAt: -1 }, { name: 'userId_createdAt' });
    await db
      .collection('documents')
      .createIndex({ processingStatus: 1 }, { name: 'processingStatus_1' });
    await db
      .collection('documents')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_ttl' });
    await db
      .collection('documents')
      .createIndex({ guestSessionId: 1 }, { name: 'guestSessionId_1' });
    await db
      .collection('documents')
      .createIndex({ originalName: 'text' }, { name: 'originalName_text' });

    // ── Signatures ───────────────────────────────────────────────────────────
    await db.collection('signatures').createIndex({ userId: 1 }, { name: 'userId_1' });
    await db
      .collection('signatures')
      .createIndex({ userId: 1, isActive: 1 }, { name: 'userId_isActive' });
    await db
      .collection('signatures')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_ttl' });
    await db
      .collection('signatures')
      .createIndex({ guestSessionId: 1 }, { name: 'guestSessionId_1' });

    // ── Audit Logs ───────────────────────────────────────────────────────────
    await db
      .collection('auditlogs')
      .createIndex({ userId: 1, createdAt: -1 }, { name: 'userId_createdAt' });
    await db
      .collection('auditlogs')
      .createIndex({ documentId: 1 }, { name: 'documentId_1' });
    await db
      .collection('auditlogs')
      .createIndex({ documentId: 1, createdAt: -1 }, { name: 'documentId_createdAt' });
    await db
      .collection('auditlogs')
      .createIndex({ createdAt: -1 }, { name: 'createdAt_desc' });
    await db
      .collection('auditlogs')
      .createIndex({ action: 1 }, { name: 'action_1' });

    console.log('  ✅ All indexes created successfully');
  },

  /**
   * Drop all non-default indexes.
   * @param {import('mongodb').Db} db
   */
  async down(db) {
    const collections = ['users', 'documents', 'signatures', 'auditlogs'];

    for (const col of collections) {
      const indexes = await db.collection(col).indexes();

      for (const idx of indexes) {
        if (idx.name !== '_id_') {
          try {
            await db.collection(col).dropIndex(idx.name);
          } catch (e) {
            // Index might not exist, that's fine
          }
        }
      }
    }

    console.log('  ✅ All custom indexes dropped');
  },
};
