'use strict';

/**
 * controllers/output.controller.js
 * Handles PDF generation, download, and status polling.
 */

const path       = require('path');
const Document   = require('../models/Document');
const Signature  = require('../models/Signature');
const AuditLog   = require('../models/AuditLog');
const asyncHandler  = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { generateSignedPDF }      = require('../services/pdf.service');
const { fileExists, getFileStream } = require('../services/storage.service');
const { getIO }  = require('../config/socket');
const { DOC_STATUS, AUDIT_ACTIONS } = require('../config/constants');

const _ip = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// ── Generate signed PDF ────────────────────────────────────────────────────────
const generatePDF = asyncHandler(async (req, res) => {
  const { documentId, signatureId, placements: incomingPlacements } = req.body;

  if (!documentId) {
    return sendError(res, 400, 'documentId is required.');
  }

  // Fetch document
  const doc = await Document.findById(documentId);
  if (!doc) return sendError(res, 404, 'Document not found.');

  // Ownership check for doc
  const userId = req.user?._id?.toString();
  const guestId = req.guestSessionId;
  const ownsDoc = (userId && doc.userId?.toString() === userId) || (guestId && doc.guestSessionId === guestId);
  if (!ownsDoc) return sendError(res, 403, 'Access denied.');

  // Decide which placements to use
  const placements = incomingPlacements?.length > 0
    ? incomingPlacements
    : doc.placements;

  if (!placements || placements.length === 0) {
    return sendError(res, 400, 'No placements found. Please position your signature in the editor first.');
  }

  // Extract all unique signatureIds from placements
  const signatureIds = [...new Set(placements.map(p => p.signatureId).filter(Boolean))];

  // Fallback to top-level signatureId if no placements had it
  if (signatureIds.length === 0 && signatureId) {
    signatureIds.push(signatureId);
    // retro-fit placements with the fallback signatureId
    placements.forEach(p => p.signatureId = signatureId);
  }

  if (signatureIds.length === 0) {
     return sendError(res, 400, 'signatureId is required for at least one placement.');
  }

  // Fetch all signatures
  const signatures = await Signature.find({ _id: { $in: signatureIds } });
  if (signatures.length !== signatureIds.length) {
    return sendError(res, 404, 'One or more signatures not found.');
  }

  // Verify ownership and existence for each signature
  const signaturesMap = {};
  for (const sig of signatures) {
     const ownsSig = (userId && sig.userId?.toString() === userId) || (guestId && sig.guestSessionId === guestId);
     if (!ownsSig) return sendError(res, 403, 'Access denied for one or more signatures.');
     if (!fileExists(sig.processedPath)) return sendError(res, 404, `Signature image not found on server for id ${sig._id}.`);
     signaturesMap[sig._id.toString()] = sig.processedPath;
  }

  // Verify document source file exists on disk
  if (!fileExists(doc.storagePath)) return sendError(res, 404, 'Original document file not found on server.');

  // Generate PDF
  const result = await generateSignedPDF(doc.storagePath, signaturesMap, placements, doc.mimeType);

  if (!result.success) {
    return sendError(res, 500, result.error);
  }

  // Update document record
  doc.outputPath        = result.outputPath;
  doc.processingStatus  = DOC_STATUS.SIGNED;
  if (incomingPlacements?.length > 0) doc.placements = incomingPlacements;
  await doc.save();

  // Audit log
  await AuditLog.create({
    userId        : req.user?._id || null,
    guestSessionId: req.guestSessionId || null,
    documentId    : doc._id,
    action        : AUDIT_ACTIONS.PDF_GENERATED,
    ipAddress     : _ip(req),
    userAgent     : req.headers['user-agent'],
    metadata      : {
      signatureIds    : signatureIds,
      placementCount  : placements.length,
      pages           : [...new Set(placements.map(p => p.page))],
    },
  });

  // Real-time push — download button appears immediately in browser
  try {
    if (req.user) {
      getIO().to(req.user._id.toString()).emit('pdf:ready', {
        documentId  : doc._id,
        downloadUrl : `/api/v1/output/download/${doc._id}`,
        status      : DOC_STATUS.SIGNED,
      });
    } else if (req.guestSessionId) {
      getIO().to(`guest:${req.guestSessionId}`).emit('pdf:ready', {
        documentId  : doc._id,
        downloadUrl : `/api/v1/output/download/${doc._id}`,
        status      : DOC_STATUS.SIGNED,
      });
    }
  } catch (_) { /* non-critical */ }

  return sendSuccess(res, 200, {
    documentId  : doc._id,
    status      : DOC_STATUS.SIGNED,
    downloadUrl : `/api/v1/output/download/${doc._id}`,
    ...(doc.isGuest && { expiresAt: doc.expiresAt }),
  }, 'Signed PDF generated successfully.');
});

// ── Download signed PDF ────────────────────────────────────────────────────────
const downloadPDF = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return sendError(res, 404, 'Document not found.');

  const userId  = req.user?._id?.toString();
  const guestId = req.guestSessionId;
  const isOwner =
    (userId  && doc.userId?.toString() === userId) ||
    (guestId && doc.guestSessionId === guestId);

  if (!isOwner) return sendError(res, 403, 'Access denied.');

  if (doc.processingStatus !== DOC_STATUS.SIGNED || !doc.outputPath) {
    return sendError(res, 400, 'Signed PDF is not ready yet. Please generate it first.');
  }

  if (!fileExists(doc.outputPath)) {
    return sendError(res, 404, 'Signed PDF file not found on server. It may have expired.');
  }

  // Audit the download
  await AuditLog.create({
    userId        : req.user?._id || null,
    guestSessionId: req.guestSessionId || null,
    documentId    : doc._id,
    action        : AUDIT_ACTIONS.PDF_DOWNLOADED,
    ipAddress     : _ip(req),
    userAgent     : req.headers['user-agent'],
    metadata      : { outputPath: path.basename(doc.outputPath) },
  });

  // Stream the file to client
  const baseName = doc.originalName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
  const downloadName = `signed-${baseName}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Type', 'application/pdf');
  getFileStream(doc.outputPath).pipe(res);
});

// ── Poll status (polling fallback when Socket.io not available) ────────────────
const getStatus = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id).select('processingStatus outputPath isGuest expiresAt');
  if (!doc) return sendError(res, 404, 'Document not found.');

  const userId  = req.user?._id?.toString();
  const guestId = req.guestSessionId;
  const isOwner =
    (userId  && doc.userId?.toString() === userId) ||
    (guestId && doc.guestSessionId === guestId);

  if (!isOwner) return sendError(res, 403, 'Access denied.');

  return sendSuccess(res, 200, {
    documentId      : doc._id,
    processingStatus: doc.processingStatus,
    isReady         : doc.processingStatus === DOC_STATUS.SIGNED,
    downloadUrl     : doc.processingStatus === DOC_STATUS.SIGNED
      ? `/api/v1/output/download/${doc._id}`
      : null,
    ...(doc.isGuest && { expiresAt: doc.expiresAt }),
  });
});

module.exports = { generatePDF, downloadPDF, getStatus };
