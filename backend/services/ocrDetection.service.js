'use strict';

/**
 * services/ocrDetection.service.js
 * Node.js bridge to the Python OCR microservice.
 *
 * Exports: detectSignatureFields(filePath, mimeType)
 */

const path = require('path');
// Import the existing fallback OCR service
const { detectSignatureFields: fallbackDetect } = require('./ocr.service');

const PYTHON_OCR_URL = 'http://localhost:5002/detect-fields';
const TIMEOUT_MS = 60_000; // 60 seconds

async function detectSignatureFields(filePath, mimeType) {
  const absPath = path.resolve(filePath);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(PYTHON_OCR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: absPath, mime_type: mimeType }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Python service returned error: ${result.error}`);
    }

    if (result.fields.length === 0) {
      throw new Error(`Python OCR found 0 fields (likely missing Tesseract binary)`);
    }

    console.log(`[ocrDetection] ✔ Python OCR — ${result.fields.length} fields in ${result.processingTimeMs}ms`);
    
    // Convert old response array format to [fields, pageCount] to match fallback signature if needed,
    // but the controller expects just `fields` and `pageCount` as separate vars,
    // wait, the controller expects: [detectedFields, pageCount] = await detectSignatureFields(...)
    // Let's return the array [fields, pageCount] to match exactly what document.controller.js expects.
    return { fields: result.fields, pageCount: result.pageCount };

  } catch (err) {
    const reason =
      err.cause?.code === 'ECONNREFUSED' ? 'service unreachable' :
      err.name === 'AbortError'          ? 'timeout (60 s)'     :
      err.message                        || 'unknown';

    console.log(`[ocrDetection] ⚠ Python unavailable (${reason}) — using Node.js fallback.`);

    // Fall back to existing Node.js OCR service which returns just `fields` array
    // Controller expects [fields, pageCount] so we just return [fields, 1] if fallback is used
    // Wait, the original controller did: [detectedFields, pageCount] = await Promise.all([detectSignatureFields(file.path, file.mimetype), ...])
    // So the original detectSignatureFields returned ONLY detectedFields.
    // Let me check how document.controller.js uses it.
    // The prompt says: "Return { fields, pageCount } where fields are the percentage-based objects"
    // Wait, let me check the instruction for `ocrDetection.service.js`:
    // "On Python success: return { fields, pageCount } where fields are the percentage-based objects"
    // If I return `{ fields, pageCount }`, I will need to update `document.controller.js` to destructure correctly.
    // I will return `{ fields, pageCount }` as requested.
    
    // But wait, the fallback returns an array of fields. Let's return { fields: fallbackResult, pageCount: 1 } for consistency.
    const fallbackResult = await fallbackDetect(filePath, mimeType);
    return { fields: fallbackResult, pageCount: 1 };
  }
}

module.exports = { detectSignatureFields };
