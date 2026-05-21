'use strict';

/**
 * config/constants.js
 * Single source of truth for every magic string and number in the application.
 * Import from here — never hardcode values in controllers or services.
 */

// ── Cookie names ──────────────────────────────────────────────────────────────
const COOKIE_NAME  = 'lawsign_token';
const GUEST_COOKIE = 'lawsign_guest';

// ── Guest mode ────────────────────────────────────────────────────────────────
const GUEST_DOC_LIMIT      = 2;   // max documents a guest can upload
const GUEST_SESSION_HOURS  = 2;   // session TTL in hours
const GUEST_SESSION_MS     = GUEST_SESSION_HOURS * 60 * 60 * 1000;

// ── Document processing statuses ─────────────────────────────────────────────
const DOC_STATUS = Object.freeze({
  UPLOADING        : 'uploading',
  PROCESSING       : 'processing',
  READY            : 'ready',
  PLACEMENTS_SAVED : 'placements_saved',
  SIGNED           : 'signed',
  FAILED           : 'failed',
});

// ── Audit log action names ────────────────────────────────────────────────────
const AUDIT_ACTIONS = Object.freeze({
  DOCUMENT_UPLOADED  : 'document_uploaded',
  SIGNATURE_UPLOADED : 'signature_uploaded',
  OCR_PROCESSED      : 'ocr_processed',
  PLACEMENTS_SAVED   : 'placements_saved',
  PDF_GENERATED      : 'pdf_generated',
  PDF_DOWNLOADED     : 'pdf_downloaded',
  USER_REGISTERED    : 'user_registered',
  USER_LOGIN         : 'user_login',
  USER_LOGOUT        : 'user_logout',
  DOCUMENT_DELETED   : 'document_deleted',
  SIGNATURE_DELETED  : 'signature_deleted',
});

// ── Allowed file types ────────────────────────────────────────────────────────
const ALLOWED_DOC_MIMETYPES = Object.freeze([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                        // .doc
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
]);

const ALLOWED_SIG_MIMETYPES = Object.freeze([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

// ── File size limits ──────────────────────────────────────────────────────────
const MAX_DOC_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_SIG_SIZE_BYTES =  5 * 1024 * 1024; //  5 MB

// ── Signature field defaults (used when OCR confidence is low) ────────────────
const DEFAULT_SIG_FIELD = Object.freeze({
  width : 200,
  height:  60,
});

// ── Signature image processing ────────────────────────────────────────────────
const SIG_PROCESSING = Object.freeze({
  BG_THRESHOLD       : 230,   // RGB value above which a pixel is considered white
  OUTPUT_MAX_WIDTH   : 400,   // px — max width after resize
  OUTPUT_FORMAT      : 'png', // always PNG to preserve transparency
});

// ── OCR field detection ───────────────────────────────────────────────────────
const OCR = Object.freeze({
  MIN_UNDERSCORES : 5,          // minimum consecutive underscores to be a signature line
  CONFIDENCE      : Object.freeze({
    DIRECT_LABEL  : 0.95,
    PARTY_REF     : 0.80,
    UNDERSCORE    : 0.75,
    HEURISTIC     : 0.60,
  }),
});

// ── Subscription plans ────────────────────────────────────────────────────────
const PLANS = Object.freeze({
  FREE: 'free',
  SOLO: 'solo',
  FIRM: 'firm',
});

// ── Storage paths (relative to backend root) ──────────────────────────────────
const UPLOAD_PATHS = Object.freeze({
  DOCUMENTS       : 'uploads/documents',
  SIGNATURES_RAW  : 'uploads/signatures/raw',
  SIGNATURES_PROC : 'uploads/signatures/processed',
  OUTPUTS         : 'uploads/outputs',
  PAGE_CACHE      : 'uploads/page-cache',
});

module.exports = {
  COOKIE_NAME,
  GUEST_COOKIE,
  GUEST_DOC_LIMIT,
  GUEST_SESSION_HOURS,
  GUEST_SESSION_MS,
  DOC_STATUS,
  AUDIT_ACTIONS,
  ALLOWED_DOC_MIMETYPES,
  ALLOWED_SIG_MIMETYPES,
  MAX_DOC_SIZE_BYTES,
  MAX_SIG_SIZE_BYTES,
  DEFAULT_SIG_FIELD,
  SIG_PROCESSING,
  OCR,
  PLANS,
  UPLOAD_PATHS,
};
