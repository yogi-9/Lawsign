'use strict';

/**
 * middleware/errorHandler.js
 * Global error handler — the LAST middleware registered in server.js.
 *
 * Every error thrown anywhere in the application (or passed to next(error))
 * ends up here. Maps known error types to clean HTTP responses.
 * Uses the AppError `isOperational` flag to determine response format.
 * Never exposes stack traces or programmer errors in production.
 */

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log full details in development only
  if (process.env.NODE_ENV !== 'production') {
    console.error('\n🔴 Error:', err.message);
    console.error(err.stack, '\n');
  }

  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let isOperational = err.isOperational || false;

  // ── Mongoose: invalid ObjectId format ─────────────────────────────────────
  // Example: GET /documents/not-a-valid-id
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid ID format: "${err.value}" is not a valid document ID.`;
    isOperational = true;
  }

  // ── Mongoose: duplicate key (unique constraint violated) ───────────────────
  // Most common: trying to register with an existing email
  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already registered. Please use a different one.`;
    isOperational = true;
  }

  // ── Mongoose: schema validation errors ────────────────────────────────────
  // Returns field-level messages for each failing constraint
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const fieldMessages = Object.values(err.errors).map((e) => e.message);
    message = fieldMessages.join(' | ');
    isOperational = true;
  }

  // ── JWT: tampered or malformed token ──────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid session token. Please log in again.';
    isOperational = true;
  }

  // ── JWT: expired token ────────────────────────────────────────────────────
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Your session has expired. Please log in again.';
    isOperational = true;
  }

  // ── Multer: file type or size violations ──────────────────────────────────
  else if (err.name === 'MulterError') {
    statusCode = 400;
    isOperational = true;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Please check the size limit for this upload type.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = err.message; // our custom message set in config/multer.js
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // ── Send final response ───────────────────────────────────────────────────
  // In production: never leak internal error details for non-operational errors
  // In development: include the actual message and stack trace for debugging
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: (isProd && !isOperational)
      ? 'Something went wrong on our end. Please try again later.'
      : message,
    ...(!isProd && !isOperational && { stack: err.stack }), // Only show stack trace for bugs in dev
  });
};

module.exports = errorHandler;
