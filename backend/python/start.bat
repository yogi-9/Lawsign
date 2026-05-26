@echo off
REM start.bat — Launch the Python background removal microservice on Windows.
REM Usage: backend\python\start.bat

cd /d "%~dp0"
echo Upgrading pip...
python -m pip install --upgrade pip
echo Installing Python dependencies...
pip install -r requirements.txt
echo Starting bg_remover on port 5001...
python bg_remover.py
