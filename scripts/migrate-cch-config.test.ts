import { afterEach, beforeEach, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProviderService } from '../src/server/services/providerService.js'
import { exportCchConfig, importCchConfig } from './migrate-cch-config.js'

let temporary: string
let source: string
let destination: string
let previousConfigDir: string | undefined
let previousPort: number

beforeEach(async () => {
  temporary = mkdtempSync(join(tmpdir(), 'cch-migration-'))
  source = join(temporary, 'source')
  destination = join(temporary, 'destination')
  mkdirSync(source)
  mkdirSync(destination)
  previousConfigDir = process.env.CLAUDE_CONFIG_DIR
  previousPort = ProviderService.getServerPort()
  process.env.CLAUDE_CONFIG_DIR = source
  ProviderService.setServerPort(3456)
  const service = new ProviderService()
  const provider = await service.addProvider({ presetId: 'custom', name: 'WD 合集',
    baseUrl: 'https://models.example.test/v1', apiKey: 'test-backup-key', apiFormat: 'openai_chat',
    models: { main: 'Main/Model', sonnet: 'Main/Model', opus: 'Main/Model', haiku: 'Main/Model' },
    availableModels: ['Main/Model', 'Selected/Model'] })
  await service.activateProvider(provider.id)
  writeFileSync(join(source, 'settings.json'), JSON.stringify({ model: 'Selected/Model', permissions: { allow: ['Read'] } }))
})

afterEach(() => {
  if (previousConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = previousConfigDir
  ProviderService.setServerPort(previousPort)
  rmSync(temporary, { recursive: true, force: true })
})

test('restores provider IDs, credentials, model options and user settings; preserves destination originals', async () => {
  const memory = '{"version":1,"models":{"test-scope":"Selected/Model"}}'
  writeFileSync(join(source, 'cc-haha', 'model-selections.json'), memory)
  const output = exportCchConfig(join(temporary, 'settings.cch-backup.json'))
  const originalProviders = JSON.parse(readFileSync(join(source, 'cc-haha', 'providers.json'), 'utf8'))
  process.env.CLAUDE_CONFIG_DIR = destination
  const originalSettings = '{"model":"Old/Model"}'
  writeFileSync(join(destination, 'settings.json'), originalSettings)
  await importCchConfig(output)
  const service = new ProviderService()
  const imported = await service.listProviders()
  expect(imported).toEqual(originalProviders)
  expect(imported.providers[0]?.apiKey).toBe('test-backup-key')
  expect(imported.providers[0]?.availableModels).toEqual(['Main/Model', 'Selected/Model'])
  expect(JSON.parse(readFileSync(join(destination, 'settings.json'), 'utf8')).model).toBe('Selected/Model')
  expect(readFileSync(join(destination, 'cc-haha', 'model-selections.json'), 'utf8')).toBe(memory)
  const backups = join(destination, 'cc-haha', 'restore-backups')
  expect(readFileSync(join(backups, readdirSync(backups)[0]!, 'settings.json'), 'utf8')).toBe(originalSettings)
  expect((await service.getManagedSettings()).env).toHaveProperty('ANTHROPIC_BASE_URL', 'http://127.0.0.1:3456/proxy')
})

test('older backups reset stale destination model memory', async () => {
  const output = exportCchConfig(join(temporary, 'older.cch-backup.json'))
  process.env.CLAUDE_CONFIG_DIR = destination
  mkdirSync(join(destination, 'cc-haha'))
  writeFileSync(join(destination, 'cc-haha', 'model-selections.json'), '{"version":1,"models":{"test-scope":"Old/Model"}}')
  await importCchConfig(output)
  expect(JSON.parse(readFileSync(join(destination, 'cc-haha', 'model-selections.json'), 'utf8'))).toEqual({ version: 1, models: {} })
})

test('rejects archive path traversal and invalid provider data before overwriting any settings', async () => {
  const output = exportCchConfig(join(temporary, 'invalid.cch-backup.json'))
  const archive = JSON.parse(readFileSync(output, 'utf8'))
  archive.files['../escaped.json'] = '{}'
  writeFileSync(output, JSON.stringify(archive))
  process.env.CLAUDE_CONFIG_DIR = destination
  await expect(importCchConfig(output)).rejects.toThrow('不支持的文件')
  expect(readdirSync(destination)).toEqual([])
  expect(existsSync(join(temporary, 'escaped.json'))).toBe(false)
  delete archive.files['../escaped.json']
  archive.files['cc-haha/providers.json'] = '{"activeId":"missing","providers":[]}'
  writeFileSync(output, JSON.stringify(archive))
  await expect(importCchConfig(output)).rejects.toThrow('当前 API 服务不存在')
  expect(readdirSync(destination)).toEqual([])
})

test('requires the ignored backup extension and protects existing backup files', () => {
  expect(() => exportCchConfig(join(temporary, 'public-settings.json'))).toThrow('备份文件名')
  const output = exportCchConfig(join(temporary, 'existing.cch-backup.json'))
  const original = readFileSync(output, 'utf8')
  expect(() => exportCchConfig(output)).toThrow('备份文件已存在')
  expect(readFileSync(output, 'utf8')).toBe(original)
})
