# Claude Code Haha - Windows PowerShell 启动脚本
# 使用方法: .\claude-haha-cmd.ps1 [参数]
# 示例: .\claude-haha-cmd.ps1 -p "你好"

$RootDir = "d:\myapps\claude-code-haha"
$BunPath = "$env:USERPROFILE\.bun\bin\bun.exe"

$env:DISABLE_TELEMETRY = "1"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"

Write-Host "Claude Code Haha" -ForegroundColor Green
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

& $BunPath run --config="$RootDir\bunfig.toml" --env-file="$RootDir\.env" "$RootDir\src\entrypoints\cli.tsx" @args
