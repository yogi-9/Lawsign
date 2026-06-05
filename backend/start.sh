#!/bin/bash
set -e

echo "Starting Python BG Removal service on port 5001..."
python3 /app/python/bg_remover.py &

echo "Starting Python OCR service on port 5002..."
python3 /app/python/ocr_service.py &

echo "Starting Node.js server..."
npm run start:full