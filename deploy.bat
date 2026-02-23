@echo off
echo =======================================================
echo HTSM Product Code Management System - Deployment Script
echo =======================================================
echo.

echo 1. Pulling latest code...
git pull
if %ERRORLEVEL% NEQ 0 (
    echo Error pulling code. Please check your git status.
    pause
    exit /b %ERRORLEVEL%
)
echo Code pulled successfully.
echo.

echo 2. Rebuilding and starting containers...
docker-compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo Error building/starting containers. Please check docker status.
    pause
    exit /b %ERRORLEVEL%
)
echo.

echo =======================================================
echo Deployment completed successfully!
echo App is running at: http://localhost:5000
echo =======================================================
pause
