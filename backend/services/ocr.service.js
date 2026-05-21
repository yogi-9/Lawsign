'use strict';

/**
 * services/ocr.service.js
 * Phase 1: Intelligent signature field detection WITHOUT Python OCR.
 *
 * Strategy:
 *  - For text-based PDFs: extract text via pdf-parse, scan for signature keywords
 *    and underscore patterns with confidence scoring.
 *  - For image files (scans): use heuristic positioning based on standard
 *    Indian legal document conventions (signature bottom-right, witnesses below).
 *
 * Returns: Array<{ page, x, y, width, height, confidence, label }>
 *
 * Phase 2 upgrade: Replace _processImageFile() with a Python Tesseract bridge
 * via child_process.spawn() — only this file changes.
 */

const pdfParse = require('pdf-parse');
const fs       = require('fs');
const { OCR, DEFAULT_SIG_FIELD } = require('../config/constants');

// ── Signature keyword patterns ─────────────────────────────────────────────────
// English legal document patterns
const ENGLISH_PATTERNS = [
  { regex: /signature\s*of\s*(party|person|applicant|claimant|defendant|plaintiff|witness|notary)?/i, label: 'Signature', confidence: OCR.CONFIDENCE.DIRECT_LABEL },
  { regex: /signed\s+by\s*:/i,                   label: 'Signed By',        confidence: OCR.CONFIDENCE.DIRECT_LABEL },
  { regex: /authorized\s+signatory/i,             label: 'Authorized Signatory', confidence: OCR.CONFIDENCE.DIRECT_LABEL },
  { regex: /signature\s*:/i,                      label: 'Signature',        confidence: OCR.CONFIDENCE.DIRECT_LABEL },
  { regex: /sign\s+here/i,                        label: 'Sign Here',        confidence: OCR.CONFIDENCE.DIRECT_LABEL },
  { regex: /party\s+[12aAbB]\s*(signature)?/i,    label: 'Party Signature',  confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /witness\s*(signature)?/i,             label: 'Witness',          confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /notary\s+public/i,                    label: 'Notary Public',    confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /executor\s*(signature)?/i,            label: 'Executor',         confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /guarantor\s*(signature)?/i,           label: 'Guarantor',        confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /lessor\s*(signature)?/i,              label: 'Lessor',           confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /lessee\s*(signature)?/i,              label: 'Lessee',           confidence: OCR.CONFIDENCE.PARTY_REF },
];

// Hindi / regional language legal terms (Devanagari)
const HINDI_PATTERNS = [
  { regex: /हस्ताक्षर/,  label: 'हस्ताक्षर (Signature)', confidence: OCR.CONFIDENCE.DIRECT_LABEL },
  { regex: /साक्षी/,     label: 'साक्षी (Witness)',      confidence: OCR.CONFIDENCE.PARTY_REF },
  { regex: /नोटरी/,     label: 'नोटरी (Notary)',        confidence: OCR.CONFIDENCE.PARTY_REF },
];

// Visual underscore sequence (classic blank signing line: ____________)
const UNDERSCORE_PATTERN = new RegExp(`_{${OCR.MIN_UNDERSCORES},}`, 'g');

const ALL_PATTERNS = [...ENGLISH_PATTERNS, ...HINDI_PATTERNS];

// ── Standard A4 PDF dimensions (in PDF points: 1pt = 1/72 inch) ───────────────
const PAGE_WIDTH  = 595;  // A4 width  in points
const PAGE_HEIGHT = 842;  // A4 height in points
const MARGIN      = 72;   // standard 1-inch margin in points

// ── Main export ────────────────────────────────────────────────────────────────
/**
 * Detect signature fields in an uploaded document.
 * @param {string} filePath   - Absolute path to the file on disk
 * @param {string} mimeType   - File mimetype
 * @returns {Promise<Array>}  - Detected fields
 */
const detectSignatureFields = async (filePath, mimeType) => {
  try {
    if (mimeType === 'application/pdf') {
      return await _processPDF(filePath);
    }

    if (mimeType.startsWith('image/')) {
      return _processImageFile();
    }

    // DOCX / DOC — treat as two-field document for now
    // Phase 2: use mammoth.js to extract text then run keyword scan
    return _defaultTwoFields();

  } catch (err) {
    console.error('[ocr] Detection failed, falling back to defaults:', err.message);
    return _defaultTwoFields();
  }
};

// ── PDF processing ─────────────────────────────────────────────────────────────
const _processPDF = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data   = await pdfParse(buffer);

  const lines      = data.text.split('\n');
  const pageCount  = data.numpages || 1;
  const fields     = [];

  lines.forEach((line, lineIndex) => {
    // Estimate which page this line falls on
    const linesPerPage = Math.ceil(lines.length / pageCount);
    const page         = Math.min(Math.floor(lineIndex / linesPerPage) + 1, pageCount);

    // Estimate Y position on page (PDF coordinate: 0 = bottom, PAGE_HEIGHT = top)
    const linePositionRatio = (lineIndex % linesPerPage) / linesPerPage;
    const y = PAGE_HEIGHT - MARGIN - linePositionRatio * (PAGE_HEIGHT - 2 * MARGIN) - DEFAULT_SIG_FIELD.height;

    // ── Check keyword patterns ──────────────────────────────────────────────
    for (const pattern of ALL_PATTERNS) {
      if (pattern.regex.test(line)) {
        fields.push({
          page,
          x         : MARGIN,
          y         : Math.max(MARGIN, y),
          width     : DEFAULT_SIG_FIELD.width,
          height    : DEFAULT_SIG_FIELD.height,
          confidence: pattern.confidence,
          label     : pattern.label,
        });
        break; // one pattern match per line is enough
      }
    }

    // ── Check underscore sequences ──────────────────────────────────────────
    const underscoreMatches = line.match(UNDERSCORE_PATTERN);
    if (underscoreMatches) {
      // Don't double-add if we already added from a keyword match
      const alreadyAdded = fields.some((f) => f.page === page && Math.abs(f.y - y) < 20);
      if (!alreadyAdded) {
        fields.push({
          page,
          x         : MARGIN + line.indexOf('_'),
          y         : Math.max(MARGIN, y),
          width     : Math.min(underscoreMatches[0].length * 6, PAGE_WIDTH - 2 * MARGIN),
          height    : DEFAULT_SIG_FIELD.height,
          confidence: OCR.CONFIDENCE.UNDERSCORE,
          label     : 'Signature Line',
        });
      }
    }
  });

  // If no fields detected at all, fall back to heuristic defaults
  return fields.length > 0 ? fields : _processImageFile(pageCount);
};

// ── Image / scan heuristic positioning ────────────────────────────────────────
// Based on common Indian legal document conventions:
//   - Primary signature: bottom-right of last page
//   - Witness: below primary, slightly left
const _processImageFile = (pageCount = 1) => [
  {
    page      : pageCount,
    x         : PAGE_WIDTH - 220,           // right side
    y         : MARGIN + 80,                // near bottom (PDF: y=0 is bottom)
    width     : DEFAULT_SIG_FIELD.width,
    height    : DEFAULT_SIG_FIELD.height,
    confidence: OCR.CONFIDENCE.HEURISTIC,
    label     : 'Primary Signature',
  },
  {
    page      : pageCount,
    x         : MARGIN,                     // left side
    y         : MARGIN + 80,
    width     : DEFAULT_SIG_FIELD.width,
    height    : DEFAULT_SIG_FIELD.height,
    confidence: OCR.CONFIDENCE.HEURISTIC,
    label     : 'Witness Signature',
  },
];

// ── Default two-field fallback ─────────────────────────────────────────────────
const _defaultTwoFields = () => _processImageFile(1);

module.exports = { detectSignatureFields };
