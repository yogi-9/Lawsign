'use strict';

/**
 * services/pageRenderer.service.js
 * Converts uploaded document pages to PNG images for the editor canvas.
 *
 * Strategy:
 *  - IMAGE documents (JPG/PNG/TIFF): serve the original file directly (no conversion needed)
 *  - PDF documents: use pdf-lib to extract each page, then sharp to render as PNG
 *    Since we can't use native `canvas` on Windows, we take a simpler approach:
 *    We create a high-quality preview by using sharp to convert/resize the original
 *    for images, and for PDFs we use pdf2pic-like approach with pdf-lib + sharp.
 *
 * For PDFs without native canvas, we use a practical approach:
 *  - Extract the PDF page as a separate single-page PDF
 *  - The frontend will render this using PDF.js in the browser (which HAS canvas)
 *  - This avoids the native canvas dependency entirely
 *
 * Cache: Rendered page images are cached in uploads/page-cache/{docId}/
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { ensureDir }   = require('./storage.service');
const { UPLOAD_PATHS } = require('../config/constants');

const PAGE_CACHE_DIR = UPLOAD_PATHS.PAGE_CACHE || 'uploads/page-cache';

/**
 * Get a single page of a PDF as a standalone PDF buffer.
 * The frontend will render this with PDF.js in the browser canvas.
 * 
 * @param {string} pdfPath - Path to the original PDF
 * @param {number} pageNum - 1-based page number
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
const extractPDFPage = async (pdfPath, pageNum) => {
  const cacheDir  = path.join(PAGE_CACHE_DIR, path.basename(pdfPath, path.extname(pdfPath)));
  const cachePath = path.join(cacheDir, `page-${pageNum}.pdf`);

  // Return cached version if exists
  if (fs.existsSync(cachePath)) {
    return {
      buffer: fs.readFileSync(cachePath),
      contentType: 'application/pdf',
    };
  }

  // Extract the single page
  const pdfBytes = fs.readFileSync(pdfPath);
  const srcDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  if (pageNum < 1 || pageNum > pageCount) {
    throw new Error(`Page ${pageNum} out of range (document has ${pageCount} pages)`);
  }

  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
  newDoc.addPage(copiedPage);
  const singlePageBytes = await newDoc.save();

  // Cache it
  ensureDir(cacheDir);
  const tempPath = cachePath + '.tmp';
  fs.writeFileSync(tempPath, singlePageBytes);
  fs.renameSync(tempPath, cachePath);

  return {
    buffer: Buffer.from(singlePageBytes),
    contentType: 'application/pdf',
  };
};

/**
 * Get a document page as a serveable image/PDF.
 * 
 * @param {string} filePath - Path to the original document
 * @param {string} mimeType - MIME type of the original document
 * @param {number} pageNum - 1-based page number
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
const getDocumentPageImage = async (filePath, mimeType, pageNum) => {
  // ── Image documents: serve the original (optionally resized) ───────────
  if (mimeType.startsWith('image/')) {
    if (pageNum !== 1) {
      throw new Error('Image documents only have 1 page');
    }

    // Use sharp to normalize to PNG and ensure reasonable size
    const buffer = await sharp(filePath)
      .resize(1200, null, { withoutEnlargement: true, fit: 'inside' })
      .png({ quality: 90 })
      .toBuffer();

    return { buffer, contentType: 'image/png' };
  }

  // ── PDF documents: extract single page as PDF for browser rendering ────
  if (mimeType === 'application/pdf') {
    return extractPDFPage(filePath, pageNum);
  }

  // ── DOCX/DOC fallback ─────────────────────────────────────────────────
  throw new Error(`Page rendering not supported for mime type: ${mimeType}`);
};

module.exports = { getDocumentPageImage, extractPDFPage };
