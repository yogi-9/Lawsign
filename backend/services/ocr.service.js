'use strict';

/**
 * services/ocr.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Signature field detection for PDFs and scanned images.
 *
 * Architecture:
 *   1. EXTRACT  — Pull text + positions from the document (pdfjs / Tesseract)
 *   2. CLASSIFY — Run each text item through the keyword classifier
 *   3. FILTER   — Reject false positives (body-text mentions, wrong page zone)
 *   4. DEDUP    — Merge overlapping detections
 *
 * Coordinate convention (output):
 *   { page, xPct, yPct, widthPct, heightPct }
 *   All values are PERCENTAGES of page dimensions (0–100).
 *   Origin is top-left (CSS convention), so the frontend can use them directly.
 *   This eliminates all coordinate-system conversion bugs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const { OCR, DEFAULT_SIG_FIELD } = require('../config/constants');

// ═════════════════════════════════════════════════════════════════════════════
//  KEYWORD PATTERNS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * PRIMARY patterns — explicit signature instructions.
 * These are reliable regardless of where they appear on the page.
 * Each regex is tested against individual WORDS or SHORT phrases,
 * NOT full paragraph lines, to avoid body-text false positives.
 */
const PRIMARY_PATTERNS = [
  // "Signature:" label (the most common indicator)
  { regex: /^signature\s*[:;]\s*[_\-\.]*$/i,       label: 'Signature' },
  { regex: /^signature\s*$/i,                       label: 'Signature' },
  // "Sign Here" instruction
  { regex: /sign\s*here/i,                          label: 'Sign Here' },
  // "Authorized Signatory" label
  { regex: /^authorized\s+signatory/i,              label: 'Authorized Signatory' },
  // Hindi
  { regex: /हस्ताक्षर/,                              label: 'हस्ताक्षर (Signature)' },
];

/**
 * SECONDARY patterns — role headings in signature blocks.
 * Only matched against SHORT, STANDALONE text (≤25 chars)
 * to avoid matching "Both parties agree…" type sentences.
 */
const SECONDARY_PATTERNS = [
  { regex: /^party\s*[aAbB12]\s*$/i,    label: 'Party Signature' },
  { regex: /^witness\s*[:\d]*$/i,       label: 'Witness' },
  { regex: /^notary\s*public\s*$/i,     label: 'Notary Public' },
  { regex: /^landlord\s*$/i,            label: 'Landlord' },
  { regex: /^tenant\s*$/i,              label: 'Tenant' },
  { regex: /^lessor\s*$/i,              label: 'Lessor' },
  { regex: /^lessee\s*$/i,              label: 'Lessee' },
  { regex: /^buyer\s*$/i,              label: 'Buyer' },
  { regex: /^seller\s*$/i,             label: 'Seller' },
  { regex: /^guarantor\s*$/i,          label: 'Guarantor' },
  { regex: /^executor\s*$/i,           label: 'Executor' },
];

// ═════════════════════════════════════════════════════════════════════════════
//  CLASSIFIER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Classify a text string. Returns { label, confidence } or null.
 * @param {string} text - The text to classify
 */
function classify(text) {
  const t = text.trim();
  if (!t) return null;

  // Primary: always accept
  for (const p of PRIMARY_PATTERNS) {
    if (p.regex.test(t)) {
      return { label: p.label, confidence: OCR.CONFIDENCE.DIRECT_LABEL };
    }
  }

  // Secondary: only accept short standalone labels (≤25 chars)
  if (t.length <= 25) {
    for (const p of SECONDARY_PATTERNS) {
      if (p.regex.test(t)) {
        return { label: p.label, confidence: OCR.CONFIDENCE.PARTY_REF };
      }
    }
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  DEDUPLICATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Merge fields that are close together on both axes.
 * Two fields are "overlapping" if they're within 4% vertically AND 15% horizontally.
 * Keeps the higher-confidence detection.
 */
function dedup(fields) {
  if (fields.length <= 1) return fields;

  const sorted = fields.slice().sort((a, b) => a.yPct - b.yPct);
  const result = [];

  for (const field of sorted) {
    const overlap = result.find(f =>
      f.page === field.page &&
      Math.abs(f.yPct - field.yPct) < 4 &&
      Math.abs(f.xPct - field.xPct) < 15
    );
    if (overlap) {
      if (field.confidence > overlap.confidence) Object.assign(overlap, field);
    } else {
      result.push({ ...field });
    }
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════════════════
//  FIELD FACTORY
// ═════════════════════════════════════════════════════════════════════════════

/** Default signature box size as percentage of page */
const SIG_WIDTH_PCT  = 25;
const SIG_HEIGHT_PCT = 7;

/**
 * Create a standardized field object.
 * All coordinates are percentages (0–100), origin top-left.
 */
function makeField(page, xPct, yPct, label, confidence) {
  const clampedX = Math.max(0, Math.min(xPct, 100 - SIG_WIDTH_PCT));
  const clampedY = Math.max(0, Math.min(yPct, 100 - SIG_HEIGHT_PCT));

  return {
    page,
    // ── New: percentage-based (top-left origin, CSS convention) ────────────
    xPct:      clampedX,
    yPct:      clampedY,
    widthPct:  SIG_WIDTH_PCT,
    heightPct: SIG_HEIGHT_PCT,
    label,
    confidence,
    // ── Legacy: absolute PDF points (for store validation & backward compat)
    x:      (clampedX / 100) * 595,
    y:      ((100 - clampedY - SIG_HEIGHT_PCT) / 100) * 842,  // convert top% → PDF bottom-origin
    width:  DEFAULT_SIG_FIELD.width,
    height: DEFAULT_SIG_FIELD.height,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

const detectSignatureFields = async (filePath, mimeType) => {
  try {
    let fields;
    if (mimeType === 'application/pdf') {
      fields = await processPDF(filePath);
    } else if (mimeType.startsWith('image/')) {
      fields = await processImage(filePath);
    } else {
      fields = [];
    }

    console.log(`[ocr] Final: ${fields.length} signature field(s) detected`);
    return fields;
  } catch (err) {
    console.error('[ocr] Detection failed:', err.message);
    return [];
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  PDF PROCESSING (pdfjs-dist)
// ═════════════════════════════════════════════════════════════════════════════

async function processPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data   = new Uint8Array(buffer);

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf      = await pdfjsLib.getDocument({
    data,
    standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/',
  }).promise;

  const fields = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page    = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const vp      = page.getViewport({ scale: 1 });
    const pw      = vp.width;
    const ph      = vp.height;

    // Build lines by grouping items with similar Y
    const lines = _groupIntoLines(content.items, pw, ph);

    for (const line of lines) {
      const match = classify(line.text);
      if (match) {
        // PDF Y is from bottom; convert to top-percentage
        const topPct = ((ph - line.y) / ph) * 100;
        const leftPct = (line.x / pw) * 100;

        fields.push(makeField(pageNum, leftPct, topPct, match.label, match.confidence));
        console.log(`[ocr/pdf] ✓ "${line.text}" → ${match.label} (${leftPct.toFixed(0)}%, ${topPct.toFixed(0)}%)`);
      }
    }
  }

  const result = dedup(fields);
  return result.length > 0 ? result : await processImage(filePath);
}

/**
 * Group PDF text items into logical lines.
 * Items on the same Y (within 5pt tolerance) are merged.
 * Unlike before, we DON'T merge items that are far apart horizontally
 * (e.g., "Party A" on the left and "Party B" on the right stay separate).
 */
function _groupIntoLines(items, pageWidth, _pageHeight) {
  const sorted = items.filter(i => i.str.trim()).sort((a, b) => {
    const dy = b.transform[5] - a.transform[5]; // top to bottom
    if (Math.abs(dy) > 5) return dy;
    return a.transform[4] - b.transform[4]; // left to right
  });

  const lines = [];
  let cur = null;

  for (const item of sorted) {
    const x = item.transform[4];
    const y = item.transform[5];

    if (!cur || Math.abs(cur.y - y) > 5 || (x - cur.xEnd) > pageWidth * 0.15) {
      // Start a new line if Y differs or horizontal gap > 15% of page width
      if (cur) lines.push(cur);
      cur = { text: item.str, x, y, xEnd: x + (item.width || 0) };
    } else {
      cur.text += ' ' + item.str;
      cur.xEnd = x + (item.width || 0);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ═════════════════════════════════════════════════════════════════════════════
//  IMAGE PROCESSING (Tesseract.js)
// ═════════════════════════════════════════════════════════════════════════════

const Tesseract = require('tesseract.js');
const sharp = require('sharp');

async function processImage(filePath) {
  // Use sharp to get actual dimensions because Tesseract v7 data object
  // doesn't reliably return width/height in its output.
  const metadata = await sharp(filePath).metadata();
  const imgW = metadata.width  || 595;
  const imgH = metadata.height || 842;

  const worker = await Tesseract.createWorker('eng');
  const { data } = await worker.recognize(filePath, {}, { blocks: true });
  await worker.terminate();

  const fields = [];

  console.log(`[ocr/img] Tesseract: ${imgW}×${imgH}, scanning...`);

  // Flatten to words (NOT lines) so that "Signature:  Signature:" doesn't merge
  const words = data.blocks
    ? data.blocks.flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words || [])))
    : [];

  // Also get lines for line-level analysis
  const lines = data.blocks
    ? data.blocks.flatMap(b => b.paragraphs.flatMap(p => p.lines))
    : [];

  // ── Strategy 1: Check each LINE for primary patterns ──────────────────────
  // But SPLIT lines at large horizontal gaps to handle side-by-side text
  for (const line of lines) {
    if (!line || !line.text) continue;
    const lineWords = line.words || [];
    if (lineWords.length === 0) continue;

    // Split line into segments at large horizontal gaps (>15% of image width)
    const segments = _splitLineIntoSegments(lineWords, imgW);

    for (const seg of segments) {
      const match = classify(seg.text);
      if (match) {
        const xPct = (seg.x0 / imgW) * 100;
        const yPct = (seg.y0 / imgH) * 100;

        fields.push(makeField(1, xPct, yPct + 2, match.label, match.confidence));
        console.log(`[ocr/img] ✓ "${seg.text}" → ${match.label} at (${xPct.toFixed(0)}%, ${yPct.toFixed(0)}%)`);
      }
    }
  }

  const result = dedup(fields);
  console.log(`[ocr/img] Result: ${result.length} field(s)`);
  return result;
}

/**
 * Split a Tesseract line into segments when there's a large horizontal gap
 * between words. This prevents "Party A  Party B" from being treated as one text.
 */
function _splitLineIntoSegments(words, imgWidth) {
  if (words.length === 0) return [];

  const GAP_THRESHOLD = imgWidth * 0.12; // 12% of page width
  const segments = [];
  let seg = {
    text: words[0].text,
    x0: words[0].bbox.x0,
    y0: words[0].bbox.y0,
    x1: words[0].bbox.x1,
    y1: words[0].bbox.y1,
  };

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].bbox.x0 - seg.x1;
    if (gap > GAP_THRESHOLD) {
      // Large gap → start new segment
      segments.push(seg);
      seg = {
        text: words[i].text,
        x0: words[i].bbox.x0,
        y0: words[i].bbox.y0,
        x1: words[i].bbox.x1,
        y1: words[i].bbox.y1,
      };
    } else {
      seg.text += ' ' + words[i].text;
      seg.x1 = words[i].bbox.x1;
      seg.y1 = Math.max(seg.y1, words[i].bbox.y1);
    }
  }
  segments.push(seg);
  return segments;
}

// ═════════════════════════════════════════════════════════════════════════════

module.exports = { detectSignatureFields };
