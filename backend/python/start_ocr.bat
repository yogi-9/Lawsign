@echo off
cd /d "%~dp0"

echo Installing OCR dependencies...
python -m pip install -r requirements_ocr.txt

echo Starting OCR Microservice on port 5002...
python ocr_service.py
pause
