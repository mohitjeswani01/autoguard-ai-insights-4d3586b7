@echo off
cd /d "%~dp0"
echo Installing dependencies...
npm install
echo Starting AutoGuardAI Frontend...
npm run dev
pause
