'use strict';

/**
 * routes/document.routes.js
 * Maps /api/v1/documents/* URLs to controller functions.
 */

const router = require('express').Router();
const { uploadDocument, getDocument, listDocuments, savePlacements, getPageImage, deleteDocument, renameDocument } = require('../controllers/document.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadLimiter }         = require('../middleware/rateLimit');
const { validatePlacements, validateObjectId, validateUploadFile } = require('../middleware/validate');
const validateRequestSize       = require('../middleware/validateRequestSize');
const validateFileContent       = require('../middleware/validateFileContent');
const validateImageIntelligence = require('../middleware/validateImageIntelligence');
const { documentUploader }      = require('../config/multer');

// POST /api/v1/documents/upload
// optionalAuth: allows both registered users and guests
// uploadLimiter: 10/hour abuse prevention
// documentUploader.single('document'): multer parses the file, validates mimetype, saves to disk
// POST /api/v1/documents/upload
router.post(
  '/upload',
  optionalAuth,
  uploadLimiter,
  validateRequestSize(50 * 1024 * 1024), // 50MB limit
  documentUploader.single('document'),
  validateUploadFile,
  validateFileContent,
  validateImageIntelligence,
  uploadDocument
);

// GET /api/v1/documents/  — dashboard list (registered users only)
router.get('/', protect, listDocuments);

// GET /api/v1/documents/:id  — single document (user or guest)
router.get('/:id', optionalAuth, validateObjectId('id'), getDocument);

// PUT /api/v1/documents/:id/placements  — save editor positions
router.put('/:id/placements', optionalAuth, validateObjectId('id'), validatePlacements, savePlacements);

// GET /api/v1/documents/:id/page/:page  — serve document page as image for editor canvas
router.get('/:id/page/:page', 
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  optionalAuth, 
  validateObjectId('id'), 
  getPageImage
);
// DELETE /api/v1/documents/:id
router.delete('/:id', protect, validateObjectId('id'), deleteDocument);

// PUT /api/v1/documents/:id/rename
router.put('/:id/rename', protect, validateObjectId('id'), renameDocument);

module.exports = router;
