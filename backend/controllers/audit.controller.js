'use strict';

/**
 * controllers/audit.controller.js
 * Handles verification of audit log integrity for legal disputes.
 */

const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');

// ── Verify Audit Logs for a Document ──────────────────────────────────────────
const verifyAuditLogs = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const logs = await AuditLog.find({ documentId }).sort({ createdAt: 1 });

  if (logs.length === 0) {
    return sendError(res, 404, 'No audit logs found for this document.');
  }

  const secret = process.env.AUDIT_SECRET || 'lawsign-audit-secret-123';
  let isIntact = true;
  const verificationDetails = [];

  for (const log of logs) {
    const payload = JSON.stringify({
      userId: log.userId ? log.userId.toString() : null,
      guestSessionId: log.guestSessionId,
      documentId: log.documentId ? log.documentId.toString() : null,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata
    });

    const expectedHash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const logIntact = log.contentHash === expectedHash;

    if (!logIntact) {
      isIntact = false;
    }

    verificationDetails.push({
      logId: log._id,
      action: log.action,
      createdAt: log.createdAt,
      intact: logIntact,
      recordedHash: log.contentHash,
      expectedHash: expectedHash
    });
  }

  return sendSuccess(res, 200, {
    documentId,
    totalLogs: logs.length,
    integrityVerified: isIntact,
    details: verificationDetails
  }, isIntact ? 'Audit trail integrity verified.' : 'WARNING: Audit trail tampering detected.');
});

module.exports = { verifyAuditLogs };
