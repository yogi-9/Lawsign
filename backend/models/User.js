'use strict';

/**
 * models/User.js
 * Registered user schema.
 *
 * Security decisions:
 *  - password has select:false  → never appears in any query result by default
 *  - bcrypt hashing in pre-save hook → controllers never touch bcrypt directly
 *  - comparePassword instance method → clean API for login verification
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { PLANS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type    : String,
      required: [true, 'Name is required'],
      trim    : true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type    : String,
      required: [true, 'Email is required'],
      unique  : true,      // creates a MongoDB index automatically
      lowercase: true,
      trim    : true,
      match   : [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },

    // select:false means this field is EXCLUDED from every query result by default.
    // To include it you must explicitly do .select('+password').
    password: {
      type    : String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select  : false,
    },

    plan: {
      type   : String,
      enum   : Object.values(PLANS),
      default: PLANS.FREE,
    },

    isActive: {
      type   : Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },

    // Running total of storage consumed (updated on upload / delete)
    storageUsedBytes: {
      type   : Number,
      default: 0,
      min    : 0,
    },
  },
  {
    timestamps: true, // automatically manages createdAt and updatedAt
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// email already has unique:true which creates an index.
// Index on plan for future analytics queries.
userSchema.index({ plan: 1 });

// ── Pre-save hook: hash password ──────────────────────────────────────────────
// Runs before every .save() call. Only hashes if the password field was changed
// so that updates to other fields (e.g. lastLogin) don't re-hash unnecessarily.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Cost factor 12 → ~300ms per hash → brute force impractical
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare password ────────────────────────────────────────
// Controllers call user.comparePassword(plainText) — never call bcrypt directly.
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// ── Instance method: safe public object ──────────────────────────────────────
// Returns user data safe to send in API responses (no password field).
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
