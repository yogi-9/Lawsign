'use strict';

/**
 * services/bgRemoval.service.js
 * Node.js bridge to the Python bg_remover Flask microservice.
 *
 * Exports:  removeBackground(rawPath, processedPath)
 *
 * Strategy:
 *   1. Try the Python service at http://localhost:5001/remove-bg (30 s timeout).
 *   2. If the service is unreachable (ECONNREFUSED), times out, or returns an
 *      error, fall back to the existing Sharp-based pixel-threshold pipeline
 *      so that signature uploads NEVER break regardless of Python availability.
 */

const path  = require('path');
const sharp = require('sharp');
const { SIG_PROCESSING } = require('../config/constants');

const PYTHON_SERVICE_URL = 'http://localhost:5001/remove-bg';
const TIMEOUT_MS         = 30_000; // 30 seconds

// ── Sharp fallback pipeline (identical to the original controller code) ──────────
async function _sharpFallback(rawPath, processedPath) {
  const { data, info } = await sharp(rawPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels    = new Uint8ClampedArray(data.buffer);
  const threshold = SIG_PROCESSING.BG_THRESHOLD; // 230

  for (let i = 0; i < pixels.length; i += 4) {
    if (
      pixels[i]     >= threshold &&
      pixels[i + 1] >= threshold &&
      pixels[i + 2] >= threshold
    ) {
      pixels[i + 3] = 0;
    }
  }

  await sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .resize(SIG_PROCESSING.OUTPUT_MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(processedPath);
}

// ── Main exported function ──────────────────────────────────────────────────────
/**
 * Remove the background from a signature image.
 *
 * @param {string} rawPath        — path to the raw uploaded image
 * @param {string} processedPath  — destination path for the processed PNG
 * @returns {Promise<{ success: boolean }>}
 */
async function removeBackground(rawPath, processedPath) {
  const absRaw  = path.resolve(rawPath);
  const absProc = path.resolve(processedPath);

  try {
    // ── Call Python microservice ─────────────────────────────────────────────────
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(PYTHON_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_path: absRaw, output_path: absProc }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Python service returned error: ${result.error}`);
    }

    console.log(
      `[bgRemoval] ✔ Python (${result.method}) — ${result.time_ms}ms — ${absProc}`
    );

    return { success: true };

  } catch (err) {
    // ── Determine failure reason ────────────────────────────────────────────────
    const reason =
      err.cause?.code === 'ECONNREFUSED' ? 'service unreachable' :
      err.name === 'AbortError'          ? 'timeout (30 s)'     :
      err.message                        || 'unknown';

    console.log(
      `[bgRemoval] ⚠ Python unavailable (${reason}) — using Sharp fallback.`
    );

    // ── Sharp fallback — guarantees the upload never fails ──────────────────────
    await _sharpFallback(rawPath, processedPath);

    console.log(`[bgRemoval] ✔ Sharp fallback complete — ${absProc}`);
    return { success: true };
  }
}

module.exports = { removeBackground };
