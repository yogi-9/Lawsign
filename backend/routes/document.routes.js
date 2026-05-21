'use strict';

/**
 * routes/document.routes.js
 * Maps /api/v1/documents/* URLs to controller functions.
 */

const router = require('express').Router();
const { uploadDocument, getDocument, listDocuments, savePlacements, getPageImage, deleteDocument } = require('../controllers/document.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadLimiter }         = require('../middleware/rateLimit');
const { validatePlacements }    = require('../middleware/validate');
const { documentUploader }      = require('../config/multer');

// POST /api/v1/documents/upload
// optionalAuth: allows both registered users and guests
// uploadLimiter: 10/hour abuse prevention
// documentUploader.single('document'): multer parses the file, validates mimetype, saves to disk
router.post(
  '/upload',
  optionalAuth,
  uploadLimiter,
  documentUploader.single('document'),
  uploadDocument
);

// GET /api/v1/documents/  — dashboard list (registered users only)
router.get('/', protect, listDocuments);

// GET /api/v1/documents/:id  — single document (user or guest)
router.get('/:id', optionalAuth, getDocument);

// PUT /api/v1/documents/:id/placements  — save editor positions
router.put('/:id/placements', optionalAuth, validatePlacements, savePlacements);

// GET /api/v1/documents/:id/page/:page  — serve document page as image for editor canvas
router.get('/:id/page/:page', optionalAuth, getPageImage);

// DELETE /api/v1/documents/:id
router.delete('/:id', protect, deleteDocument);

module.exports = router;
