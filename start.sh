#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo " =========================================="
echo "  UAReady -- Email & Domain Validator"
echo "  Hackathon Nepal 2026"
echo " =========================================="
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[1/4] Installing backend dependencies..."
cd "$ROOT/backend"
pip install -r requirements.txt -q

echo "[2/4] Starting backend on http://localhost:8000 ..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"
sleep 2

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[3/4] Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install --silent

echo "[4/4] Starting frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
echo "      Frontend PID: $FRONTEND_PID"

echo ""
echo " =========================================="
echo "  UAReady is running!"
echo ""
echo "  Frontend :  http://localhost:5173"
echo "  Backend  :  http://localhost:8000"
echo "  API Docs :  http://localhost:8000/docs"
echo " =========================================="
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# Wait and clean up on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '  Stopped.'; exit 0" INT TERM
wait
