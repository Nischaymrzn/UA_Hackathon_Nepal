@echo off
setlocal
set ROOT=%~dp0
title UAReady

echo.
echo  ==========================================
echo   UAReady -- Email ^& Domain Validator
echo   Hackathon Nepal 2026
echo  ==========================================
echo.

:: ── Backend ──────────────────────────────────────────────────────────────────
echo [1/4] Installing backend dependencies...
cd /d "%ROOT%backend"
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed. Make sure Python 3.8+ is installed and on PATH.
    pause
    exit /b 1
)

echo [2/4] Starting backend on http://localhost:8000 ...
start "UAReady Backend" cmd /k "cd /d "%ROOT%backend" && uvicorn main:app --reload --port 8000"

:: Give uvicorn a moment to bind
timeout /t 3 /nobreak > nul

:: ── Frontend ─────────────────────────────────────────────────────────────────
echo [3/4] Installing frontend dependencies...
cd /d "%ROOT%frontend"
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed. Make sure Node.js 18+ is installed and on PATH.
    pause
    exit /b 1
)

echo [4/4] Starting frontend on http://localhost:5173 ...
start "UAReady Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo  ==========================================
echo   UAReady is starting up!
echo.
echo   Frontend :  http://localhost:5173
echo   Backend  :  http://localhost:8000
echo   API Docs :  http://localhost:8000/docs
echo  ==========================================
echo.
echo  Two terminal windows have opened.
echo  Close them to stop the servers.
echo.
pause
