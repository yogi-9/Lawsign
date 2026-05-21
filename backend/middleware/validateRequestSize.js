'use strict';

/**
 * middleware/validateRequestSize.js
 * Validates Content-Length header before streaming file to Multer.
 */

const { sendError } = require('../utils/response');

const validateRequestSize = (maxBytes) => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];

    if (!contentLength) {
      return sendError(res, 411, 'Length Required');
    }

    const length = parseInt(contentLength, 10);

    if (isNaN(length)) {
      return sendError(res, 400, 'Invalid Content-Length header');
    }

    if (length > maxBytes) {
      return sendError(res, 413, `Payload Too Large: Exceeds maximum allowed size of ${maxBytes / (1024 * 1024)}MB.`);
    }

    next();
  };
};

module.exports = validateRequestSize;
