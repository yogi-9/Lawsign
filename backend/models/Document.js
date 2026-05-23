'use strict';

/**
 * models/Document.js
 * Legal document schema — tracks the entire lifecycle of an uploaded document
 * from raw upload through OCR field detection, placement saving, to final signed PDF.
 *
 * TTL index on expiresAt automatically deletes guest documents when they expire.
 */

const mongoose = require('mongoose');
const { DOC_STATUS } = require('../config/constants');

// ── Sub-schema: a detected signature field (from OCR service) ─────────────────
const detectedFieldSchema = new mongoose.Schema(
  {
    page      : { type: Number, required: true },
    x         : { type: Number, required: true },
    y         : { type: Number, required: true },
    width     : { type: Number, required: true },
    height    : { type: Number, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.75 },
    label     : { type: String, default: 'Signature' },
  },
  { _id: false } // no separate _id for sub-documents
);

// ── Sub-schema: a confirmed placement (from the editor) ───────────────────────
const placementSchema = new mongoose.Schema(
  {
    page       : { type: Number, required: true },
    x          : { type: Number, required: true },
    y          : { type: Number, required: true },
    width      : { type: Number, required: true },
    height     : { type: Number, required: true },
    rotation   : { type: Number, default: 0 },
    signatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Signature' },
  },
  { _id: false }
);

// ── Main document schema ──────────────────────────────────────────────────────
const documentSchema = new mongoose.Schema(
  {
    // Owner — null if guest
    userId: {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'User',
      index   : true,       // fast dashboard queries by userId
      default : null,
    },

    originalName: {
      type    : String,
      required: [true, 'Original file name is required'],
      trim    : true,
    },

    // Internal disk path — NEVER sent to the frontend
    storagePath: {
      type    : String,
      required: true,
    },

    mimeType: {
      type    : String,
      required: true,
    },

    fileSizeBytes: {
      type: Number,
      min : 0,
    },

    pageCount: {
      type   : Number,
      default: 0,
    },

    // Lifecycle status — transitions: uploading → processing → ready → placements_saved → signed
    processingStatus: {
      type    : String,
      enum    : Object.values(DOC_STATUS),
      default : DOC_STATUS.UPLOADING,
      index   : true,
    },

    // Fields detected by OCR service
    detectedFields: {
      type   : [detectedFieldSchema],
      default: [],
    },

    // Confirmed positions from the editor UI
    placements: {
      type   : [placementSchema],
      default: [],
    },

    // Path to the final signed PDF (set after PDF generation)
    outputPath: {
      type   : String,
      default: null,
    },

    // ── Guest mode ──────────────────────────────────────────────────────────
    isGuest: {
      type   : Boolean,
      default: false,
    },

    guestSessionId: {
      type   : String,
      default: null,
      index  : true, // queries like "count docs for this guest"
    },

    // MongoDB TTL index on this field auto-deletes expired guest documents
    expiresAt: {
      type   : Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── TTL index ──────────────────────────────────────────────────────────────────
// MongoDB checks this every 60 seconds and removes documents where expiresAt has passed.
// Only guest documents have expiresAt set; registered user documents have null (never expire).
documentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Compound index for dashboard list query ────────────────────────────────────
documentSchema.index({ userId: 1, createdAt: -1 });

// ── Text index for search ──────────────────────────────────────────────────
documentSchema.index({ originalName: 'text' });

// ── Virtual: isExpired ─────────────────────────────────────────────────────
documentSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// ── Static: find documents by user with pagination ─────────────────────────
// Usage: const { docs, total } = await Document.findByUser(userId, { page: 1, limit: 10, status: 'ready' });
documentSchema.statics.findByUser = async function (userId, options = {}) {
  const { page = 1, limit = 10, status, search } = options;
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (status) filter.processingStatus = status;
  if (search) filter.originalName = { $regex: search, $options: 'i' };

  const [docs, total] = await Promise.all([
    this.find(filter)
      .select('-storagePath -outputPath')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(filter),
  ]);

  return {
    docs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
};

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;
