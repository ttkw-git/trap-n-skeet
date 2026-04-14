@echo off
REM ═══════════════════════════════════════════════════════
REM  Trap N Skeet — Launcher
REM  Double-click this file to open the app in your browser
REM ═══════════════════════════════════════════════════════

REM Option A: Open the hosted GitHub Pages URL (recommended after deployment)
REM Uncomment the line below once GitHub Pages is enabled:
REM start "" "https://ttkw-git.github.io/trap-n-skeet/"

REM Option B: Run a local server and open in browser (works without internet)
echo Starting local server on http://localhost:8765 ...
start "" "http://localhost:8765"
python -m http.server 8765 --directory "%~dp0"
