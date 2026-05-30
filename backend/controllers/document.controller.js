'use strict';

/**
 * controllers/document.controller.js
 */

const Document   = require('../models/Document');
const AuditLog   = require('../models/AuditLog');
const asyncHandler  = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { detectSignatureFields }  = require('../services/ocrDetection.service');
const { getPDFPageCount }        = require('../services/pdf.service');
const { deleteFile, fileExists } = require('../services/storage.service');
const { getDocumentPageImage: renderPage } = require('../services/pageRenderer.service');
const { getIO }                  = require('../config/socket');
const { DOC_STATUS, GUEST_DOC_LIMIT, GUEST_SESSION_HOURS, AUDIT_ACTIONS } = require('../config/constants');

const _ip = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// ── Upload document ────────────────────────────────────────────────────────────
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, 'No document file received.');

  const { file } = req;

  if (!req.user && req.guestSessionId) {
    const count = await Document.countDocuments({ guestSessionId: req.guestSessionId, isGuest: true });
    if (count >= GUEST_DOC_LIMIT) {
      deleteFile(file.path);
      return sendError(res, 429, `Guest accounts are limited to ${GUEST_DOC_LIMIT} documents. Create a free account to upload more.`);
    }
  }

  if (!req.user && !req.guestSessionId) {
    deleteFile(file.path);
    return sendError(res, 401, 'Authentication required to upload documents.');
  }

  const docData = {
    originalName    : file.originalname,
    storagePath     : file.path,
    mimeType        : file.mimetype,
    fileSizeBytes   : file.size,
    processingStatus: DOC_STATUS.UPLOADING,
  };

  if (req.user) {
    docData.userId = req.user._id;
  } else {
    docData.isGuest        = true;
    docData.guestSessionId = req.guestSessionId;
    docData.expiresAt      = new Date(Date.now() + GUEST_SESSION_HOURS * 60 * 60 * 1000);
  }

  const doc = await Document.create(docData);
  doc.processingStatus = DOC_STATUS.PROCESSING;
  await doc.save();

  let detectedFields = [];
  let pageCount      = 1;

  try {
    const ocrResult = await detectSignatureFields(file.path, file.mimetype);
    detectedFields = ocrResult.fields || [];
    
    // For pageCount, rely on PDF service if PDF, otherwise use OCR result
    if (file.mimetype === 'application/pdf') {
      pageCount = await getPDFPageCount(file.path);
    } else {
      pageCount = ocrResult.pageCount || 1;
    }
  } catch (e) {
    console.error('[document] OCR failed, continuing with defaults:', e.message);
  }

  // Python returns percentage-based fields — convert to absolute PDF points for DB storage
  // Frontend will receive percentage-based fields directly in the API response
  const PAGE_WIDTH_PT = 595;   // A4 width in PDF points
  const PAGE_HEIGHT_PT = 842;  // A4 height in PDF points

  const fieldsForDB = detectedFields.map(f => ({
    page: f.page,
    x: f.xPct !== undefined ? (f.xPct / 100) * PAGE_WIDTH_PT : f.x,
    y: f.yPct !== undefined ? ((100 - f.yPct - (f.heightPct || 7)) / 100) * PAGE_HEIGHT_PT : f.y,
    width: f.widthPct !== undefined ? (f.widthPct / 100) * PAGE_WIDTH_PT : f.width,
    height: f.heightPct !== undefined ? (f.heightPct / 100) * PAGE_HEIGHT_PT : f.height,
    confidence: f.confidence,
    label: f.label,
  }));

  // Save fieldsForDB to DB
  doc.detectedFields   = fieldsForDB;
  doc.pageCount        = pageCount;
  doc.processingStatus = DOC_STATUS.READY;
  await doc.save();

  await AuditLog.create({
    userId        : req.user?._id || null,
    guestSessionId: req.guestSessionId || null,
    documentId    : doc._id,
    action        : AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    ipAddress     : _ip(req),
    userAgent     : req.headers['user-agent'],
    metadata      : { originalName: file.originalname, pageCount, detectedCount: detectedFields.length },
  });

  if (req.user) {
    try { getIO().to(req.user._id.toString()).emit('document:ready', { documentId: doc._id, status: DOC_STATUS.READY, detectedFields, pageCount }); }
    catch (_) { /* socket not critical */ }
  }

  return sendSuccess(res, 201, {
    documentId      : doc._id,
    originalName    : doc.originalName,
    mimeType        : doc.mimeType,
    fileSizeBytes   : doc.fileSizeBytes,
    pageCount,
    processingStatus: doc.processingStatus,
    detectedFields,
    ...(doc.isGuest && { expiresAt: doc.expiresAt }),
  }, `Document processed. Found ${detectedFields.length} signature field(s).`);
});

// ── Get single document ────────────────────────────────────────────────────────
const getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id).select('-storagePath -outputPath');
  if (!doc) return sendError(res, 404, 'Document not found.');
  const isOwner =
    (req.user && doc.userId?.toString() === req.user._id.toString()) ||
    (req.guestSessionId && doc.guestSessionId === req.guestSessionId);
  if (!isOwner) return sendError(res, 403, 'Access denied.');
  return sendSuccess(res, 200, { document: doc });
});

// ── List documents ────────────────────────────────────────────────────────────
const listDocuments = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const result = await Document.findByUser(req.user._id, { 
    status, 
    search, 
    page: parseInt(page, 10), 
    limit: parseInt(limit, 10) 
  });
  
  return sendSuccess(res, 200, { 
    documents: result.docs, 
    total: result.total, 
    page: result.page, 
    totalPages: result.totalPages,
    hasMore: result.hasMore
  });
});

// ── Save placements ────────────────────────────────────────────────────────────
const savePlacements = asyncHandler(async (req, res) => {
  const { placements } = req.body;
  const doc = await Document.findById(req.params.id);
  if (!doc) return sendError(res, 404, 'Document not found.');
  const isOwner =
    (req.user && doc.userId?.toString() === req.user._id.toString()) ||
    (req.guestSessionId && doc.guestSessionId === req.guestSessionId);
  if (!isOwner) return sendError(res, 403, 'Access denied.');
  doc.placements       = placements;
  doc.processingStatus = DOC_STATUS.PLACEMENTS_SAVED;
  await doc.save();
  await AuditLog.create({
    userId: req.user?._id || null, guestSessionId: req.guestSessionId || null,
    documentId: doc._id, action: AUDIT_ACTIONS.PLACEMENTS_SAVED,
    ipAddress: _ip(req), userAgent: req.headers['user-agent'],
    metadata: { placementCount: placements.length, pages: [...new Set(placements.map(p => p.page))] },
  });
  return sendSuccess(res, 200, { documentId: doc._id, placementCount: placements.length }, 'Placements saved.');
});

// ── Serve document page as image/PDF for editor canvas ─────────────────────────
const getPageImage = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return sendError(res, 404, 'Document not found.');

  // Ownership check
  const isOwner =
    (req.user && doc.userId?.toString() === req.user._id.toString()) ||
    (req.guestSessionId && doc.guestSessionId === req.guestSessionId);
  if (!isOwner) return sendError(res, 403, 'Access denied.');

  if (!fileExists(doc.storagePath)) {
    return sendError(res, 404, 'Document file not found on server.');
  }

  const pageNum = parseInt(req.params.page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return sendError(res, 400, 'Invalid page number.');
  }

  try {
    const { buffer, contentType } = await renderPage(doc.storagePath, doc.mimeType, pageNum);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
});

// ── Delete document ────────────────────────────────────────────────────────────
const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return sendError(res, 404, 'Document not found.');
  if (doc.userId?.toString() !== req.user._id.toString()) return sendError(res, 403, 'Access denied.');
  deleteFile(doc.storagePath);
  if (doc.outputPath) deleteFile(doc.outputPath);
  await Document.findByIdAndDelete(doc._id);
  await AuditLog.create({
    userId: req.user._id, documentId: doc._id, action: AUDIT_ACTIONS.DOCUMENT_DELETED,
    ipAddress: _ip(req), userAgent: req.headers['user-agent'], metadata: { originalName: doc.originalName },
  });
  return sendSuccess(res, 200, {}, 'Document deleted.');
});

// ── Rename document ────────────────────────────────────────────────────────────
const renameDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return sendError(res, 404, 'Document not found.');
  if (doc.userId?.toString() !== req.user._id.toString()) return sendError(res, 403, 'Access denied.');
  const { newName } = req.body;
  if (!newName) return sendError(res, 400, 'New name is required.');
  
  doc.originalName = newName;
  await doc.save();
  
  await AuditLog.create({
    userId: req.user._id, documentId: doc._id, action: AUDIT_ACTIONS.DOCUMENT_RENAMED || 'DOCUMENT_RENAMED',
    ipAddress: _ip(req), userAgent: req.headers['user-agent'], metadata: { newName },
  });
  
  return sendSuccess(res, 200, { originalName: doc.originalName }, 'Document renamed.');
});

module.exports = { uploadDocument, getDocument, listDocuments, savePlacements, getPageImage, deleteDocument, renameDocument };
