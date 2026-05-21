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
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_PATHS } = require('../config/constants');
const { ensureDir } = require('./storage.service');

/**
 * Generate a signed PDF by embedding signature images at specified placements.
 *
 * @param {string} documentPath  - Absolute path to the original PDF
 * @param {string} signaturePath - Absolute path to the processed signature PNG
 * @param {Array}  placements    - Array of { page, x, y, width, height, rotation }
 * @param {string} mimeType      - MIME type of the original document
 * @returns {Promise<{ success: true, outputPath: string } | { success: false, error: string }>}
 */
const generateSignedPDF = async (documentPath, signaturePath, placements, mimeType = 'application/pdf') => {
  try {
    // ── 1. Load original document (PDF or Image) ──────────────────────────────
    let pdfDoc;
    let pageCount;

    if (mimeType === 'application/pdf') {
      const pdfBytes = fs.readFileSync(documentPath);
      pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } else if (mimeType.startsWith('image/')) {
      const sharp = require('sharp');
      // Convert to PNG buffer first to ensure pdf-lib compatibility
      const imgBuffer = await sharp(documentPath).png().toBuffer();
      
      pdfDoc = await PDFDocument.create();
      const embeddedImage = await pdfDoc.embedPng(imgBuffer);
      const { width, height } = embeddedImage.scale(1);
      
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
      pageCount = 1;
    } else {
      throw new Error(`Document type ${mimeType} cannot be converted to PDF.`);
    }

    // ── 2. Load and embed signature PNG ──────────────────────────────────────
    const sigBytes  = fs.readFileSync(signaturePath);
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
      // Editor sends percentages or absolute values
      let pdfX, cssY, sigWidth, sigHeight;
      if (placement.leftPct !== undefined) {
        // Use percentages (responsive to any page size)
        pdfX = (placement.leftPct / 100) * pageWidth;
        cssY = (placement.topPct / 100) * pageHeight;
        sigWidth = (placement.widthPct / 100) * pageWidth;
        sigHeight = (placement.heightPct / 100) * pageHeight;
      } else {
        // Fallback to absolute points
        pdfX = placement.x;
        cssY = placement.y;
        sigWidth = placement.width;
        sigHeight = placement.height;
      }

      const pdfY = pageHeight - cssY - sigHeight;

      // Clamp coordinates to stay within page bounds
      const x      = Math.max(0, Math.min(pdfX, pageWidth  - sigWidth));
      const y      = Math.max(0, Math.min(pdfY, pageHeight - sigHeight));
      const width  = Math.min(sigWidth,  pageWidth  - x);
      const height = Math.min(sigHeight, pageHeight - y);

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
    fs.writeFileSync(outputPath, signedPdfBytes);

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
    const bytes  = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return 1; // safe default
  }
};

module.exports = { generateSignedPDF, getPDFPageCount };
