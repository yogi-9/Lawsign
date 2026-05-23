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
const validateRequestSize       = require('../middleware/validateRequestSize');
const validateFileContent       = require('../middleware/validateFileContent');
const validateImageIntelligence = require('../middleware/validateImageIntelligence');
const { validateSignatureToken }= require('../utils/signatureToken');

// POST /api/v1/signatures/upload — user or guest
router.post(
  '/upload',
  optionalAuth,
  uploadLimiter,
  validateRequestSize(5 * 1024 * 1024), // 5MB limit
  signatureUploader.single('signature'),
  validateFileContent,
  validateImageIntelligence,
  uploadSignature
);

// GET /api/v1/signatures/  — list saved signatures (auth users only)
router.get('/', protect, listSignatures);

// GET /api/v1/signatures/:id/image  — serve the processed PNG (requires signed URL token)
router.get('/:id/image', validateSignatureToken, getSignatureImage);

// DELETE /api/v1/signatures/:id
router.delete('/:id', protect, deleteSignature);

module.exports = router;
