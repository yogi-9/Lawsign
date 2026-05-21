'use strict';

/**
 * services/pdf.service.js
 * Embeds signature images into the original PDF at confirmed placement coordinates.
 *
 * Key technical decisions:
 *  - pdf-lib reads and modifies existing PDFs without re-rendering them,
 *    preserving all original fonts, images, and content perfectly.
 *  - Coordinate system conversion: editor uses CSS (top-left origin, Y↓)
 *    but PDF uses (bottom-left origin, Y↑). The conversion is: pdf_y = pageHeight - css_y - height
 *  - Output is saved with a UUID in the filename to prevent collisions.
 */

const { PDFDocument } = require('pdf-lib');
const fs   = require('path');
const path = require('path');
const fss  = require('fs');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_PATHS } = require('../config/constants');
const { ensureDir }    = require('./storage.service');

/**
 * Generate a signed PDF by embedding signature images at specified placements.
 *
 * @param {string} documentPath  - Absolute path to the original PDF
 * @param {string} signaturePath - Absolute path to the processed signature PNG
 * @param {Array}  placements    - Array of { page, x, y, width, height, rotation }
 * @returns {Promise<{ success: true, outputPath: string } | { success: false, error: string }>}
 */
const generateSignedPDF = async (documentPath, signaturePath, placements) => {
  try {
    // ── 1. Load original PDF ──────────────────────────────────────────────────
    const pdfBytes = fss.readFileSync(documentPath);
    const pdfDoc   = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true, // handle password-protected PDFs gracefully
    });

    const pageCount = pdfDoc.getPageCount();

    // ── 2. Load and embed signature PNG ──────────────────────────────────────
    const sigBytes  = fss.readFileSync(signaturePath);
    const sigImage  = await pdfDoc.embedPng(sigBytes);

    // ── 3. Draw signature on each placement ──────────────────────────────────
    for (const placement of placements) {
      const pageIndex = placement.page - 1; // placements use 1-based pages

      if (pageIndex < 0 || pageIndex >= pageCount) {
        console.warn(`[pdf] Placement references page ${placement.page} but document only has ${pageCount} pages. Skipping.`);
        continue;
      }

      const page       = pdfDoc.getPages()[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // ── Coordinate conversion ─────────────────────────────────────────────
      // Editor sends CSS coordinates (origin: top-left, Y increases downward)
      // PDF-lib uses coordinates with origin at bottom-left, Y increases upward
      //
      //   pdf_x = css_x                         (X axis is the same direction)
      //   pdf_y = pageHeight - css_y - placement.height
      const pdfX = placement.x;
      const pdfY = pageHeight - placement.y - placement.height;

      // Clamp coordinates to stay within page bounds
      const x      = Math.max(0, Math.min(pdfX, pageWidth  - placement.width));
      const y      = Math.max(0, Math.min(pdfY, pageHeight - placement.height));
      const width  = Math.min(placement.width,  pageWidth  - x);
      const height = Math.min(placement.height, pageHeight - y);

      // Draw the signature image
      page.drawImage(sigImage, {
        x,
        y,
        width,
        height,
        rotate: placement.rotation
          ? { type: 'degrees', angle: placement.rotation }
          : undefined,
        opacity: 1,
      });
    }

    // ── 4. Serialize and write output ─────────────────────────────────────────
    const outputDir      = UPLOAD_PATHS.OUTPUTS;
    ensureDir(outputDir);

    const originalName   = path.basename(documentPath);
    const outputFilename = `signed-${uuidv4().slice(0, 8)}-${originalName}`;
    const outputPath     = path.join(outputDir, outputFilename);

    const signedPdfBytes = await pdfDoc.save();
    fss.writeFileSync(outputPath, signedPdfBytes);

    console.log(`[pdf] Signed PDF saved → ${outputPath}`);
    return { success: true, outputPath };

  } catch (err) {
    console.error('[pdf] Generation failed:', err.message);
    return {
      success: false,
      error  : `PDF generation failed: ${err.message}`,
    };
  }
};

/**
 * Get the page count of a PDF without full parsing.
 * Used to populate document.pageCount after upload.
 * @param {string} pdfPath
 * @returns {Promise<number>}
 */
const getPDFPageCount = async (pdfPath) => {
  try {
    const bytes  = fss.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return 1; // safe default
  }
};

module.exports = { generateSignedPDF, getPDFPageCount };
