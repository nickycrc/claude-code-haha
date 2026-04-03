@echo off
setlocal enabledelayedexpansion

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

:: 切换到项目根目录
cd /d "%ROOT_DIR%"

:: 设置环境变量
set "DISABLE_TELEMETRY=1"
set "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1"
set "CLAUDE_CODE_LOCAL_VERSION=999.0.0-local"
set "CLAUDE_CODE_LOCAL_PACKAGE_URL=claude-code-local"
set "CLAUDE_CODE_LOCAL_BUILD_TIME=2024-01-01T00:00:00Z"
set "CLAUDE_CODE_LOCAL_SKIP_REMOTE_PREFETCH=1"

:: 运行 Bun
"%USERPROFILE%\.bun\bin\bun.exe" run --env-file=.env ./src/entrypoints/cli.tsx %*
