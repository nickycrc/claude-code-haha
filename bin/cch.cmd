@echo off
setlocal

for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"

if exist "%USERPROFILE%\.bun\bin\bun.exe" (
  set "BUN_CMD=%USERPROFILE%\.bun\bin\bun.exe"
) else (
  where bun >nul 2>&1
  if %ERRORLEVEL%==0 (
    set "BUN_CMD=bun"
  ) else (
    echo [cch] Bun not found. Install: powershell -c "irm bun.sh/install.ps1 ^| iex"
    exit /b 1
  )
)

rem Provider/API config is managed by ~/.claude/cc-haha/settings.json
rem (it overrides any env set here). Proxy-conversion mode looks like:
rem   ANTHROPIC_BASE_URL=http://127.0.0.1:3456/proxy
rem   ANTHROPIC_AUTH_TOKEN=proxy-managed   (key held by the local proxy)
rem Start the conversion proxy first: SERVER_PORT=3456 bun run src/server/index.ts
rem Upstream endpoint and model options come from the active saved provider.

set "CALLER_DIR=%CD%"
set "PWD=%CD%"

cd /d "%CALLER_DIR%"
"%BUN_CMD%" --preload "%ROOT_DIR%\preload.ts" --env-file "%ROOT_DIR%\.env" "%ROOT_DIR%\src\entrypoints\cli.tsx" %*
