'use strict';

/**
 * routes/audit.routes.js
 * Maps /api/v1/audit/* URLs to controller functions.
 */

const router = require('express').Router();
const { verifyAuditLogs } = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

// GET /api/v1/audit/:documentId/verify
// Verifies integrity of all audit logs for a given document.
// Protected to authenticated users (could be restricted to admins if role-based auth is added).
router.get('/:documentId/verify', protect, validateObjectId('documentId'), verifyAuditLogs);

module.exports = router;
