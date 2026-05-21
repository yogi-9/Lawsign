/* ============================================================
   store.js — Shared session state between pages.
   upload.js writes here → editor.js reads from here.
   ============================================================ */

export const store = {
  // Set by upload.js after successful API calls
  documentId     : null,   // MongoDB ObjectId string
  signatureId    : null,   // MongoDB ObjectId string
  documentName   : null,   // original file name e.g. "contract.pdf"
  mimeType       : null,   // e.g. "application/pdf" or "image/png"
  pageCount      : 1,      // number of pages returned by backend
  detectedFields : [],     // array from OCR: [{ page, x, y, width, height, confidence, label }]
  signatureImageUrl: null, // URL to fetch the processed signature PNG

  // Set by editor.js when user confirms placements
  placements     : [],

  // Output
  outputDocumentId: null,  // after PDF generation

  clear() {
    this.documentId      = null;
    this.signatureId     = null;
    this.documentName    = null;
    this.mimeType        = null;
    this.pageCount       = 1;
    this.detectedFields  = [];
    this.signatureImageUrl = null;
    this.placements      = [];
    this.outputDocumentId = null;
  },
};
