@echo off
set "CLAUDE_ROOT=d:\myapps\claude-code-haha"
set "BUN_PATH=%USERPROFILE%\.bun\bin\bun.exe"
set "DISABLE_TELEMETRY=1"
set "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1"
"%BUN_PATH%" run --config="%CLAUDE_ROOT%\bunfig.toml" --env-file="%CLAUDE_ROOT%\.env" "%CLAUDE_ROOT%\src\entrypoints\cli.tsx" %*
