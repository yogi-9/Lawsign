'use strict';

/**
 * seed.js
 * Development seed script for LawSign.
 *
 * Usage:
 *   node seed.js              — Create test users (skip if already exist)
 *   node seed.js --reset      — Wipe all data and reseed
 *   node seed.js --production — Create only essential admin user
 *
 * @module seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Document = require('./models/Document');
const Signature = require('./models/Signature');
const AuditLog = require('./models/AuditLog');
const { PLANS, DOC_STATUS, AUDIT_ACTIONS } = require('./config/constants');

const TEST_USERS = [
  {
    name: 'Adv. Test User',
    email: 'test@lawsign.in',
    password: 'Test@1234',
    plan: PLANS.SOLO,
  },
  {
    name: 'Adv. Priya Sharma',
    email: 'priya@lawsign.in',
    password: 'Priya@1234',
    plan: PLANS.FREE,
  },
  {
    name: 'Rajesh & Associates',
    email: 'admin@lawsign.in',
    password: 'Admin@1234',
    plan: PLANS.FIRM,
  },
];

async function seed() {
  const isReset = process.argv.includes('--reset');
  const isProduction = process.argv.includes('--production');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/LawSign');
    console.log('✅ Connected to MongoDB');

    if (isReset) {
      console.log('\n⚠️  --reset flag detected. Wiping all data...');
      await User.deleteMany({});
      await Document.deleteMany({});
      await Signature.deleteMany({});
      // Use collection.deleteMany to bypass the pre-hook on AuditLog
      await AuditLog.collection.deleteMany({});
      console.log('🗑️  All collections cleared.');
    }

    if (isProduction) {
      // Production: only create admin user
      const adminData = TEST_USERS[2]; // admin@lawsign.in
      let admin = await User.findOne({ email: adminData.email });
      if (!admin) {
        admin = await User.create(adminData);
        console.log(`✅ Admin user created: ${admin.email}`);
      } else {
        console.log(`ℹ️  Admin user already exists: ${admin.email}`);
      }
    } else {
      // Development: create all test users
      console.log('\n🌱 Seeding test users...');
      const createdUsers = [];

      for (const userData of TEST_USERS) {
        let user = await User.findOne({ email: userData.email });
        if (!user) {
          user = await User.create(userData);
          console.log(`  ✅ Created: ${user.name} (${user.email}) — Plan: ${user.plan}`);
        } else {
          console.log(`  ℹ️  Exists: ${user.name} (${user.email}) — Use --reset to recreate`);
        }
        createdUsers.push(user);
      }

      // Create sample audit logs for the first user
      const primaryUser = createdUsers[0];
      const existingLogs = await AuditLog.countDocuments({ userId: primaryUser._id });

      if (existingLogs === 0) {
        console.log('\n🌱 Seeding sample audit logs...');
        await AuditLog.create([
          {
            userId: primaryUser._id,
            action: AUDIT_ACTIONS.USER_REGISTERED,
            ipAddress: '127.0.0.1',
            userAgent: 'Seed Script/1.0',
            metadata: { source: 'seed' },
          },
          {
            userId: primaryUser._id,
            action: AUDIT_ACTIONS.USER_LOGIN,
            ipAddress: '127.0.0.1',
            userAgent: 'Seed Script/1.0',
            metadata: { source: 'seed' },
          },
        ]);
        console.log('  ✅ Created 2 sample audit log entries');
      }
    }

    // Summary
    console.log('\n📊 Database Summary:');
    const [userCount, docCount, sigCount, auditCount] = await Promise.all([
      User.countDocuments(),
      Document.countDocuments(),
      Signature.countDocuments(),
      AuditLog.countDocuments(),
    ]);
    console.log(`  Users      : ${userCount}`);
    console.log(`  Documents  : ${docCount}`);
    console.log(`  Signatures : ${sigCount}`);
    console.log(`  Audit Logs : ${auditCount}`);

    console.log('\n🎉 Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
