'use strict';

/**
 * middleware/validate.js
 * Lightweight request body validation helpers.
 * No external validation library needed — keeps the bundle lean.
 *
 * Each validator calls next() if valid, or returns 400 with field errors if not.
 */

const { sendError } = require('../../utils/response');

// ── Helper: collect field errors and return early if any ──────────────────────
const check = (res, errors) => {
  if (Object.keys(errors).length > 0) {
    sendError(res, 400, 'Validation failed', errors);
    return false;
  }
  return true;
};

const isValidEmail = (email) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email);

// ── Register validator ─────────────────────────────────────────────────────────
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = {};

  if (!name || String(name).trim().length < 2)
    errors.name = 'Name must be at least 2 characters.';

  if (!email || !isValidEmail(email))
    errors.email = 'A valid email address is required.';

  if (!password || String(password).length < 6)
    errors.password = 'Password must be at least 6 characters.';

  if (!check(res, errors)) return;
  next();
};

// ── Login validator ────────────────────────────────────────────────────────────
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  // Intentionally same error for both fields — prevents email enumeration
  if (!email || !password)
    errors.credentials = 'Email and password are required.';

  if (!check(res, errors)) return;
  next();
};

// ── Placements validator ───────────────────────────────────────────────────────
const validatePlacements = (req, res, next) => {
  const { placements } = req.body;
  const errors = {};

  if (!Array.isArray(placements) || placements.length === 0) {
    errors.placements = 'At least one placement is required.';
  } else {
    const invalid = placements.some(
      (p) =>
        typeof p.page !== 'number' ||
        typeof p.x !== 'number' ||
        typeof p.y !== 'number' ||
        typeof p.width !== 'number' ||
        typeof p.height !== 'number'
    );
    if (invalid)
      errors.placements = 'Each placement must have: page, x, y, width, height (all numbers).';
  }

  if (!check(res, errors)) return;
  next();
};

module.exports = { validateRegister, validateLogin, validatePlacements };
