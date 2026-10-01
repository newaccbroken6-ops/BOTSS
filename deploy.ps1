# PowerShell deployment script for Vercel
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     FREE FIRE BOT - DEPLOY WEBSITE + API TO VERCEL" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
& npx.cmd vercel --prod
