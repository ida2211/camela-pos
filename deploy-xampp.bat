@echo off
echo Building CAMELA POS for XAMPP deployment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Build the project
echo Building project...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed
    pause
    exit /b 1
)

REM Check if XAMPP is installed
if not exist "C:\xampp\htdocs" (
    echo Warning: XAMPP not found in default location
    echo Please install XAMPP or update the path in this script
    set /p xamppPath="Enter XAMPP htdocs path: "
) else (
    set "xamppPath=C:\xampp\htdocs"
)

REM Create deployment directory
set "deployDir=%xamppPath%\camela-pos"
echo Creating deployment directory at: %deployDir%
if exist "%deployDir%" (
    echo Removing existing deployment...
    rmdir /s /q "%deployDir%"
)
mkdir "%deployDir%"

REM Copy built files
echo Copying built files...
xcopy "dist\*" "%deployDir%\" /E /I /Y
if %errorlevel% neq 0 (
    echo Error: Failed to copy files
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build and Deployment Complete!
echo ========================================
echo.
echo Application deployed to: %deployDir%
echo Access URL: http://localhost/camela-pos/
echo.
echo Make sure Apache is running in XAMPP Control Panel
echo.
pause
