@echo off
setlocal
set "ROOT=%~dp0.."
"%USERPROFILE%\.bun\bin\bun.exe" --env-file="%ROOT%\.env" "%ROOT%\src\entrypoints\cli.tsx" %*
