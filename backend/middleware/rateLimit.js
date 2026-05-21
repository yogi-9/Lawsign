'use strict';

/**
 * middleware/rateLimit.js
 * Rate limiting middleware using express-rate-limit.
 *
 * Exports:
 *   generalLimiter  → 200 requests/15min for all routes
 *   authLimiter     → 10 requests/15min for auth routes
 *   uploadLimiter   → 10 requests/hour for upload routes
 *   generateLimiter → 5 requests/hour for PDF generation
 */

const rateLimit = require('express-rate-limit');

// ── General limiter (all routes) ──────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,  // 15 minutes
  max      : 200,
  message  : {
    success: false,
    error  : 'Too many requests. Please slow down and try again in a few minutes.',
  },
  standardHeaders: true,
  legacyHeaders  : false,
});

// ── Auth limiter (login/register) ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,  // 15 minutes
  max      : 10,
  message  : {
    success: false,
    error  : 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders  : false,
});

// ── Upload limiter ────────────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs : 60 * 60 * 1000,  // 1 hour
  max      : 20,
  keyGenerator: (req) => req.ip, // strictly by IP, ignoring session
  message  : {
    success: false,
    error  : 'Upload limit reached. Maximum 20 uploads per hour per IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders  : false,
});

// ── Generate limiter ──────────────────────────────────────────────────────────
const generateLimiter = rateLimit({
  windowMs : 60 * 60 * 1000,  // 1 hour
  max      : 5,
  message  : {
    success: false,
    error  : 'PDF generation limit reached. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders  : false,
});

module.exports = { generalLimiter, authLimiter, uploadLimiter, generateLimiter };
