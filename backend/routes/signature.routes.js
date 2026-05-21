'use strict';

/**
 * routes/signature.routes.js
 * Maps /api/v1/signatures/* URLs to controller functions.
 */

const router = require('express').Router();
const { uploadSignature, listSignatures, getSignatureImage, deleteSignature } = require('../controllers/signature.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadLimiter }         = require('../middleware/rateLimit');
const { signatureUploader }     = require('../config/multer');

// POST /api/v1/signatures/upload — user or guest
router.post(
  '/upload',
  optionalAuth,
  uploadLimiter,
  signatureUploader.single('signature'),
  uploadSignature
);

// GET /api/v1/signatures/  — list saved signatures (auth users only)
router.get('/', protect, listSignatures);

// GET /api/v1/signatures/:id/image  — serve the processed PNG
router.get('/:id/image', optionalAuth, getSignatureImage);

// DELETE /api/v1/signatures/:id
router.delete('/:id', protect, deleteSignature);

module.exports = router;
