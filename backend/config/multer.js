'use strict';

/**
 * config/multer.js
 * Two Multer upload instances — one for legal documents, one for signatures.
 * Files are validated by ACTUAL MIMETYPE (not just extension) before hitting disk.
 */

const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  ALLOWED_DOC_MIMETYPES,
  ALLOWED_SIG_MIMETYPES,
  MAX_DOC_SIZE_BYTES,
  MAX_SIG_SIZE_BYTES,
  UPLOAD_PATHS,
} = require('./constants');

// ── Helper: build disk storage config ────────────────────────────────────────
const buildDiskStorage = (destination) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename   : (_req, file, cb) => {
      const ext      = path.extname(file.originalname).toLowerCase();
      const safeName = `${uuidv4()}${ext}`;
      cb(null, safeName);
    },
  });

// ── Document upload ───────────────────────────────────────────────────────────
const documentUploader = multer({
  storage : buildDiskStorage(UPLOAD_PATHS.DOCUMENTS),
  limits  : { fileSize: MAX_DOC_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOC_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE',
          `File type not allowed. Accepted: PDF, DOCX, DOC, JPG, PNG, TIFF. Got: ${file.mimetype}`
        )
      );
    }
  },
});

// ── Signature upload ──────────────────────────────────────────────────────────
const signatureUploader = multer({
  storage : buildDiskStorage(UPLOAD_PATHS.SIGNATURES_RAW),
  limits  : { fileSize: MAX_SIG_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_SIG_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE',
          `File type not allowed. Accepted: JPG, PNG, WEBP. Got: ${file.mimetype}`
        )
      );
    }
  },
});

module.exports = { documentUploader, signatureUploader };
