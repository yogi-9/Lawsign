#!/bin/bash
cd /app
python3 python/bg_remover.py &
python3 python/ocr_service.py &
npm run start:full