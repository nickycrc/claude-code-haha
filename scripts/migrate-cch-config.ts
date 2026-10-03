import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { getClaudeConfigHomeDir } from '../src/utils/envUtils.js'
import { ProviderService } from '../src/server/services/providerService.js'
import { ProvidersIndexSchema } from '../src/server/types/provider.js'

const portableFiles = ['settings.json', 'cc-haha/providers.json',
  'cc-haha/settings.json', 'cc-haha/model-selections.json'] as const
type PortableFile = typeof portableFiles[number]
type Backup = { format: 'cch-settings'; version: 1; files: Partial<Record<PortableFile, string>> }

function writeAtomic(filePath: string, content: string) {
  mkdirSync(dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, content, { mode: 0o600 })
    renameSync(temporary, filePath)
  } catch (error) {
    try { unlinkSync(temporary) } catch {}
    throw error
  }
}

export function exportCchConfig(output: string): string {
  if (!output.endsWith('.cch-backup.json')) throw new Error('备份文件名必须以 .cch-backup.json 结尾，该扩展名已被 Git 忽略')
  const configDir = getClaudeConfigHomeDir()
  const files: Backup['files'] = {}
  for (const name of portableFiles) {
    const filePath = join(configDir, name)
    if (existsSync(filePath)) files[name] = readFileSync(filePath, 'utf8')
  }
  if (!Object.keys(files).length) throw new Error('没有找到可备份的 cch 配置')
  // Older versions stored the selection only in settings.json. Clear destination memory on restore.
  files['cc-haha/model-selections.json'] ??= '{"version":1,"models":{}}\n'
  const backup: Backup = { format: 'cch-settings', version: 1, files }
  const filePath = resolve(output)
  if (existsSync(filePath)) throw new Error('备份文件已存在，请换一个文件名以保留旧备份')
  writeAtomic(filePath, JSON.stringify(backup, null, 2) + '\n')
  return filePath
}

export async function importCchConfig(input: string): Promise<string> {
  const backup = JSON.parse(readFileSync(resolve(input), 'utf8')) as Backup
  if (backup?.format !== 'cch-settings' || backup.version !== 1 || !backup.files || typeof backup.files !== 'object' || Array.isArray(backup.files)) {
    throw new Error('不是有效的 cch 配置备份')
  }
  // Validate the complete archive before touching any destination files.
  const entries = Object.entries(backup.files)
  if (!entries.length) throw new Error('备份中没有配置文件')
  for (const [name, content] of entries) {
    if (!portableFiles.includes(name as PortableFile) || typeof content !== 'string') throw new Error('备份包含不支持的文件')
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('备份中的配置格式无效')
    if (name === 'cc-haha/providers.json') {
      const index = ProvidersIndexSchema.parse(parsed)
      if (index.activeId && !index.providers.some(provider => provider.id === index.activeId)) throw new Error('备份的当前 API 服务不存在')
    }
  }
  const configDir = getClaudeConfigHomeDir()
  const previousBackup = join(configDir, 'cc-haha', 'restore-backups', randomUUID())
  for (const [name, content] of entries) {
    const destination = join(configDir, name)
    if (existsSync(destination)) writeAtomic(join(previousBackup, name), readFileSync(destination, 'utf8'))
    writeAtomic(destination, content)
  }
  if (backup.files['cc-haha/providers.json']) {
    const service = new ProviderService()
    const { activeId } = await service.listProviders()
    // Regenerate the proxy address for the destination machine's local server.
    if (activeId) await service.activateProvider(activeId)
  }
  return configDir
}

if (import.meta.main) {
  try {
    const [command, file] = process.argv.slice(2)
    if (!file || !['export', 'import'].includes(command ?? '')) throw new Error('用法：bun run scripts/migrate-cch-config.ts export|import <备份文件.cch-backup.json>')
    if (command === 'export') {
      console.log(`配置备份已保存：${exportCchConfig(file)}`)
      console.log('备份包含 API 密钥，请通过自己的安全存储或设备传输。')
    } else {
      console.log(`配置已恢复到：${await importCchConfig(file)}`)
      console.log('目标电脑原有配置已保存在 cc-haha/restore-backups 下。请重新启动 cch。')
    }
  } catch {
    // Do not print parser errors: malformed input might contain API credentials.
    console.error('操作失败。请检查命令、备份格式、文件是否已存在以及目录写入权限。')
    process.exitCode = 1
  }
}
