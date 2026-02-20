@echo off
:: SciBrain - One-Time Installation Script
:: Run this ONCE as Administrator to set everything up

title SciBrain - Installation

:: Enable command extensions and delayed expansion
setlocal enableextensions enabledelayedexpansion

color 0B

echo.
echo ============================================
echo    SciBrain - ONE-TIME INSTALLATION
echo ============================================
echo.
echo This installer will:
echo  1. Generate SSL certificates for HTTPS
echo  2. Check and install Node.js (if needed)
echo  3. Check and install Ollama AI (if needed)
echo  4. Download AI model (2-4 GB)
echo  5. Install application dependencies
echo  6. Initialize database
echo.
echo This only needs to be run ONCE.
echo After installation, use START_SCIBRAIN.bat to launch.
echo.
echo ============================================
echo.
echo Press any key to begin installation...
pause >nul

echo.
echo Starting installation...
echo.

:: Store the current directory
set "SCIBRAIN_ROOT=%~dp0"
cd /d "%SCIBRAIN_ROOT%"

:: Create logs directory
if not exist "logs" mkdir logs
set "LOG_FILE=logs\scibrain-install-%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"
set "LOG_FILE=%LOG_FILE: =0%"

echo [%date% %time%] SciBrain installation started >> "%LOG_FILE%"

:: ============================================
:: Step 1: Check for Administrator Rights
:: ============================================
echo [1/7] Checking administrator privileges...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ============================================
    echo    ADMINISTRATOR PRIVILEGES REQUIRED
    echo ============================================
    echo.
    echo This installer needs admin rights.
    echo.
    echo Please:
    echo  1. Right-click on "INSTALL_SCIBRAIN.bat"
    echo  2. Select "Run as Administrator"
    echo  3. Click "Yes" when prompted
    echo.
    echo ============================================
    echo.
    pause
    exit /b 1
)
echo       [OK] Administrator privileges confirmed
echo.

:: ============================================
:: Step 2: Generate SSL Certificates (MKCERT Method)
:: ============================================
echo [2/7] Setting up HTTPS certificates...

:: Check if certificates already exist and are valid
if exist "localhost+2.pem" (
    if exist "localhost+2-key.pem" (
        echo       Checking existing certificates...
        node -e "const fs=require('fs');const https=require('https');try{https.createServer({key:fs.readFileSync('localhost+2-key.pem'),cert:fs.readFileSync('localhost+2.pem')});process.exit(0);}catch(e){process.exit(1);}" >nul 2>&1
        if !errorLevel! equ 0 (
            echo       [OK] Valid SSL certificates found
            goto :skip_cert_gen
        ) else (
            echo       [WARNING] Existing certificates are invalid, regenerating...
            del localhost+2.pem >nul 2>&1
            del localhost+2-key.pem >nul 2>&1
        )
    )
)

echo       Generating SSL certificates...
echo/

:: Download mkcert if not present
if not exist "mkcert.exe" (
    echo       Downloading mkcert certificate generator...
    powershell -Command "$ProgressPreference='SilentlyContinue';[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;Invoke-WebRequest -Uri 'https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe' -OutFile 'mkcert.exe' -UseBasicParsing"
    
    if not exist "mkcert.exe" (
        echo       [ERROR] Failed to download mkcert
        echo       Please check your internet connection
        pause
        exit /b 1
    )
)

:: Install certificate authority
echo       Installing local certificate authority...
echo       (You may see a security prompt - please click YES)
echo/
mkcert.exe -install

:: Wait for CA installation
timeout /t 2 /nobreak >nul

:: Generate certificates
echo       Generating certificates for localhost...
mkcert.exe localhost 127.0.0.1 ::1

:: Wait for files to be created
timeout /t 1 /nobreak >nul

:: Verify certificates were created
if exist "localhost+2.pem" (
    if exist "localhost+2-key.pem" (
        echo       [OK] SSL certificates generated successfully
        del mkcert.exe >nul 2>&1
        goto :skip_cert_gen
    )
)

:: If we get here, generation failed
echo       [ERROR] Certificate generation failed
echo/
echo       Possible causes:
echo       1. You clicked "No" on the security prompt
echo       2. Antivirus blocked mkcert
echo       3. Insufficient permissions
echo/
echo       Please try:
echo       1. Run the installer again
echo       2. Click "YES" on the security prompt when it appears
echo       3. Temporarily disable antivirus
echo/
pause
exit /b 1

:skip_cert_gen
echo/

:: ============================================
:: Step 3: Check for Node.js
:: ============================================
echo [3/7] Checking for Node.js...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo       [MISSING] Installing Node.js...
    echo.
    echo Downloading Node.js installer...
    
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Downloading...'; try { Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'nodejs-installer.msi' -UseBasicParsing; Write-Host 'Download complete'; } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }}"
    
    if exist "nodejs-installer.msi" (
        echo Installing Node.js (3-5 minutes, please wait^)...
        msiexec /i nodejs-installer.msi /quiet /norestart /log "%LOG_FILE%"
        timeout /t 45 /nobreak >nul
        del nodejs-installer.msi
        
        :: Refresh environment
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b"
        
        node --version >nul 2>&1
        if %errorLevel% equ 0 (
            echo       [OK] Node.js installed successfully
        ) else (
            echo       [ERROR] Installation failed
            echo       Please install manually from https://nodejs.org
            pause
            exit /b 1
        )
    ) else (
        echo       [ERROR] Download failed
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%i in ('node --version') do echo       [OK] Node.js %%i already installed
)
echo.

:: ============================================
:: Step 4: Check for Ollama
:: ============================================
echo [4/7] Checking for Ollama AI...
where ollama >nul 2>&1
if %errorLevel% neq 0 (
    echo       [MISSING] Installing Ollama...
    echo.
    
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Downloading Ollama...'; try { Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe' -UseBasicParsing; Write-Host 'Download complete'; } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }}"
    
    if exist "OllamaSetup.exe" (
        echo Installing Ollama (2-3 minutes^)...
        start /wait OllamaSetup.exe /S
        timeout /t 25 /nobreak >nul
        del OllamaSetup.exe
        
        :: Refresh environment
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b"
        
        echo       [OK] Ollama installed
    ) else (
        echo       [ERROR] Download failed
        pause
        exit /b 1
    )
) else (
    echo       [OK] Ollama already installed
)
echo.

:: ============================================
:: Step 5: Download AI Model
:: ============================================
echo [5/7] Setting up AI model...

:: Start Ollama if not running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if not "%ERRORLEVEL%"=="0" (
    echo       Starting Ollama service...
    start /B ollama serve >nul 2>&1
    timeout /t 8 /nobreak >nul
)

:: Check if model exists
ollama list 2>nul | findstr /C:"llama3.2" >nul 2>&1
if %errorLevel% neq 0 (
    echo       Downloading AI model (2-4 GB, 10-30 minutes^)...
    echo.
    echo ============================================
    echo    LARGE DOWNLOAD - PLEASE WAIT
    echo    Grab a coffee, this will take a while...
    echo ============================================
    echo.
    
    ollama pull llama3.2
    
    if %errorLevel% equ 0 (
        echo.
        echo       [OK] Model downloaded successfully
    ) else (
        echo.
        echo       [WARNING] Download may have issues
        echo       You can try manually: ollama pull llama3.2
    )
) else (
    echo       [OK] Model already available
)
echo.

:: ============================================
:: Step 6: Install Dependencies
:: ============================================
echo [6/7] Installing application dependencies...

if exist "backend\package.json" (
    echo       Installing backend packages...
    cd backend
    call npm install --loglevel=error
    if %errorLevel% equ 0 (
        echo       [OK] Dependencies installed
    ) else (
        echo       [ERROR] npm install failed
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo       [WARNING] backend\package.json not found
)
echo.

:: ============================================
:: Step 7: Initialize Database
:: ============================================
echo [7/7] Setting up database...

if exist "backend\database\init.js" (
    echo       Creating database...
    cd backend
    node database\init.js
    if %errorLevel% equ 0 (
        echo       [OK] Database initialized
    ) else (
        echo       [INFO] Database may already exist (this is normal^)
    )
    cd ..
) else (
    echo       [WARNING] Database files not found
    echo       [INFO] App will run without database support
)
echo.

:: ============================================
:: Installation Complete
:: ============================================
echo.
echo ============================================
echo    INSTALLATION COMPLETE!
echo ============================================
echo.
echo SciBrain is now installed and ready to use.
echo.
echo NEXT STEPS:
echo   1. Double-click "START_SCIBRAIN.bat" to launch
echo   2. No admin rights needed for daily use
echo.
echo IMPORTANT NOTES:
echo   - SSL certificates have been generated for HTTPS
echo   - Certificates are stored in this folder
echo   - They work on THIS computer only
echo.
echo BROWSER SECURITY WARNING:
echo   When you first open SciBrain, your browser will show
echo   a security warning. This is NORMAL and SAFE.
echo.
echo   How to proceed:
echo   1. Click "Advanced" or "Show Details"
echo   2. Click "Proceed to localhost (unsafe)"
echo   3. The warning only appears once per browser
echo.
echo   Why this happens:
echo   - We use self-signed certificates for local HTTPS
echo   - This keeps your data secure on your network
echo   - The browser just doesn't recognize our certificate
echo.
echo ============================================
echo.
echo Installation window will close in 10 seconds...
echo (Or press any key to close now)
echo.

timeout /t 10

exit /b 0