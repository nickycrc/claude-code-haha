param(
  [string]$ConfigBackup,
  [switch]$SkipInstall,
  [switch]$AddToPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$bunCommand = Get-Command bun -ErrorAction SilentlyContinue
if ($bunCommand) {
  $bunExecutable = $bunCommand.Source
} else {
  $bunExecutable = Join-Path $env:USERPROFILE '.bun\bin\bun.exe'
  if (-not (Test-Path -LiteralPath $bunExecutable)) {
    throw '请先安装 Bun：powershell -c "irm https://bun.sh/install.ps1 | iex"'
  }
}

if ($ConfigBackup) {
  $ConfigBackup = (Resolve-Path -LiteralPath $ConfigBackup).Path
}
Push-Location $projectRoot
try {
  if (-not $SkipInstall) {
    & $bunExecutable install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw '依赖安装失败' }
  }
  if ($ConfigBackup) {
    & $bunExecutable run scripts/migrate-cch-config.ts import $ConfigBackup
    if ($LASTEXITCODE -ne 0) { throw '配置恢复失败' }
  }

  $binDirectory = Join-Path $projectRoot 'bin'
  if ($AddToPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($binDirectory -notin ($userPath -split ';')) {
      [Environment]::SetEnvironmentVariable('Path', ($userPath.TrimEnd(';') + ';' + $binDirectory).TrimStart(';'), 'User')
    }
  }
  if ($binDirectory -notin ($env:Path -split ';')) { $env:Path += ';' + $binDirectory }

  $healthUrl = 'http://127.0.0.1:3456/health'
  $healthy = $false
  try { $healthy = (Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2).status -eq 'ok' } catch {}
  if (-not $healthy) {
    $env:SERVER_PORT = '3456'
    $env:SERVER_HOST = '127.0.0.1'
    $proxyProcess = Start-Process -FilePath $bunExecutable -ArgumentList @('run', 'src/server/index.ts') `
      -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $projectRoot '.tmp-deploy-proxy.out.log') `
      -RedirectStandardError (Join-Path $projectRoot '.tmp-deploy-proxy.err.log')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      Start-Sleep -Milliseconds 500
      try { $healthy = (Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1).status -eq 'ok' } catch {}
      if ($healthy -or $proxyProcess.HasExited) { break }
    }
    if (-not $healthy) { throw '本地转换代理未能启动，请查看 .tmp-deploy-proxy.err.log，确认 3456 端口可用' }
  }
  Write-Host '部署完成，转换代理已启动。现在可以输入 cch，通过 /model 切换模型。'
  Write-Host '电脑重启后，先运行 bin\start-proxy-server.cmd，再运行 cch。'
} finally {
  Pop-Location
}
