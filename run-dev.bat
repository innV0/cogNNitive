@echo off
setlocal
set ROOT=%~dp0
title cogNNitive Dev Environment

echo.
echo +----------------------------------------------------+
echo ^|       cogNNitive — Dev Environment                ^|
echo +----------------------------------------------------+
echo.

REM ── Kill any previous dev windows (targeted, not all node.exe!) ──
echo   Cleaning up previous dev servers...
taskkill /fi "WINDOWTITLE eq format-editor*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq cogNNitive - docs*" /f >nul 2>&1
timeout /t 1 /nobreak >nul
echo   Done.
echo.

REM ── Install dependencies if missing ──
if not exist "%ROOT%node_modules" (
    echo   Installing workspace dependencies...
    cd /d "%ROOT%" && call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo   ERROR: npm install failed!
        pause
        exit /b 1
    )
    echo.
)

REM ── Pre-build format-core (required by format-editor) ──
echo   Building @innv0/format-core...
cd /d "%ROOT%packages\format-core" && call npx tsc
if %ERRORLEVEL% NEQ 0 (
    echo   ERROR: format-core build failed!
    pause
    exit /b 1
)
echo.

echo Starting development servers...
echo.

echo   [format-editor] http://localhost:5174
start "format-editor" cmd /c "title format-editor && cd /d "%ROOT%" && npm run dev -w @innv0/format-editor -- --port 5174 --host"

echo   [docs]          http://localhost:8080
start "cogNNitive - docs" cmd /c "title cogNNitive - docs && cd /d "%ROOT%" && npx http-server docs/ -p 8080 -c-1 --silent"

echo.
echo +----------------------------------------------------+
echo ^|  Server            Window Title               URL  ^|
echo ^|  format-editor   - format-editor    - http://localhost:5174 ^|
echo ^|  docs            - cogNNitive - docs - http://localhost:8080 ^|
echo +----------------------------------------------------+
echo.
echo Each server runs in its own window. Close the windows
echo or press any key here to stop all servers.
echo.
pause >nul

echo.
echo Stopping all servers...
taskkill /fi "WINDOWTITLE eq format-editor" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq cogNNitive - docs" /f >nul 2>&1
echo Done.
echo.

endlocal
