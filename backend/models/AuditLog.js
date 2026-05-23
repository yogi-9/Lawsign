'use strict';

/**
 * models/AuditLog.js
 * Immutable audit trail for every significant action in the system.
 *
 * LEGAL REQUIREMENT: Audit logs are NEVER deleted.
 * They provide a permanent, tamper-evident record of who did what and when
 * to every legal document that passes through the platform.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { AUDIT_ACTIONS } = require('../config/constants');

const auditLogSchema = new mongoose.Schema(
  {
    // Who did it — one of these two will be set, not both
    userId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'User',
      default: null,
    },
    guestSessionId: {
      type   : String,
      default: null,
    },

    // Which document this action relates to
    documentId: {
      type   : mongoose.Schema.Types.ObjectId,
      ref    : 'Document',
      default: null,
      index  : true,
    },

    // What action was performed
    action: {
      type    : String,
      required: true,
      enum    : Object.values(AUDIT_ACTIONS),
      index   : true,
    },

    // Network info captured from request headers
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },

    // Action-specific details (flexible — different for each action type)
    // Examples:
    //   { pageCount: 3 }                    for OCR_PROCESSED
    //   { placementCount: 2, pages: [1,3] } for PLACEMENTS_SAVED
    //   { signatureCount: 2 }               for PDF_GENERATED
    metadata: {
      type   : mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Tamper-evident content hash
    contentHash: {
      type: String,
      default: null,
    }
  },
  {
    // Only createdAt — audit logs are never updated
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Time-range queries: "show all actions in the last 24 hours"
auditLogSchema.index({ createdAt: -1 });
// Per-user audit trail
auditLogSchema.index({ userId: 1, createdAt: -1 });

// ── Tamper-evident Hashing ────────────────────────────────────────────────────
auditLogSchema.pre('save', function (next) {
  if (this.isNew) {
    const payload = JSON.stringify({
      userId: this.userId ? this.userId.toString() : null,
      guestSessionId: this.guestSessionId,
      documentId: this.documentId ? this.documentId.toString() : null,
      action: this.action,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      metadata: this.metadata
    });
    const secret = process.env.AUDIT_SECRET || 'lawsign-audit-secret-123';
    this.contentHash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
  next();
});

// ── Prevent deletion at the model level ───────────────────────────────────────
// Mongoose middleware that throws if anyone tries to delete audit logs
auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('Audit logs cannot be deleted. They are permanent legal records.');
});

// ── Compound index: per-document audit trail ──────────────────────────────
auditLogSchema.index({ documentId: 1, createdAt: -1 });

// ── Static: create audit log entry ────────────────────────────────────────
// Usage: await AuditLog.logAction({ req, documentId, action, metadata });
auditLogSchema.statics.logAction = function ({ req, userId, guestSessionId, documentId, action, metadata = {} }) {
  return this.create({
    userId: userId || req?.user?._id || null,
    guestSessionId: guestSessionId || req?.guestSessionId || null,
    documentId: documentId || null,
    action,
    ipAddress: req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || null,
    userAgent: req?.headers?.['user-agent'] || null,
    metadata,
  });
};

// ── Static: get audit trail for a document ────────────────────────────────
// Usage: const trail = await AuditLog.getDocumentTrail(documentId);
auditLogSchema.statics.getDocumentTrail = function (documentId) {
  return this.find({ documentId })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email');
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
