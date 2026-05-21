'use strict';

/**
 * utils/asyncHandler.js
 * Wraps async controller functions so any thrown error is automatically
 * forwarded to Express's global error handler via next(error).
 *
 * Without this, an unhandled promise rejection in a controller either
 * crashes the process or hangs the request forever.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }));
 */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
