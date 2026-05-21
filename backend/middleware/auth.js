'use strict';

/**
 * middleware/auth.js
 * JWT authentication middleware.
 *
 * Exports:
 *   protect      → 401 if no valid token (use on all private routes)
 *   optionalAuth → continues even without token, attaches guestSessionId if present
 */

const User           = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const { sendError }  = require('../utils/response');
const { COOKIE_NAME, GUEST_COOKIE } = require('../config/constants');
const { guestSessions } = require('../controllers/auth.controller');

// ── Core auth logic ────────────────────────────────────────────────────────────
const _authenticate = async (req) => {
  // 1. Look for token in cookie first (most secure for browsers)
  let token = req.cookies?.[COOKIE_NAME];

  // 2. Fall back to Authorization: Bearer <token> header (for API clients)
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return null;

  // 3. Verify token signature and expiry
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return null; // invalid or expired token
  }

  // 4. Confirm user still exists and is active in the database
  // password is excluded by default (select: false on the schema)
  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) return null;

  return user;
};

// ── protect ───────────────────────────────────────────────────────────────────
// Hard auth gate — returns 401 if authentication fails for any reason.
const protect = async (req, res, next) => {
  try {
    const user = await _authenticate(req);

    if (!user) {
      return sendError(res, 401, 'Authentication required. Please log in.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated. Contact support.');
    }

    req.user = user; // available in all downstream middleware and controllers
    next();
  } catch (err) {
    next(err);
  }
};

// ── optionalAuth ──────────────────────────────────────────────────────────────
// Soft auth — attaches req.user if valid token found, otherwise attaches
// guestSessionId from cookie. Controllers check which one is set.
const optionalAuth = async (req, res, next) => {
  try {
    const user = await _authenticate(req);

    if (user) {
      req.user = user;
    } else {
      // No authenticated user — check for guest session cookie
      const guestId = req.cookies?.[GUEST_COOKIE];
      if (guestId) {
        const session = guestSessions.get(guestId);
        if (session && session.expiresAt > Date.now()) {
          req.guestSessionId = guestId;
        }
        // If session not found or expired, guestSessionId stays undefined
        // Next controller will handle unauthorized access
      }
    }

    next(); // always continues — no 401
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, optionalAuth };
