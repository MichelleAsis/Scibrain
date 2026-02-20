@echo off
:: SciBrain - Simple Startup Script
:: Use this to start SciBrain after installation

title SciBrain - Smart Study Platform

color 0A

echo.
echo ============================================
echo    SciBrain - Smart Study Platform
echo ============================================
echo.

:: Store the current directory
set "SCIBRAIN_ROOT=%~dp0"
cd /d "%SCIBRAIN_ROOT%"

:: Create logs directory
if not exist "logs" mkdir logs

:: ============================================
:: Pre-flight Checks
:: ============================================
echo Running pre-flight checks...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please run INSTALL_SCIBRAIN.bat first.
    echo.
    pause
    exit /b 1
)

:: Check if Ollama is installed
where ollama >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Ollama not found!
    echo.
    echo Please run INSTALL_SCIBRAIN.bat first.
    echo.
    pause
    exit /b 1
)

:: Check if SSL certificates exist
if not exist "localhost+2.pem" (
    echo [ERROR] SSL certificates not found!
    echo.
    echo Please run INSTALL_SCIBRAIN.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "localhost+2-key.pem" (
    echo [ERROR] SSL certificates not found!
    echo.
    echo Please run INSTALL_SCIBRAIN.bat first.
    echo.
    pause
    exit /b 1
)

:: Check if frontend-server.js exists
if not exist "frontend-server.js" (
    echo [ERROR] frontend-server.js not found!
    echo.
    echo Please ensure all files are present.
    echo.
    pause
    exit /b 1
)

:: Check if backend directory exists
if not exist "backend\server.js" (
    echo [ERROR] backend\server.js not found!
    echo.
    echo Please ensure all files are present.
    echo.
    pause
    exit /b 1
)

echo [OK] All checks passed
echo.

:: ============================================
:: Startup Sequence
:: ============================================
echo Starting SciBrain...
echo.

:: Kill previous instances
echo [1/5] Cleaning up previous instances...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8443') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo       [OK] Cleanup complete
echo.

:: Start Ollama if not running
echo [2/5] Starting Ollama AI service...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo       [OK] Ollama is already running
) else (
    start /B ollama serve >nul 2>&1
    timeout /t 5 /nobreak >nul
    echo       [OK] Ollama started
)
echo.

:: Detect IP for mobile
echo [3/5] Detecting network configuration...
for /f "tokens=*" %%i in ('powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*'} | Select-Object -First 1 -ExpandProperty IPAddress"') do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" (
    set LOCAL_IP=localhost
    echo       [WARNING] Could not detect IP, using localhost only
) else (
    echo       [OK] Local IP detected: %LOCAL_IP%
)
echo.

:: Start Backend
echo [4/5] Starting backend server...
start "SciBrain Backend - DO NOT CLOSE" cmd /k "cd backend && node server.js"
timeout /t 5 /nobreak >nul
echo       [OK] Backend server started
echo.

:: Start Frontend
echo [5/5] Starting frontend server...
start "SciBrain Frontend - DO NOT CLOSE" cmd /k "node frontend-server.js"
timeout /t 5 /nobreak >nul
echo       [OK] Frontend server started
echo.

:: Verify servers are running
echo Verifying servers...
timeout /t 3 /nobreak >nul

netstat -ano | findstr :3000 >nul 2>&1
if %errorLevel% equ 0 (
    echo       [OK] Backend running on port 3000
) else (
    echo       [WARNING] Backend may not have started
)

netstat -ano | findstr :8443 >nul 2>&1
if %errorLevel% equ 0 (
    echo       [OK] Frontend running on port 8443
) else (
    echo       [WARNING] Frontend may not have started
)

echo.

:: Open browser
echo Opening browser...
timeout /t 3 /nobreak >nul
start https://localhost:8443/src/pages/HomePage/index.html

echo.
echo ============================================
echo    SciBrain is now running!
echo ============================================
echo.
echo ^>^>^> COMPUTER ACCESS:
echo     https://localhost:8443/src/pages/HomePage/index.html
echo.
echo ^>^>^> MOBILE ACCESS (Same WiFi):
echo     https://%LOCAL_IP%:8443/src/pages/HomePage/index.html
echo.
echo ============================================
echo    MOBILE SETUP INSTRUCTIONS
echo ============================================
echo.
echo 1. Connect your phone to the SAME WiFi network
echo 2. Open browser on your phone
echo 3. Type this URL exactly:
echo.
echo    https://%LOCAL_IP%:8443/src/pages/HomePage/index.html
echo.
echo 4. You WILL see a security warning - THIS IS NORMAL
echo    The warning appears because we use self-signed certificates
echo.
echo    ON COMPUTER:
echo    - Click "Advanced" or "Show Details"
echo    - Click "Proceed to localhost (unsafe)" or similar
echo.
echo    ON MOBILE:
echo    - Tap "Advanced" or "Show Details"  
echo    - Tap "Proceed to %LOCAL_IP% (unsafe)" or "Accept Risk"
echo.
echo    This is SAFE - it's your local network only!
echo.
echo 5. You may need to accept the warning TWICE:
echo    - Once for the frontend (port 8443)
echo    - Once for the backend (port 3000)
echo.
echo 6. After accepting, enjoy SciBrain on your phone!
echo.
echo ============================================
echo.
echo IMPORTANT:
echo  [+] Keep ALL THREE windows OPEN while using SciBrain
echo  [+] Two server windows will stay open - DO NOT CLOSE THEM
echo  [+] Closing the server windows will stop the application
echo  [+] Press any key in THIS window to stop everything
echo.
echo.
pause >nul

:: ============================================
:: Shutdown Sequence
:: ============================================
echo.
echo ============================================
echo    Shutting down SciBrain...
echo ============================================
echo.

echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8443') do taskkill /F /PID %%a >nul 2>&1
echo [OK] All servers stopped
echo.

echo Ollama service left running (can be used by other apps)
echo.

echo ============================================
echo    SciBrain has been shut down
echo ============================================
echo.
echo Thank you for using SciBrain!
echo.
echo To restart: Run START_SCIBRAIN.bat again
echo.

timeout /t 5 /nobreak

exit /b 0