# Claude Code Haha - Windows PowerShell 启动脚本
param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

# 项目根目录（固定路径）
$RootDir = "d:\myapps\claude-code-haha"

# 设置环境变量
$env:DISABLE_TELEMETRY = "1"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$env:CLAUDE_CODE_LOCAL_VERSION = "999.0.0-local"
$env:CLAUDE_CODE_LOCAL_PACKAGE_URL = "claude-code-local"
$env:CLAUDE_CODE_LOCAL_BUILD_TIME = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
$env:CLAUDE_CODE_LOCAL_SKIP_REMOTE_PREFETCH = "1"

# Bun 路径
$BunPath = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"

# 使用绝对路径
$CliPath = Join-Path $RootDir "src\entrypoints\cli.tsx"
$EnvPath = Join-Path $RootDir ".env"

# 构建参数
$BunArgs = @(
    "run",
    "--env-file=$EnvPath",
    $CliPath
) + $Arguments

# 在工作目录运行（不切换目录）
& $BunPath @BunArgs
