@echo off
chcp 65001 >nul
title NEON HIDE ^& SEEK
color 0B

:MENU
cls
echo ╔════════════════════════════════════════╗
echo ║     NEON HIDE ^& SEEK - LAUNCHER      ║
echo ╚════════════════════════════════════════╝
echo.
echo [1] Singleplayer starten
echo [2] Multiplayer Server starten
echo [3] Multiplayer Client starten
echo [4] Alles installieren
echo [5] Beenden
echo.
set /p choice="Wähle eine Option (1-5): "

if "%choice%"=="1" goto SINGLEPLAYER
if "%choice%"=="2" goto MULTIPLAYER_SERVER
if "%choice%"=="3" goto MULTIPLAYER_CLIENT
if "%choice%"=="4" goto INSTALL
if "%choice%"=="5" goto END
goto MENU

:SINGLEPLAYER
cls
echo ╔════════════════════════════════════════╗
echo ║         SINGLEPLAYER MODUS            ║
echo ╚════════════════════════════════════════╝
echo.
echo Installiere Requirements...
python -m pip install -q -r server\requirements.txt
echo.
echo Starte Singleplayer Server...
echo Server läuft auf http://localhost:8000
echo.
echo Öffne deinen Browser: http://localhost:8000
echo.
echo Drücke STRG+C zum Beenden
echo.
cd /d "%~dp0"
python server\server.py
goto END

:MULTIPLAYER_SERVER
cls
echo ╔════════════════════════════════════════╗
echo ║      MULTIPLAYER SERVER MODUS         ║
echo ╚════════════════════════════════════════╝
echo.
echo Installiere Requirements...
python -m pip install -q -r server\requirements_multiplayer.txt
echo.
echo Starte Multiplayer Server...
echo Server läuft auf http://localhost:8080
echo.
echo Andere Spieler können sich verbinden über:
echo http://[DEINE-IP]:8080
echo.
echo Drücke STRG+C zum Beenden
echo.
cd /d "%~dp0"
python server\server_multiplayer.py
goto END

:MULTIPLAYER_CLIENT
cls
echo ╔════════════════════════════════════════╗
echo ║      MULTIPLAYER CLIENT MODUS         ║
echo ╚════════════════════════════════════════╝
echo.
echo Öffne deinen Browser und gehe zu:
echo.
echo   Local:    http://localhost:8080
echo   Netzwerk: http://[SERVER-IP]:8080
echo.
pause
goto MENU

:INSTALL
cls
echo ╔════════════════════════════════════════╗
echo ║      INSTALLATION                     ║
echo ╚════════════════════════════════════════╝
echo.
echo Installiere Singleplayer Requirements...
python -m pip install -r server\requirements.txt
echo.
echo Installiere Multiplayer Requirements...
python -m pip install -r server\requirements_multiplayer.txt
echo.
echo ✓ Installation abgeschlossen!
echo.
pause
goto MENU

:END
exit

