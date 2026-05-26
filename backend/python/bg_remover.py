"""
bg_remover.py — Python Flask microservice for signature background removal.

Primary engine:  rembg (u2net model) — deep-learning-based background removal.
Fallback engine: OpenCV — adaptive color-space-based removal using LAB + border sampling.
Post-processing: Always applied — near-white cleanup, auto-trim, resize, max-compression PNG.

Endpoints:
  POST /remove-bg  — remove background from a signature image
  GET  /health     — health check

Runs on port 5001.
"""

import os
import time
import logging
import traceback

import numpy as np
import cv2
from PIL import Image
from flask import Flask, request, jsonify

# ── Logging setup ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bg_remover")

# ── Flask app ────────────────────────────────────────────────────────────────────
app = Flask(__name__)

# ── Lazy-load rembg to keep startup fast if model is cached ──────────────────────
_rembg_session = None

def _get_rembg_session():
    """Lazy-initialise the rembg u2net session (downloads model on first run)."""
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session
        logger.info("Loading rembg u2net model (first call — may download ~170 MB)…")
        _rembg_session = new_session("u2net")
        logger.info("rembg u2net model ready.")
    return _rembg_session


# ── Background removal: rembg (primary) ─────────────────────────────────────────
def _remove_bg_rembg(img_pil: Image.Image) -> Image.Image:
    """Use rembg with the u2net model. Returns RGBA PIL Image."""
    from rembg import remove
    session = _get_rembg_session()
    result = remove(img_pil, session=session, alpha_matting=False)
    return result.convert("RGBA")


# ── Background removal: OpenCV fallback ──────────────────────────────────────────
def _remove_bg_opencv(img_pil: Image.Image) -> Image.Image:
    """
    Adaptive background removal using OpenCV:
      1. Convert to LAB colour space.
      2. Sample the outer 3% border pixels to estimate background colour.
      3. Build a mask with cv2.inRange using adaptive tolerance.
      4. Smooth the mask edges, close small holes in ink strokes, feather.
      5. Return RGBA PIL Image with background removed.
    """
    img_bgr = cv2.cvtColor(np.array(img_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = img_bgr.shape[:2]

    # ── Convert to LAB ───────────────────────────────────────────────────────────
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    # ── Sample border pixels (outer 3%) ──────────────────────────────────────────
    border = max(int(min(h, w) * 0.03), 1)
    top    = lab[:border, :].reshape(-1, 3)
    bottom = lab[-border:, :].reshape(-1, 3)
    left   = lab[:, :border].reshape(-1, 3)
    right  = lab[:, -border:].reshape(-1, 3)
    border_pixels = np.vstack([top, bottom, left, right])

    bg_mean = border_pixels.mean(axis=0).astype(np.float64)
    bg_std  = border_pixels.std(axis=0).astype(np.float64)

    # ── Adaptive tolerance based on variance ─────────────────────────────────────
    tolerance = np.clip(bg_std * 2.5 + 10, 15, 60).astype(np.uint8)
    lower = np.clip(bg_mean - tolerance, 0, 255).astype(np.uint8)
    upper = np.clip(bg_mean + tolerance, 0, 255).astype(np.uint8)

    # ── Build background mask ────────────────────────────────────────────────────
    blurred_lab = cv2.GaussianBlur(lab, (5, 5), 0)
    bg_mask = cv2.inRange(blurred_lab, lower, upper)  # 255 = background

    # ── Morphological close to fill small holes in ink strokes ────────────────────
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    bg_mask = cv2.morphologyEx(bg_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    # ── Invert: foreground = 255 ─────────────────────────────────────────────────
    fg_mask = cv2.bitwise_not(bg_mask)

    # ── Soft feathering on mask edges ────────────────────────────────────────────
    fg_mask = cv2.GaussianBlur(fg_mask, (3, 3), 0)

    # ── Compose RGBA ─────────────────────────────────────────────────────────────
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    rgba = np.dstack([img_rgb, fg_mask])
    return Image.fromarray(rgba, "RGBA")


# ── Quality check: did rembg over-remove? ────────────────────────────────────────
def _is_over_removed(img_rgba: Image.Image, threshold: float = 0.95) -> bool:
    """Return True if more than `threshold` fraction of pixels are fully transparent."""
    arr = np.array(img_rgba)
    total = arr.shape[0] * arr.shape[1]
    transparent = np.sum(arr[:, :, 3] == 0)
    ratio = transparent / total
    logger.info(f"Transparency ratio after rembg: {ratio:.2%}")
    return ratio > threshold


# ── Post-processing (always applied) ────────────────────────────────────────────
def _post_process(img_rgba: Image.Image, max_width: int = 400) -> Image.Image:
    """
    Final cleanup applied regardless of removal method:
      1. Remove remaining near-white pixels with soft alpha transition.
      2. Auto-trim to bounding box of non-transparent pixels.
      3. Resize to max_width maintaining aspect ratio (LANCZOS).
    """
    arr = np.array(img_rgba).astype(np.float32)

    # ── Adaptive inner-loop background removal (Otsu's Thresholding) ─────────────
    # rembg often leaves the paper background inside the loops of a signature (like 'o' or 'y').
    # We use Otsu's method on the non-transparent pixels to find the exact dividing
    # line between the dark ink and the light paper, and hollow out the paper.
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    
    gray_img = cv2.cvtColor(arr[:, :, :3].astype(np.uint8), cv2.COLOR_RGB2GRAY)
    mask = a > 0
    
    if np.any(mask):
        valid_pixels = gray_img[mask]
        if len(valid_pixels) > 100:
            threshold_val, _ = cv2.threshold(valid_pixels, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # If the threshold is in a reasonable range (we have dark ink and light paper)
            if 60 < threshold_val < 240:
                # Soft fade around the threshold for anti-aliased edges
                # Ink (darker than threshold) stays opaque. Paper (lighter) becomes transparent.
                fade = np.clip((threshold_val + 15 - gray_img) / 30.0, 0.0, 1.0)
                a = np.where(mask, a * fade, a)
            else:
                # Fallback for already clean images: just remove near-white
                fade = np.clip((255.0 - gray_img) / 15.0, 0.0, 1.0)
                a = np.where((gray_img > 240) & mask, a * fade, a)
                
    arr[:, :, 3] = a
    result = Image.fromarray(arr.astype(np.uint8), "RGBA")

    # ── Auto-trim (crop to bounding box of non-transparent pixels) ───────────────
    alpha_np = np.array(result.split()[3])
    coords = np.argwhere(alpha_np > 0)
    if coords.size == 0:
        # Entire image is transparent — return as-is
        return result
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0) + 1
    result = result.crop((x0, y0, x1, y1))

    # ── Resize to max width ──────────────────────────────────────────────────────
    w, h = result.size
    if w > max_width:
        ratio = max_width / w
        new_h = max(int(h * ratio), 1)
        result = result.resize((max_width, new_h), Image.LANCZOS)

    return result


# ── Main processing pipeline ────────────────────────────────────────────────────
def process_signature(input_path: str, output_path: str) -> dict:
    """
    Full pipeline: load → remove bg (rembg or opencv) → post-process → save.
    Returns dict with 'method' and 'time_ms'.
    """
    t0 = time.perf_counter()

    # ── Load image ───────────────────────────────────────────────────────────────
    img = Image.open(input_path).convert("RGBA")
    logger.info(f"Loaded image: {input_path} ({img.size[0]}x{img.size[1]})")

    method = "rembg"

    # ── Try rembg first ──────────────────────────────────────────────────────────
    try:
        result = _remove_bg_rembg(img)
        if _is_over_removed(result):
            logger.warning("rembg over-removed — falling back to OpenCV method.")
            method = "opencv_fallback"
            result = _remove_bg_opencv(img)
    except Exception as e:
        logger.warning(f"rembg failed ({e}) — falling back to OpenCV method.")
        method = "opencv_fallback"
        result = _remove_bg_opencv(img)

    # ── Post-process ─────────────────────────────────────────────────────────────
    result = _post_process(result, max_width=400)

    # ── Ensure output directory exists ───────────────────────────────────────────
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # ── Save as PNG with maximum compression ─────────────────────────────────────
    result.save(output_path, format="PNG", optimize=True, compress_level=9)

    elapsed_ms = (time.perf_counter() - t0) * 1000
    logger.info(
        f"Done — method={method}, output={output_path}, "
        f"size={result.size[0]}x{result.size[1]}, time={elapsed_ms:.0f}ms"
    )
    return {"method": method, "time_ms": round(elapsed_ms)}


# ══════════════════════════════════════════════════════════════════════════════════
#  Flask routes
# ══════════════════════════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "model": "u2net"})


@app.route("/remove-bg", methods=["POST"])
def remove_bg():
    """
    Accept JSON body: { "input_path": "...", "output_path": "..." }
    Returns JSON:     { "success": true, "method": "...", "time_ms": N }
                   or { "success": false, "error": "..." }
    """
    try:
        body = request.get_json(force=True)
        input_path  = body.get("input_path")
        output_path = body.get("output_path")

        if not input_path or not output_path:
            return jsonify({"success": False, "error": "input_path and output_path are required."}), 400

        if not os.path.isfile(input_path):
            return jsonify({"success": False, "error": f"Input file not found: {input_path}"}), 404

        info = process_signature(input_path, output_path)
        return jsonify({"success": True, **info})

    except Exception:
        tb = traceback.format_exc()
        logger.error(f"Unhandled error in /remove-bg:\n{tb}")
        return jsonify({"success": False, "error": str(tb)}), 500


# ══════════════════════════════════════════════════════════════════════════════════
#  Entry point
# ══════════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    logger.info("Starting bg_remover microservice on port 5001…")
    app.run(host="0.0.0.0", port=5001, debug=False)
