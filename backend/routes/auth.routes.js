'use strict';

/**
 * routes/auth.routes.js
 * Maps /api/v1/auth/* URLs to controller functions.
 * No logic here — routes are just an address book.
 */

const router = require('express').Router();
const passport = require('passport');
const { register, login, verify, logout, googleCallback, createGuestSession } = require('../controllers/auth.controller');
const { protect }          = require('../middleware/auth');
const { authLimiter }      = require('../middleware/rateLimit');
const { validateRegister, validateLogin } = require('../middleware/validate');

// POST /api/v1/auth/register
router.post('/register', authLimiter, validateRegister, register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateLogin, login);

// GET /api/v1/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET /api/v1/auth/google/callback
router.get('/google/callback', (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${frontendUrl}/#/login?error=auth_cancelled` 
  })(req, res, next);
}, googleCallback);

// GET  /api/v1/auth/verify  — silent session restore (frontend calls on page load)
router.get('/verify', protect, verify);

// POST /api/v1/auth/logout
router.post('/logout', protect, logout);

// POST /api/v1/auth/guest  — start a guest session
router.post('/guest', createGuestSession);

module.exports = router;
