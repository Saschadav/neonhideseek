@echo off
echo ========================================
echo   Neon Hide ^& Seek - Render Deploy
echo ========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo [ERROR] Git repository not initialized!
    echo Please run: git init
    pause
    exit /b 1
)

REM Check for changes
git status

echo.
echo ========================================
echo   Preparing deployment...
echo ========================================
echo.

REM Add all changes
echo [1/3] Adding changes...
git add .

REM Commit with timestamp
echo.
echo [2/3] Committing changes...
set datetime=%date% %time%
git commit -m "Deploy: %datetime%"

REM Push to main branch
echo.
echo [3/3] Pushing to Render...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS! Deployment started
    echo ========================================
    echo.
    echo Your changes have been pushed to GitHub.
    echo Render.com will automatically deploy your app.
    echo.
    echo Check your Render dashboard for deployment status:
    echo https://dashboard.render.com/
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR! Push failed
    echo ========================================
    echo.
    echo Please check:
    echo - Are you connected to the internet?
    echo - Is your GitHub remote configured correctly?
    echo   Run: git remote -v
    echo - Do you have push permissions?
    echo.
)

pause

