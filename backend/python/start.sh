#!/bin/bash
# start.sh — Launch the Python background removal microservice.
# Usage: bash backend/python/start.sh

cd "$(dirname "$0")"
echo "Upgrading pip…"
python -m pip install --upgrade pip
echo "Installing Python dependencies…"
pip install -r requirements.txt
echo "Starting bg_remover on port 5001…"
python bg_remover.py
