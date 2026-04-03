# Claude Code Haha - 带颜色支持的启动脚本
$RootDir = "d:\myapps\claude-code-haha"
$BunPath = "$env:USERPROFILE\.bun\bin\bun.exe"

$env:DISABLE_TELEMETRY = "1"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"

# 启用 ANSI 颜色支持
$env:TERM = "xterm-256color"

# 设置输出编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 运行 Claude Code
& $BunPath run --config="$RootDir\bunfig.toml" --env-file="$RootDir\.env" "$RootDir\src\entrypoints\cli.tsx" @args
