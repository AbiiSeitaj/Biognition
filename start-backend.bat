@echo off
cd /d "%~dp0"
call "%~dp0stop-backend.bat"
cd /d "%~dp0\backend"
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
if not exist .venv (
  py -3.14 -m venv .venv 2>nul || python -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo.
echo Dr Scan API -^> http://127.0.0.1:8765
echo Frontend should use NEXT_PUBLIC_API_URL=http://127.0.0.1:8765
echo.
uvicorn app.main:app --host 127.0.0.1 --port 8765
