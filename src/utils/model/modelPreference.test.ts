import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setMainLoopModelOverride } from '../../bootstrap/state.js'
import type { AppState } from '../../state/AppStateStore.js'
import { onChangeAppState } from '../../state/onChangeAppState.js'
import { createStore } from '../../state/store.js'
import { enableConfigs } from '../config.js'
import { resetSettingsCache } from '../settings/settingsCache.js'
import { getMainLoopModel, getUserSpecifiedModelSetting } from './model.js'
import { getRememberedCliModel, saveRememberedCliModel } from './modelPreference.js'

const keys = ['CLAUDE_CONFIG_DIR', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'CCH_MODEL_OPTIONS', 'ANTHROPIC_API_KEY',
  'CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST', 'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY'] as const
let previous: (string | undefined)[]
let configDir: string

beforeEach(() => {
  previous = keys.map(key => process.env[key])
  for (const key of keys) delete process.env[key]
  configDir = mkdtempSync(join(tmpdir(), 'cch-model-memory-'))
  mkdirSync(join(configDir, 'cc-haha'))
  process.env.CLAUDE_CONFIG_DIR = configDir
  process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:3456/proxy'
  process.env.ANTHROPIC_MODEL = 'cn:balanced-model'
  process.env.ANTHROPIC_API_KEY = 'test-key'
  process.env.CCH_MODEL_OPTIONS = '["cn:balanced-model", "cn:fast-model"]'
  setMainLoopModelOverride(undefined)
  resetSettingsCache()
  enableConfigs()
})

afterEach(() => {
  setMainLoopModelOverride(undefined)
  resetSettingsCache()
  keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]
    else process.env[key] = previous[index]
  })
  rmSync(configDir, { recursive: true, force: true })
})

function activate(id: string) {
  writeFileSync(join(configDir, 'cc-haha', 'providers.json'), JSON.stringify({
    activeId: id,
    providers: ['wd', 'other'].map(id => ({ id, apiFormat: 'openai_chat',
      baseUrl: `https://${id}.example.test/v1`, apiKey: 'secret-not-to-be-persisted' })),
  }))
}

test('the /model state change survives a fresh CLI process despite the provider default', () => {
  activate('wd')
  const initial = { mainLoopModel: 'cn:balanced-model', toolPermissionContext: { mode: 'default' },
    settings: {} } as AppState
  const store = createStore(initial, onChangeAppState)
  store.setState(state => ({ ...state, mainLoopModel: 'cn:fast-model' }))

  const child = Bun.spawnSync([process.execPath, '--preload', resolve('preload.ts'), '-e',
    `import { enableConfigs } from './src/utils/config.ts'
     import { getMainLoopModel } from './src/utils/model/model.ts'
     enableConfigs()
     console.log(getMainLoopModel())`], { env: process.env, stdout: 'pipe', stderr: 'pipe' })
  expect(child.exitCode).toBe(0)
  expect(child.stdout.toString().trim()).toBe('cn:fast-model')
  expect(readFileSync(join(configDir, 'cc-haha', 'model-selections.json'), 'utf8')).not.toContain('secret-not-to-be-persisted')
})

test('each provider sharing the same proxy remembers its own selection', () => {
  activate('wd')
  saveRememberedCliModel('cn:fast-model')
  activate('other')
  expect(getRememberedCliModel('cn:fast-model')).toBeUndefined()
  saveRememberedCliModel('Other/Model')
  activate('wd')
  expect(getRememberedCliModel()).toBe('cn:fast-model')
  activate('other')
  expect(getRememberedCliModel()).toBe('Other/Model')
})

test('choosing default clears the previous model and restores the provider default after restart', () => {
  activate('wd')
  saveRememberedCliModel('cn:fast-model')
  const initial = { mainLoopModel: 'cn:fast-model', toolPermissionContext: { mode: 'default' }, settings: {} } as AppState
  createStore(initial, onChangeAppState).setState(state => ({ ...state, mainLoopModel: null }))
  setMainLoopModelOverride(undefined)
  expect(getUserSpecifiedModelSetting()).toBeNull()
  expect(getMainLoopModel()).toBe('cn:balanced-model')
})

test('--model overrides the saved selection without changing it', () => {
  saveRememberedCliModel('cn:fast-model')
  setMainLoopModelOverride('Explicit/Model')
  expect(getUserSpecifiedModelSetting()).toBe('Explicit/Model')
  setMainLoopModelOverride(undefined)
  expect(getUserSpecifiedModelSetting()).toBe('cn:fast-model')
})

test('old saved settings migrate only when the current API offers that model', () => {
  expect(getRememberedCliModel('Old/Qwen')).toBeUndefined()
  expect(getRememberedCliModel('cn:fast-model')).toBe('cn:fast-model')
})

test('host-managed desktop sessions ignore CLI memory and do not overwrite it', () => {
  saveRememberedCliModel('cn:fast-model')
  process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST = '1'
  expect(getUserSpecifiedModelSetting()).toBe('cn:balanced-model')
  saveRememberedCliModel('Desktop/Model')
  delete process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST
  expect(getRememberedCliModel()).toBe('cn:fast-model')
})

test('manually configured endpoints are isolated and malformed memory does not prevent startup', () => {
  saveRememberedCliModel('cn:fast-model')
  process.env.ANTHROPIC_BASE_URL = 'https://different.example.test/v1'
  expect(getRememberedCliModel()).toBeUndefined()
  writeFileSync(join(configDir, 'cc-haha', 'model-selections.json'), '{bad json')
  expect(getMainLoopModel()).toBe('cn:balanced-model')
  saveRememberedCliModel('Different/Model')
  expect(getRememberedCliModel()).toBe('Different/Model')
})
