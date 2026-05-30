#!/bin/bash
cd "$(dirname "$0")"

echo "Installing OCR dependencies..."
python3 -m pip install -r requirements_ocr.txt

echo "Starting OCR Microservice on port 5002..."
python3 ocr_service.py
