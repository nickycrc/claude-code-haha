import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProviderService } from '../services/providerService.js'
import { handleProxyRequest } from '../proxy/handler.js'
import { CreateProviderSchema, UpdateProviderSchema } from '../types/provider.js'
import { getConfiguredModelIds } from '../../utils/model/configuredModels.js'

const originalFetch = globalThis.fetch
let originalConfigDir: string | undefined
let configDir: string

beforeEach(async () => {
  originalConfigDir = process.env.CLAUDE_CONFIG_DIR
  configDir = await mkdtemp(join(tmpdir(), 'cch-model-selection-'))
  process.env.CLAUDE_CONFIG_DIR = configDir
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (originalConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = originalConfigDir
  await rm(configDir, { recursive: true, force: true })
})

describe('configured model selection through the OpenAI proxy', () => {
  test('provider activation removes the previous provider custom model option', async () => {
    await mkdir(join(configDir, 'cc-haha'), { recursive: true })
    await writeFile(join(configDir, 'cc-haha', 'settings.json'), JSON.stringify({
      env: { ANTHROPIC_CUSTOM_MODEL_OPTION: 'Previous/Model',
        ANTHROPIC_CUSTOM_MODEL_OPTION_NAME: 'Previous',
        ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION: 'Previous provider model',
        UNRELATED_SETTING: 'preserved' },
    }))
    const svc = new ProviderService()
    const provider = await svc.addProvider(CreateProviderSchema.parse({
      presetId: 'custom', name: 'New API', apiKey: 'test-api-key',
      baseUrl: 'https://models.example.test/v1', apiFormat: 'openai_chat',
      models: { main: 'New/Model', sonnet: 'New/Model', opus: 'New/Model', haiku: 'New/Model' },
      availableModels: ['New/Model', 'New/Second'],
    }))
    await svc.activateProvider(provider.id)
    const env = (await svc.getManagedSettings()).env
    expect(env?.ANTHROPIC_CUSTOM_MODEL_OPTION).toBe('')
    expect(env?.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME).toBe('')
    expect(env?.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION).toBe('')
    expect(env?.UNRELATED_SETTING).toBe('preserved')
  })

  for (const apiFormat of ['openai_chat', 'openai_responses'] as const) {
    test(`${apiFormat} forwards each selected model with the same endpoint and key`, async () => {
      const svc = new ProviderService()
      const provider = await svc.addProvider(CreateProviderSchema.parse({
        presetId: 'custom', name: 'Example API', apiKey: 'test-api-key',
        baseUrl: 'https://models.example.test', apiFormat,
        models: { main: 'Qwen/Main', sonnet: 'Qwen/Main', opus: 'Qwen/Main', haiku: 'Qwen/Main' },
        availableModels: ['DeepSeek/Reasoner', 'Other:Model'],
      }))
      await svc.activateProvider(provider.id)
      const settings = await svc.getManagedSettings()
      const env = settings.env as Record<string, string>
      expect(getConfiguredModelIds(env)).toEqual(['Qwen/Main', 'DeepSeek/Reasoner', 'Other:Model'])
      expect(env.ANTHROPIC_BASE_URL).toBe('http://127.0.0.1:3456/proxy')

      const sentModels: string[] = []
      globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        expect(String(input)).toBe(`https://models.example.test/v1/${apiFormat === 'openai_chat' ? 'chat/completions' : 'responses'}`)
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-api-key')
        const body = JSON.parse(init?.body as string)
        sentModels.push(body.model)
        return Response.json(apiFormat === 'openai_chat'
          ? { id: 'chat-test', model: body.model, choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } }
          : { id: 'response-test', model: body.model, status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }], usage: { input_tokens: 1, output_tokens: 1 } })
      }) as typeof fetch

      for (const model of getConfiguredModelIds(env)) {
        const url = new URL('http://127.0.0.1:3456/proxy/v1/messages')
        const response = await handleProxyRequest(new Request(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: 64, messages: [{ role: 'user', content: 'Hello' }] }),
        }), url)
        expect(response.status).toBe(200)
        expect((await response.json()).model).toBe(model)
      }
      expect(sentModels).toEqual(['Qwen/Main', 'DeepSeek/Reasoner', 'Other:Model'])

      await svc.updateProvider(provider.id, UpdateProviderSchema.parse({ availableModels: ['New/Model'] }))
      const updated = await svc.getManagedSettings()
      expect(getConfiguredModelIds(updated.env as Record<string, string>)).toEqual(['Qwen/Main', 'New/Model'])
      await svc.activateOfficial()
      expect((await svc.getManagedSettings()).env?.CCH_MODEL_OPTIONS).toBeUndefined()
    })
  }
})
