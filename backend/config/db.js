'use strict';

/**
 * config/db.js
 * Establishes and manages the MongoDB connection via Mongoose.
 * Calls process.exit(1) on failure — the application is useless without a database.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
    });

    console.log(`✅ MongoDB connected → ${conn.connection.host} / ${conn.connection.name}`);
  } catch (err) {
    const isDev = process.env.NODE_ENV !== 'production';

    console.error('\n❌ MongoDB connection failed:');
    console.error(`   ${err.message}`);
    console.error('\n💡 To fix this, set a valid MONGO_URI in your .env file:');
    console.error('   Option A — MongoDB Atlas (free cloud):');
    console.error('     MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/lawsign');
    console.error('   Option B — Local MongoDB:');
    console.error('     Install from: https://www.mongodb.com/try/download/community');
    console.error('     MONGO_URI=mongodb://localhost:27017/lawsign\n');

    if (isDev) {
      console.warn('⚠️  DEGRADED MODE: Server will start WITHOUT database.');
      console.warn('   Routes that read/write data will fail with 500.');
      console.warn('   /api/v1/health will still respond ✅\n');
      // Don't exit — let server start so you can test routing/middleware
    } else {
      // In production, a missing DB is always fatal
      process.exit(1);
    }
  }
};

// ── Mongoose global settings ───────────────────────────────────────────────────
mongoose.set('strictQuery', true); // suppress deprecation warning in Mongoose 7+

// ── Connection event listeners ─────────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected.');
});

module.exports = connectDB;
