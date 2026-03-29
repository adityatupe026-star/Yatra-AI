@echo off
cd /d "%~dp0"
echo Starting YatraAI frontend at http://localhost:5500
python -m http.server 5500
