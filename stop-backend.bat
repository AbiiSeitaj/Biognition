@echo off
REM Stop stale Dr Scan API processes on ports 8765-8770
for %%P in (8765 8766 8767 8768 8769 8770) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr "127.0.0.1:%%P" ^| findstr LISTENING') do (
    echo Stopping process %%A on port %%P...
    taskkill /PID %%A /F >nul 2>&1
  )
)
