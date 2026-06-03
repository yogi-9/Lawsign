'use strict';

/**
 * utils/jwt.js
 * JWT creation, verification, and cookie configuration.
 * Controllers never import jsonwebtoken directly — they use these helpers.
 */

const jwt = require('jsonwebtoken');

/**
 * Create a signed JWT containing the userId.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} Signed JWT token
 */
const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Verify a JWT and return its decoded payload.
 * Throws JsonWebTokenError if invalid, TokenExpiredError if expired.
 * @param {string} token
 * @returns {{ userId: string, iat: number, exp: number }}
 */
const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

/**
 * Cookie options applied every time a token is stored in a cookie.
 *
 * httpOnly: true  → JS in the browser CANNOT read this cookie (XSS protection)
 * secure         → true in production (HTTPS only), false in dev (HTTP allowed)
 * sameSite: lax  → sent on same-site requests + top-level navigation (CSRF protection)
 * maxAge         → parsed from JWT_EXPIRES_IN (default 7 days in ms)
 */
const cookieOptions = () => ({
  httpOnly: true,
  secure  : process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge  : parseDurationToMs(process.env.JWT_EXPIRES_IN || '7d'),
});

// ── Helper: parse duration string to milliseconds ─────────────────────────────
// Supports: "7d" → 7 days, "24h" → 24 hours, "60m" → 60 minutes
const parseDurationToMs = (duration) => {
  const match = String(duration).match(/^(\d+)([dhm])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

  const value = parseInt(match[1], 10);
  const unit  = match[2];

  const multipliers = { d: 86400000, h: 3600000, m: 60000 };
  return value * multipliers[unit];
};

module.exports = { createToken, verifyToken, cookieOptions };
