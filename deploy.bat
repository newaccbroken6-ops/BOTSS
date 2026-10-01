@echo off
title Free Fire Bot - Deploy to Vercel
echo ===================================================
echo     FREE FIRE BOT - DEPLOY WEBSITE + API TO VERCEL
echo ===================================================
cd /d "%~dp0"
call npx.cmd vercel --prod
pause
