'use strict';

/**
 * utils/response.js
 * Consistent API response shape for all endpoints.
 *
 * Every success response:  { success: true,  message, data: {...} }
 * Every error response:    { success: false, error: "message" }
 *
 * The frontend can always check response.success without inspecting HTTP codes.
 */

/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {number} statusCode  - HTTP status code (200, 201, etc.)
 * @param {object} data        - Payload to nest under the "data" key
 * @param {string} [message]   - Human-readable success message
 */
const sendSuccess = (res, statusCode, data = {}, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error JSON response.
 * @param {import('express').Response} res
 * @param {number} statusCode  - HTTP status code (400, 401, 404, 500, etc.)
 * @param {string} message     - Human-readable error description
 * @param {object} [errors]    - Optional field-level validation errors
 */
const sendError = (res, statusCode, message, errors = null) => {
  const body = { success: false, error: message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
