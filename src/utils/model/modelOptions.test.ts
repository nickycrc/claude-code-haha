import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { enableConfigs } from '../config.js'
import { getModelOptions } from './modelOptions.js'
import { getDefaultMainLoopModelSetting, parseUserSpecifiedModel } from './model.js'

const keys = ['CLAUDE_CONFIG_DIR', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'CCH_MODEL_OPTIONS', 'ANTHROPIC_CUSTOM_MODEL_OPTION', 'ANTHROPIC_API_KEY'] as const
let previous: (string | undefined)[]
let configDir: string

beforeEach(async () => {
  previous = keys.map(key => process.env[key])
  for (const key of keys) delete process.env[key]
  configDir = await mkdtemp(join(tmpdir(), 'cch-model-menu-'))
  process.env.CLAUDE_CONFIG_DIR = configDir
  process.env.ANTHROPIC_API_KEY = 'test-api-key'
  enableConfigs()
})

afterEach(async () => {
  keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]
    else process.env[key] = previous[index]
  })
  await rm(configDir, { recursive: true, force: true })
})

test('/model offers actual API model IDs and resolves the provider default', () => {
  process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:3456/proxy'
  process.env.ANTHROPIC_MODEL = 'Qwen/Main'
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'Different/SonnetMapping'
  process.env.ANTHROPIC_DEFAULT_OPUS_MODEL = 'Qwen/Main'
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'Fast/Model'
  process.env.CCH_MODEL_OPTIONS = '["DeepSeek/Reasoner", "Qwen/Main"]'

  const options = getModelOptions()
  expect(options.map(option => option.value)).toEqual([
    null, 'Qwen/Main', 'Different/SonnetMapping', 'Fast/Model', 'DeepSeek/Reasoner',
  ])
  expect(getDefaultMainLoopModelSetting()).toBe('Qwen/Main')
  for (const option of options) {
    if (option.value !== null) expect(parseUserSpecifiedModel(option.value)).toBe(option.value)
  }
})

test('direct Anthropic-compatible APIs also offer configured custom models', () => {
  process.env.ANTHROPIC_BASE_URL = 'https://models.example.test/anthropic'
  process.env.ANTHROPIC_MODEL = 'Custom/Main'
  process.env.CCH_MODEL_OPTIONS = '["Custom/Second"]'
  expect(getModelOptions().map(option => option.value)).toEqual([null, 'Custom/Main', 'Custom/Second'])
})
