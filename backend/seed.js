'use strict';

/**
 * seed.js
 * Development seed script for LawSign.
 * Run with: node seed.js [--reset]
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Document = require('./models/Document');
const Signature = require('./models/Signature');
const AuditLog = require('./models/AuditLog');
const { PLANS } = require('./config/constants');
require('dotenv').config(); // Load environment variables

const TEST_USER = {
  email: 'test@lawsign.in',
  password: 'Test@1234',
  name: 'Adv. Test User',
  plan: PLANS.SOLO
};

async function seed() {
  const isReset = process.argv.includes('--reset');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lawsign');
    console.log('✅ Connected to MongoDB');

    let user = await User.findOne({ email: TEST_USER.email });

    if (isReset) {
      console.log('⚠️ --reset flag detected. Cleaning up test user data...');
      if (user) {
        // Delete related data
        const docResult = await Document.deleteMany({ userId: user._id });
        console.log(`🗑️ Deleted ${docResult.deletedCount} documents.`);
        
        const sigResult = await Signature.deleteMany({ userId: user._id });
        console.log(`🗑️ Deleted ${sigResult.deletedCount} signatures.`);
        
        const auditResult = await AuditLog.collection.deleteMany({ userId: user._id });
        console.log(`🗑️ Deleted ${auditResult.deletedCount} audit logs.`);

        await User.deleteOne({ _id: user._id });
        console.log('🗑️ Deleted test user.');
        user = null; // force recreation
      } else {
        console.log('ℹ️ Test user does not exist. Nothing to reset.');
      }
    }

    if (!user) {
      console.log('🌱 Creating test user...');
      user = await User.create(TEST_USER);
      console.log(`✅ Test user created successfully: ${user.email} (Plan: ${user.plan})`);
    } else {
      console.log(`✅ Test user already exists: ${user.email}. Use --reset to recreate.`);
    }

    console.log('🎉 Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
