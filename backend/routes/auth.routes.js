'use strict';

/**
 * routes/auth.routes.js
 * Maps /api/v1/auth/* URLs to controller functions.
 * No logic here — routes are just an address book.
 */

const router = require('express').Router();
const { register, login, verify, logout, createGuestSession } = require('../controllers/auth.controller');
const { protect }          = require('../middleware/auth');
const { authLimiter }      = require('../middleware/rateLimit');
const { validateRegister, validateLogin } = require('../middleware/validate');

// POST /api/v1/auth/register
router.post('/register', authLimiter, validateRegister, register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateLogin, login);

// GET  /api/v1/auth/verify  — silent session restore (frontend calls on page load)
router.get('/verify', protect, verify);

// POST /api/v1/auth/logout
router.post('/logout', protect, logout);

// POST /api/v1/auth/guest  — start a guest session
router.post('/guest', createGuestSession);

module.exports = router;
