@echo off
cd /d "%~dp0"
echo Installing dependencies...
pip install -r requirements.txt
echo Starting AutoGuardAI Backend...
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
