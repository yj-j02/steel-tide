@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0typecast_tts.ps1"
echo.
echo 끝났습니다. Claude 채팅에 "다 했어" 라고 보내 주세요.
pause
