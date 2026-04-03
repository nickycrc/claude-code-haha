# Claude Code - 全局启动脚本
$RootDir = "d:\myapps\claude-code-haha"
$BunPath = "$env:USERPROFILE\.bun\bin\bun.exe"

$env:DISABLE_TELEMETRY = "1"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"

& $BunPath run --config="$RootDir\bunfig.toml" --env-file="$RootDir\.env" "$RootDir\src\entrypoints\cli.tsx" @args
