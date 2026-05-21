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

// ── Prevent deletion at the model level ───────────────────────────────────────
// Mongoose middleware that throws if anyone tries to delete audit logs
auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('Audit logs cannot be deleted. They are permanent legal records.');
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
