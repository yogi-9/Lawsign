'use strict';

/**
 * middleware/errorHandler.js
 * Global error handler — the LAST middleware registered in server.js.
 *
 * Every error thrown anywhere in the application (or passed to next(error))
 * ends up here. Maps known error types to clean HTTP responses.
 * Never exposes stack traces in production.
 */

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log full details in development only
  if (process.env.NODE_ENV !== 'production') {
    console.error('\n🔴 Error:', err.message);
    console.error(err.stack, '\n');
  }

  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // ── Mongoose: invalid ObjectId format ─────────────────────────────────────
  // Example: GET /documents/not-a-valid-id
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid ID format: "${err.value}" is not a valid document ID.`;
  }

  // ── Mongoose: duplicate key (unique constraint violated) ───────────────────
  // Most common: trying to register with an existing email
  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already registered. Please use a different one.`;
  }

  // ── Mongoose: schema validation errors ────────────────────────────────────
  // Returns field-level messages for each failing constraint
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const fieldMessages = Object.values(err.errors).map((e) => e.message);
    message = fieldMessages.join(' | ');
  }

  // ── JWT: tampered or malformed token ──────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid session token. Please log in again.';
  }

  // ── JWT: expired token ────────────────────────────────────────────────────
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Your session has expired. Please log in again.';
  }

  // ── Multer: file type or size violations ──────────────────────────────────
  else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Please check the size limit for this upload type.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = err.message; // our custom message set in config/multer.js
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // ── Send final response ───────────────────────────────────────────────────
  // In production: never leak internal error details
  // In development: include the actual message for easy debugging
  res.status(statusCode).json({
    success: false,
    error  : statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong on our end. Please try again later.'
      : message,
    // Include stack trace only in development
    ...(process.env.NODE_ENV !== 'production' && statusCode === 500 && { stack: err.stack }),
  });
};

module.exports = errorHandler;
