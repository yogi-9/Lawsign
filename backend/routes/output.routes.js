'use strict';

/**
 * routes/output.routes.js
 * Maps /api/v1/output/* URLs to controller functions.
 */

const router = require('express').Router();
const { generatePDF, downloadPDF, getStatus } = require('../controllers/output.controller');
const { optionalAuth }    = require('../middleware/auth');
const { generateLimiter } = require('../middleware/rateLimit');

// POST /api/v1/output/generate  — trigger signed PDF generation
router.post('/generate', optionalAuth, generateLimiter, generatePDF);

// GET /api/v1/output/download/:id  — stream signed PDF to client
router.get('/download/:id', optionalAuth, downloadPDF);

// GET /api/v1/output/status/:id  — polling fallback (when Socket.io not available)
router.get('/status/:id', optionalAuth, getStatus);

module.exports = router;
