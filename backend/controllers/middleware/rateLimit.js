'use strict';

/**
 * middleware/rateLimit.js
 * Four separate rate limiters for different risk levels.
 * Applied at the route level — not globally (except generalLimiter).
 */

const rateLimit = require('express-rate-limit');

// ── Helper: build a rate limiter ──────────────────────────────────────────────
const buildLimiter = ({ windowMinutes, max, message }) =>
  rateLimit({
    windowMs         : windowMinutes * 60 * 1000,
    max,
    message          : { success: false, error: message },
    standardHeaders  : true,  // return RateLimit-* headers
    legacyHeaders    : false,
    skipSuccessfulRequests: false,
  });

// ── Auth limiter ──────────────────────────────────────────────────────────────
// 5 attempts per 15 minutes — prevents brute-force password attacks
const authLimiter = buildLimiter({
  windowMinutes: 15,
  max          : 5,
  message      : 'Too many login attempts. Please wait 15 minutes before trying again.',
});

// ── Upload limiter ────────────────────────────────────────────────────────────
// 10 uploads per hour — file processing is CPU/disk expensive
const uploadLimiter = buildLimiter({
  windowMinutes: 60,
  max          : 10,
  message      : 'Upload limit reached. You can upload up to 10 files per hour.',
});

// ── PDF generation limiter ────────────────────────────────────────────────────
// 20 generations per 24 hours — PDF generation is the most expensive operation
const generateLimiter = buildLimiter({
  windowMinutes: 24 * 60,
  max          : 20,
  message      : 'PDF generation limit reached (20 per day). Please try again tomorrow.',
});

// ── General limiter ───────────────────────────────────────────────────────────
// 100 requests per minute — global safety net, applied in server.js
const generalLimiter = buildLimiter({
  windowMinutes: 1,
  max          : 100,
  message      : 'Too many requests. Please slow down.',
});

module.exports = { authLimiter, uploadLimiter, generateLimiter, generalLimiter };
