# cch 模型记忆与换电脑部署

`/model` 或 `/config` 选择模型后，下次启动会恢复上次选择。同一个本地代理连接的不同 API 服务分别记忆模型。`/model default` 恢复当前 API 服务的默认模型；启动参数 `--model 模型ID` 临时覆盖保存的选择。

模型记忆保存在 `%USERPROFILE%\.claude\cc-haha\model-selections.json`。如果设置了 `CLAUDE_CONFIG_DIR`，则保存在该配置目录下。旧版本保存在 `settings.json` 中的模型，只在当前 API 模型列表包含它时恢复，避免把旧的本地模型带到 WD。

## GitHub 上的版本

当前新版分支是 `update-upstream-temp`，克隆时要指定它。仓库是否公开由 GitHub 仓库设置决定，`package.json` 中的 `private: true` 只表示禁止发布到 npm。

Git 仓库包含代码和中文菜单。API 服务、密钥、模型列表以及个人设置保存在用户配置目录，需通过配置备份迁移。

## 在原电脑导出配置

在仓库目录运行 PowerShell：

```powershell
& "$env:USERPROFILE\.bun\bin\bun.exe" run scripts/migrate-cch-config.ts export .cch-backup\my-settings.cch-backup.json
```

备份包含 API 密钥，请通过自己的设备或安全存储传输。备份文件及 `.cch-backup` 目录已被 Git 忽略。重复导出要换一个文件名，以保留之前的备份。

备份包括：

- API 服务列表、密钥、模型映射及可选模型列表。
- 当前启用的 API 服务和 cch 管理的环境设置。
- 各 API 服务上次选中的模型。
- CLI 的用户 `settings.json`，包括其中的权限、插件启用项等设置。

## 在另一台 Windows 电脑部署

先安装 Git 和 Bun，再克隆新版分支：

```powershell
git clone --branch update-upstream-temp https://github.com/nickycrc/claude-code-haha.git
cd claude-code-haha
```

把备份文件复制到新电脑，例如 `D:\备份\my-settings.cch-backup.json`。在 PowerShell 7 中运行：

```powershell
.\scripts\setup-cch.ps1 -ConfigBackup 'D:\备份\my-settings.cch-backup.json' -AddToPath
cch
```

脚本安装依赖、恢复配置、启动本地转换代理，并通过 `-AddToPath` 把 `cch` 加入用户 PATH。电脑重启后，先运行 `bin\start-proxy-server.cmd`，再运行 `cch`。如果 PowerShell 的执行策略禁止运行脚本，可以仅为当前终端设置：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

也可以仅恢复设置，不执行安装步骤：

```powershell
bun run scripts/migrate-cch-config.ts import 'D:\备份\my-settings.cch-backup.json'
```

恢复前，目标电脑现有对应文件会自动备份到配置目录的 `cc-haha\restore-backups\`。恢复后重新启动 cch。API 密钥不会在命令输出中显示。

## 哪些内容仍需单独迁移

上述工具恢复 API 和 CLI 配置。插件本体、Skills、MCP 外部程序及服务、聊天历史、项目文件、本地模型文件和仓库 `.env` 不在备份中。设置中引用的旧电脑绝对路径需要调整；原电脑上的本地模型服务也需要在新电脑安装，或改用可访问的服务地址。WD 使用远程 API，可以在新电脑继续使用同一服务和可选模型。
