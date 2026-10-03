@echo off
rem Start the cc-haha conversion proxy server (Anthropic -> OpenAI).
rem Needed by cch / the desktop app: provider "proxy-conversion" mode points
rem ANTHROPIC_BASE_URL at http://127.0.0.1:3456/proxy
set "SERVER_PORT=3456"
set "SERVER_HOST=127.0.0.1"
cd /d "%~dp0.."
if exist "%USERPROFILE%\.bun\bin\bun.exe" (
  "%USERPROFILE%\.bun\bin\bun.exe" run src/server/index.ts
) else (
  bun run src/server/index.ts
)
