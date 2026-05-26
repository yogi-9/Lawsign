'use strict';

/**
 * middleware/validate.js
 * Request body validation middleware.
 *
 * Exports:
 *   validateRegister   → validates name, email, password for registration
 *   validateLogin      → validates email, password for login
 *   validatePlacements → validates placements array for document signing
 */

const { sendError } = require('../utils/response');

// ── Email regex ───────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Validate registration ─────────────────────────────────────────────────────
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long.');
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (errors.length > 0) {
    return sendError(res, 400, errors.join(' '));
  }

  next();
};

// ── Validate login ────────────────────────────────────────────────────────────
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push('Please provide a valid email address.');
  }

  if (!password) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return sendError(res, 400, errors.join(' '));
  }

  next();
};

// ── Validate placements ──────────────────────────────────────────────────────
const validatePlacements = (req, res, next) => {
  const { placements } = req.body;

  if (!placements || !Array.isArray(placements)) {
    return sendError(res, 400, 'Placements must be an array.');
  }

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    if (typeof p.page !== 'number' || p.page < 1) {
      return sendError(res, 400, `Placement ${i + 1}: page must be a positive number.`);
    }
    if (typeof p.x !== 'number' || typeof p.y !== 'number') {
      return sendError(res, 400, `Placement ${i + 1}: x and y coordinates are required.`);
    }
    if (typeof p.width !== 'number' || typeof p.height !== 'number') {
      return sendError(res, 400, `Placement ${i + 1}: width and height are required.`);
    }
  }

  next();
};
// ── Regex for ObjectId ────────────────────────────────────────────────────────
const OBJECTID_REGEX = /^[0-9a-fA-F]{24}$/;

// ── Validate Generate ────────────────────────────────────────────────────────
const validateGenerate = (req, res, next) => {
  const { documentId, signatureId } = req.body;
  if (!documentId || !OBJECTID_REGEX.test(documentId)) {
    return sendError(res, 400, 'Valid documentId is required.');
  }
  if (!signatureId || !OBJECTID_REGEX.test(signatureId)) {
    return sendError(res, 400, 'Valid signatureId is required.');
  }
  next();
};

// ── Validate Upload File ─────────────────────────────────────────────────────
const validateUploadFile = (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, 'No file uploaded. Please attach a file.');
  }
  next();
};

// ── Validate ObjectId (Factory) ──────────────────────────────────────────────
const validateObjectId = (field) => {
  return (req, res, next) => {
    const id = req.params[field];
    if (!id || !OBJECTID_REGEX.test(id)) {
      return sendError(res, 400, `Invalid format for parameter: ${field}`);
    }
    next();
  };
};

module.exports = { 
  validateRegister, 
  validateLogin, 
  validatePlacements,
  validateGenerate,
  validateUploadFile,
  validateObjectId
};
