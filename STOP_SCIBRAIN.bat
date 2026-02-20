@echo off
:: SciBrain - Stop All Services
:: Cleanly shuts down all SciBrain processes

title SciBrain - Shutdown

color 0C

echo.
echo ============================================
echo    SciBrain - Shutdown Script
echo ============================================
echo.
echo This will stop all SciBrain services:
echo  - Backend Server (port 3000)
echo  - Frontend Server (port 8443)
echo  - Ollama AI Service
echo.

pause

echo.
echo Shutting down SciBrain...
echo.

:: Stop Node.js processes (backend and frontend servers)
echo [1/3] Stopping servers...
taskkill /F /IM node.exe >nul 2>&1
if %errorLevel% equ 0 (
    echo       [OK] Servers stopped
) else (
    echo       [INFO] No servers were running
)

:: Stop Ollama service
echo [2/3] Stopping Ollama AI service...
taskkill /F /IM ollama.exe >nul 2>&1
if %errorLevel% equ 0 (
    echo       [OK] Ollama stopped
) else (
    echo       [INFO] Ollama was not running
)

:: Stop any browsers that might have localhost open (optional)
echo [3/3] Cleaning up...
timeout /t 2 /nobreak >nul
echo       [OK] Cleanup complete

echo.
echo ============================================
echo    All SciBrain services stopped!
echo ============================================
echo.
echo You can safely close this window now.
echo To restart SciBrain, run START_SCIBRAIN.bat
echo.

timeout /t 5 /nobreak

exit