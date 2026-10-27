@echo off
setlocal
cd /d "%~dp0"
set "ORIGIN=https://github.com/rodrigocajmazeus-code/patched.git"
echo.
echo ===== PUBLICAR CODIGO PATCHED EN GITHUB =====
echo Repositorio destino: %ORIGIN%
echo.
where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no esta instalado o no esta en PATH.
  echo Puedes instalar Git desde https://git-scm.com/download/win
  goto :fail
)
if not exist "src\App.jsx" (
  echo ERROR: Ejecuta este archivo dentro de la carpeta extraida de PATCHED_codigo.zip
  goto :fail
)
if exist ".git" (
  echo SEGURIDAD: Ya existe un repositorio Git en esta carpeta.
  echo No se modifico nada. Revisa el remoto antes de continuar.
  goto :fail
)
echo.
echo IMPORTANTE: Debes haber creado ANTES un repositorio VACIO y PUBLICO
 echo con el nombre patched en tu cuenta rodrigocajmazeus-code.
set /p OK=Escribe SI para continuar (o cualquier cosa para cancelar): 
if /I not "%OK%"=="SI" (
  echo Cancelado sin cambios.
  pause
  exit /b 0
)
git init -b main
if errorlevel 1 goto :fail
git add .
if errorlevel 1 goto :fail
git commit -m "PATCHED v0.9 - sitio personal"
if errorlevel 1 (
  echo ERROR: Git necesita nombre y correo configurados, o hubo otro error.
  echo No se ha subido nada a GitHub.
  goto :fail
)
git remote add origin "%ORIGIN%"
if errorlevel 1 goto :fail
echo.
echo Git puede abrir una ventana de acceso a GitHub.
git push -u origin main
if errorlevel 1 (
  echo No se pudo subir: confirma que el repositorio existe, este VACIO,
  echo y que autorizaste el acceso a GitHub. No forzamos ninguna rama.
  goto :fail
)
echo.
echo LISTO: CODIGO SUBIDO A GITHUB.
echo PASO FINAL MANUAL: Settings - Pages - Source: GitHub Actions.
echo Luego Actions - PATCHED - Publicar GitHub Pages (manual) - Run workflow.
echo URL PREVISTA: https://rodrigocajmazeus-code.github.io/patched/
pause
exit /b 0
:fail
echo.
echo DETENIDO SIN SOBRESCRIBIR UN REPOSITORIO REMOTO.
pause
exit /b 1
