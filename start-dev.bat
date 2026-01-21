@echo off
setlocal enabledelayedexpansion

title HTSM-DMS Dev Launcher

echo ==========================================
echo       HTSM-DMS Dev Environment
echo ==========================================
echo.
echo This script will start both Backend and Frontend in development mode.
echo.

:: 0. Check Node.js
node -v >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: 1. Check and install Backend dependencies
echo [1/4] Checking Backend dependencies...
if not exist "server\node_modules" (
    echo     Installing backend dependencies...
    cd server
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    cd ..
    echo     Backend dependencies installed.
) else (
    echo     Backend dependencies ready.
)

:: 2. Check and install Frontend dependencies
echo [2/4] Checking Frontend dependencies...
if not exist "client\node_modules" (
    echo     Installing frontend dependencies...
    cd client
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    cd ..
    echo     Frontend dependencies installed.
) else (
    echo     Frontend dependencies ready.
)

:: 3. Start Backend
echo.
echo [3/4] Starting Backend Server (Port: 5000)...
echo     Opening in new window...
start "HTSM-DMS Backend" cmd /k "cd server && npm run dev"

:: 4. Start Frontend
echo.
echo [4/4] Starting Frontend Dev Server (Port: 3000)...
echo     Opening in new window...
echo     (Browser will open automatically once ready)
start "HTSM-DMS Frontend" cmd /k "cd client && npm start"

echo.
echo ==========================================
echo     All services started!
echo.
echo     Do NOT close the pop-up command windows.
echo.
echo     Frontend: http://localhost:3000
echo     Backend:  http://localhost:5000
echo ==========================================
echo.
pause
