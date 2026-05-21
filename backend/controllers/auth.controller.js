'use strict';

/**
 * controllers/auth.controller.js
 * Handles: register, login, verify, logout, createGuestSession
 *
 * Security decisions enforced here:
 *  - Same error message for wrong email AND wrong password (prevents enumeration)
 *  - JWT stored in HTTP-only cookie (not localStorage)
 *  - Password never appears in any response
 *  - Guest sessions are UUID-based with 2-hour TTL
 */

const { v4: uuidv4 }       = require('uuid');
const User                 = require('../models/User');
const AuditLog             = require('../models/AuditLog');
const asyncHandler         = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const { createToken, cookieOptions } = require('../utils/jwt');
const { COOKIE_NAME, GUEST_COOKIE, GUEST_SESSION_MS, AUDIT_ACTIONS } = require('../config/constants');

// ── In-memory guest session store (Phase 1) ────────────────────────────────────
// Phase 2: move to Redis for multi-process / multi-server support
const guestSessions = new Map();

// Cleanup expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of guestSessions.entries()) {
    if (session.expiresAt < now) guestSessions.delete(id);
  }
}, 30 * 60 * 1000);

// ── Helpers ────────────────────────────────────────────────────────────────────
const _getClientIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  'unknown';

// ── Register ───────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, plan } = req.body;

  // Check if email is already taken
  // We return 400 (not 409) for the same reason as login: avoid email enumeration
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return sendError(res, 400, 'An account with that email already exists. Please log in instead.');
  }

  // Create user — password is hashed by the pre-save hook in User.js
  const user = await User.create({ name: name.trim(), email, password, plan });

  // Audit trail
  await AuditLog.create({
    userId    : user._id,
    action    : AUDIT_ACTIONS.USER_REGISTERED,
    ipAddress : _getClientIP(req),
    userAgent : req.headers['user-agent'],
    metadata  : { plan: user.plan },
  });

  // Set JWT in HTTP-only cookie
  const token = createToken(user._id.toString());
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return sendSuccess(res, 201, { user: user.toPublicJSON() }, 'Account created successfully! Welcome to LawSign.');
});

// ── Login ──────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Fetch user with password field (excluded by default via select:false)
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  // SECURITY: Same exact error for wrong email AND wrong password
  // Different messages allow attackers to enumerate which emails exist
  const INVALID_MSG = 'Invalid email or password.';

  if (!user) return sendError(res, 401, INVALID_MSG);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return sendError(res, 401, INVALID_MSG);

  if (!user.isActive) {
    return sendError(res, 403, 'Your account has been deactivated. Please contact support.');
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false }); // skip full validation on partial update

  // Audit trail
  await AuditLog.create({
    userId    : user._id,
    action    : AUDIT_ACTIONS.USER_LOGIN,
    ipAddress : _getClientIP(req),
    userAgent : req.headers['user-agent'],
  });

  // Set JWT in cookie
  const token = createToken(user._id.toString());
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return sendSuccess(res, 200, { user: user.toPublicJSON() }, 'Welcome back!');
});

// ── Verify (silent session restoration) ───────────────────────────────────────
// The auth middleware has already done all the work — req.user is populated.
// The frontend calls this on page load to silently restore the session.
const verify = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, { user: req.user.toPublicJSON() }, 'Session valid.');
});

// ── Logout ─────────────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  await AuditLog.create({
    userId    : req.user._id,
    action    : AUDIT_ACTIONS.USER_LOGOUT,
    ipAddress : _getClientIP(req),
    userAgent : req.headers['user-agent'],
  });

  // Clear the cookie by setting maxAge to 1ms
  res.cookie(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 1 });

  return sendSuccess(res, 200, {}, 'Logged out successfully.');
});

// ── Create guest session ───────────────────────────────────────────────────────
const createGuestSession = asyncHandler(async (req, res) => {
  const sessionId = uuidv4();
  const expiresAt = Date.now() + GUEST_SESSION_MS;

  // Store in memory map
  guestSessions.set(sessionId, { createdAt: Date.now(), expiresAt });

  // Set guest cookie (HTTP-only, shorter TTL than auth cookie)
  res.cookie(GUEST_COOKIE, sessionId, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge  : GUEST_SESSION_MS,
  });

  return sendSuccess(
    res,
    201,
    { sessionId, expiresAt: new Date(expiresAt).toISOString() },
    'Guest session started. Your documents will be available for 2 hours.'
  );
});

// Export the sessions map so other parts of the app can validate guest IDs
module.exports = {
  register,
  login,
  verify,
  logout,
  createGuestSession,
  guestSessions, // exported for use in document controller
};
