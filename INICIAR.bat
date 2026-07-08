@echo off
title AbarroTech - Sistema POS
color 0A
cls
echo.
echo  ==========================================
echo      AbarroTech - Sistema POS Local
echo  ==========================================
echo.

cd /d "%~dp0"

:: ── Instalar dependencias solo si no existen ──────────────
if not exist "node_modules" (
  echo  [1/3] Instalando dependencias raiz...
  npm install --silent
  echo  OK
)

if not exist "server\node_modules" (
  echo  [2/3] Instalando dependencias del servidor...
  cd server && npm install --silent && cd ..
  echo  OK
)

if not exist "client\node_modules" (
  echo  [3/3] Instalando dependencias del cliente...
  cd client && npm install --legacy-peer-deps --silent && cd ..
  echo  OK
)

echo.
echo  Iniciando servidor backend...
start "AbarroTech-Server" /min cmd /c "node --experimental-sqlite server/index.js"

echo  Esperando que el servidor este listo...
timeout /t 4 /nobreak >nul

echo  Iniciando servidor frontend (Vite HTTPS)...
start "AbarroTech-Vite" /min cmd /c "cd client && npx vite --host 0.0.0.0"

echo  Esperando que Vite compile...
timeout /t 8 /nobreak >nul

:: ── Esperar hasta que Vite responda (max 30 seg) ─────────
echo  Verificando que la app este lista...
set ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
curl -sk --max-time 2 https://localhost:5173 >nul 2>&1
if %errorlevel%==0 goto OPEN_BROWSER
if %ATTEMPTS% GEQ 15 goto OPEN_BROWSER
timeout /t 2 /nobreak >nul
goto WAIT_LOOP

:OPEN_BROWSER
echo.
echo  ==========================================
echo   AbarroTech esta listo!
echo.
echo   Computadora: https://localhost:5173
echo   Celular/Red: https://192.168.100.17:5173
echo.
echo   PRIMERA VEZ EN CELULAR:
echo   Chrome mostrara advertencia de certificado.
echo   Toca "Configuracion avanzada" y luego
echo   "Acceder de todos modos" para continuar.
echo   Solo se hace UNA VEZ por dispositivo.
echo  ==========================================
echo.
start "" "https://localhost:5173"

echo  Presiona cualquier tecla para CERRAR el sistema.
pause >nul

:: ── Al cerrar: matar los procesos del servidor ────────────
echo  Cerrando AbarroTech...
taskkill /FI "WINDOWTITLE eq AbarroTech-Server" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AbarroTech-Vite" /F >nul 2>&1
echo  Sistema cerrado.
