'use strict';

/**
 * controllers/signature.controller.js
 * Handles signature image upload and processing.
 *
 * Processing is delegated to services/bgRemoval.service.js which tries
 * the Python rembg microservice first, then falls back to Sharp.
 */

const path       = require('path');
const Signature  = require('../models/Signature');
const AuditLog   = require('../models/AuditLog');
const asyncHandler    = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { deleteFile }  = require('../services/storage.service');
const {
  UPLOAD_PATHS,
  GUEST_SESSION_HOURS,
  AUDIT_ACTIONS,
} = require('../config/constants');
const { v4: uuidv4 }  = require('uuid');
const { generateSignatureToken } = require('../utils/signatureToken');

// ── Upload & process signature ─────────────────────────────────────────────────
const uploadSignature = asyncHandler(async (req, res) => {
  // Multer has already saved the raw file at req.file.path
  if (!req.file) {
    return sendError(res, 400, 'No signature file received. Please attach an image.');
  }

  const rawPath = req.file.path;

  try {
    // ── Background removal (Python microservice → Sharp fallback) ───────────────
    const processedFilename = `${uuidv4()}.png`;
    const processedPath = path.join(UPLOAD_PATHS.SIGNATURES_PROC, processedFilename);

    const { removeBackground } = require('../services/bgRemoval.service');
    await removeBackground(rawPath, processedPath);

    // Step 5: Delete the raw upload — no longer needed
    deleteFile(rawPath);

    // ── Save to database ───────────────────────────────────────────────────────
    const sigData = {
      originalName : req.file.originalname,
      processedPath,
    };

    // Attach owner (user or guest)
    if (req.user) {
      sigData.userId = req.user._id;
    } else if (req.guestSessionId) {
      sigData.isGuest        = true;
      sigData.guestSessionId = req.guestSessionId;
      sigData.expiresAt      = new Date(Date.now() + GUEST_SESSION_HOURS * 60 * 60 * 1000);
    } else {
      // Neither authenticated nor guest — reject
      deleteFile(processedPath);
      return sendError(res, 401, 'Authentication required to upload a signature.');
    }

    const signature = await Signature.create(sigData);

    // Audit log
    await AuditLog.create({
      userId        : req.user?._id || null,
      guestSessionId: req.guestSessionId || null,
      action        : AUDIT_ACTIONS.SIGNATURE_UPLOADED,
      ipAddress     : req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent     : req.headers['user-agent'],
      metadata      : { signatureId: signature._id, originalName: req.file.originalname },
    });

    const token = generateSignatureToken(signature._id.toString());

    return sendSuccess(
      res,
      201,
      {
        signatureId  : signature._id,
        imageUrl     : `/api/v1/signatures/${signature._id}/image?token=${token}`,
        originalName : signature.originalName,
        processedAt  : signature.createdAt,
      },
      'Signature processed successfully.'
    );

  } catch (err) {
    // Clean up raw file if processing failed
    deleteFile(rawPath);
    throw err; // asyncHandler forwards to errorHandler
  }
});

// ── List user's saved signatures ───────────────────────────────────────────────
const listSignatures = asyncHandler(async (req, res) => {
  const signatures = await Signature.find({
    userId  : req.user._id,
    isActive: true,
  }).select('-processedPath').sort({ createdAt: -1 });

  const sigsWithToken = signatures.map(sig => {
    const obj = sig.toObject();
    const token = generateSignatureToken(sig._id.toString());
    obj.imageUrl = `/api/v1/signatures/${sig._id}/image?token=${token}`;
    return obj;
  });

  return sendSuccess(res, 200, { signatures: sigsWithToken, total: signatures.length });
});

// ── Serve processed signature image ───────────────────────────────────────────
// NOTE: Hardened using short-lived HMAC tokens to prevent enumeration or unauthorized access.
// The validateSignatureToken middleware runs before this.
const getSignatureImage = asyncHandler(async (req, res) => {
  const sig = await Signature.findById(req.params.id);
  if (!sig) return sendError(res, 404, 'Signature not found.');

  const { fileExists, getFileStream } = require('../services/storage.service');
  if (!fileExists(sig.processedPath)) {
    return sendError(res, 404, 'Signature image file not found on server.');
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  getFileStream(sig.processedPath).pipe(res);
});

// ── Soft-delete a signature ────────────────────────────────────────────────────
const deleteSignature = asyncHandler(async (req, res) => {
  const sig = await Signature.findById(req.params.id);
  if (!sig) return sendError(res, 404, 'Signature not found.');

  if (sig.userId?.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'You do not own this signature.');
  }

  sig.isActive = false;
  await sig.save();

  await AuditLog.create({
    userId    : req.user._id,
    action    : AUDIT_ACTIONS.SIGNATURE_DELETED,
    ipAddress : req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    userAgent : req.headers['user-agent'],
    metadata  : { signatureId: sig._id },
  });

  return sendSuccess(res, 200, {}, 'Signature removed.');
});

module.exports = { uploadSignature, listSignatures, getSignatureImage, deleteSignature };
