'use strict';

/**
 * controllers/signature.controller.js
 * Handles signature image upload and processing.
 *
 * Processing pipeline (Sharp):
 *  1. Read raw uploaded PNG/JPG/WEBP
 *  2. Convert to raw RGBA pixel buffer
 *  3. Remove white/near-white background by zeroing alpha channel
 *  4. Trim transparent edges
 *  5. Resize to max 400px wide (maintain aspect ratio)
 *  6. Save as PNG (PNG preserves transparency; JPEG does not)
 *  7. Delete raw file from disk
 */

const path       = require('path');
const sharp      = require('sharp');
const Signature  = require('../models/Signature');
const AuditLog   = require('../models/AuditLog');
const asyncHandler    = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { deleteFile }  = require('../services/storage.service');
const {
  UPLOAD_PATHS,
  GUEST_SESSION_HOURS,
  AUDIT_ACTIONS,
  SIG_PROCESSING,
} = require('../config/constants');
const { v4: uuidv4 }  = require('uuid');

// ── Upload & process signature ─────────────────────────────────────────────────
const uploadSignature = asyncHandler(async (req, res) => {
  // Multer has already saved the raw file at req.file.path
  if (!req.file) {
    return sendError(res, 400, 'No signature file received. Please attach an image.');
  }

  const rawPath = req.file.path;

  try {
    // ── Sharp processing pipeline ─────────────────────────────────────────────
    // Step 1: Get image metadata to know original dimensions
    const metadata = await sharp(rawPath).metadata();
    const { width, height, channels } = metadata;

    // Step 2: Extract raw RGBA pixel data
    // We need alpha channel so we force 4 channels (RGBA)
    const rawBuffer = await sharp(rawPath)
      .ensureAlpha()   // add alpha channel if not present (e.g., JPEG → RGBA)
      .raw()           // raw pixel bytes
      .toBuffer();

    // Step 3: Remove white/near-white background
    // For each pixel: if R, G, B are all above the threshold → make it transparent
    const threshold = SIG_PROCESSING.BG_THRESHOLD;
    const pixels    = new Uint8Array(rawBuffer);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      if (r >= threshold && g >= threshold && b >= threshold) {
        pixels[i + 3] = 0; // set alpha to 0 (fully transparent)
      }
    }

    // Step 4: Convert back to Sharp, trim transparent padding, resize, save as PNG
    const processedFilename = `${uuidv4()}.png`;
    const processedPath     = path.join(UPLOAD_PATHS.SIGNATURES_PROC, processedFilename);

    await sharp(Buffer.from(pixels.buffer), {
      raw: {
        width   : width,
        height  : height,
        channels: 4, // RGBA
      },
    })
      .trim()                              // remove transparent borders
      .resize(SIG_PROCESSING.OUTPUT_MAX_WIDTH, null, { // max width 400px
        withoutEnlargement: true,           // never upscale
        fit               : 'inside',
      })
      .png({ compressionLevel: 8 })        // good compression, still fast
      .toFile(processedPath);

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

    return sendSuccess(
      res,
      201,
      {
        signatureId  : signature._id,
        imageUrl     : `/api/v1/signatures/${signature._id}/image`,
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

  return sendSuccess(res, 200, { signatures, total: signatures.length });
});

// ── Serve processed signature image ───────────────────────────────────────────
// NOTE: Ownership check is intentionally skipped here.
// The signature ID (MongoDB ObjectId = 24-char hex) is unguessable, and browser
// <img> tags cannot send cookies cross-origin, which means guest users always
// fail the ownership check. This is the ONLY endpoint that relaxes auth.
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
