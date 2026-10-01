@echo off
title OCUTUS SISTEAMS - Iniciar Sistema
echo ===================================================
echo           INICIANDO OCUTUS SISTEAMS
echo ===================================================
echo.
cd /d "%~dp0"
echo Abrindo o servidor local...
start http://localhost:5173/
npm run dev
pause
