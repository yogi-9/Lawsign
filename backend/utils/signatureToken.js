'use strict';

/**
 * utils/signatureToken.js
 * Generates and verifies HMAC-SHA256 tokens for secure signature image access.
 */

const crypto = require('crypto');

const SECRET = process.env.SIGNATURE_SECRET || 'lawsign-dev-signature-secret-key-123';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (matches JWT session lifetime)

/**
 * Generates a signed token for a given signature ID.
 * Payload includes: id, exp (expiration timestamp)
 */
const generateSignatureToken = (signatureId) => {
  const exp = Date.now() + TOKEN_EXPIRY_MS;
  const payload = `${signatureId}.${exp}`;
  
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const hash = hmac.digest('hex');
  
  // Format: payload_hash
  const token = `${Buffer.from(payload).toString('base64url')}.${hash}`;
  return token;
};

/**
 * Middleware to validate a signature token in req.query.token.
 */
const validateSignatureToken = (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    return res.status(403).json({ success: false, error: 'Signature token missing' });
  }

  try {
    const [b64Payload, hash] = token.split('.');
    if (!b64Payload || !hash) throw new Error('Malformed token');

    const payload = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const [signatureId, expStr] = payload.split('.');
    
    // Validate ID matches the path
    if (signatureId !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Token does not match signature ID' });
    }

    // Validate Expiry
    if (Date.now() > parseInt(expStr, 10)) {
      return res.status(403).json({ success: false, error: 'Signature token expired' });
    }

    // Validate HMAC
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    const expectedHash = hmac.digest('hex');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      return res.status(403).json({ success: false, error: 'Invalid signature token' });
    }

    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: 'Invalid signature token format' });
  }
};

module.exports = {
  generateSignatureToken,
  validateSignatureToken
};
