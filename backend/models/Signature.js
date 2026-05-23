'use strict';

/**
 * models/Signature.js
 * Stores processed signature images (background removed, trimmed, resized to PNG).
 * The raw upload is deleted after processing; only the processed path is stored here.
 */

const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema(
  {
    userId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'User',
      index  : true,
      default: null,
    },

    // What the user called their file (shown in the signature picker)
    originalName: {
      type : String,
      trim : true,
    },

    // Path to the processed PNG (bg removed, trimmed, ≤400px wide)
    // NEVER sent to frontend directly — use a /signatures/:id/image route instead
    processedPath: {
      type    : String,
      required: true,
    },

    // Soft-delete — users can "remove" a saved signature without losing audit history
    isActive: {
      type   : Boolean,
      default: true,
    },

    // ── Guest mode ──────────────────────────────────────────────────────────
    isGuest: {
      type   : Boolean,
      default: false,
    },

    guestSessionId: {
      type   : String,
      default: null,
      index  : true,
    },

    // TTL index auto-deletes guest signatures after 2 hours
    expiresAt: {
      type   : Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── TTL index for guest signature cleanup ─────────────────────────────────────
signatureSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Compound index: user's active signatures ──────────────────────────────
signatureSchema.index({ userId: 1, isActive: 1 });

// ── Static: find active signatures for a user ─────────────────────────────
// Usage: const sigs = await Signature.findActiveByUser(userId);
signatureSchema.statics.findActiveByUser = function (userId) {
  return this.find({ userId, isActive: true })
    .select('-processedPath')
    .sort({ createdAt: -1 });
};

const Signature = mongoose.model('Signature', signatureSchema);
module.exports = Signature;
