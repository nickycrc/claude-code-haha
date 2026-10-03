import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getClaudeConfigHomeDir, isEnvTruthy } from '../envUtils.js'
import { getConfiguredModelIds } from './configuredModels.js'
import type { ModelSetting } from './model.js'

type Preferences = Record<string, ModelSetting>

function preferencePath(): string {
  return join(getClaudeConfigHomeDir(), 'cc-haha', 'model-selections.json')
}

function providerScope(): string | undefined {
  if (isEnvTruthy(process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) return undefined

  const endpoint = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
  let identity = endpoint
  try {
    const index = JSON.parse(readFileSync(join(getClaudeConfigHomeDir(), 'cc-haha', 'providers.json'), 'utf8'))
    const provider = index.providers?.find((item: { id?: string }) => item.id === index.activeId)
    const usesProxy = provider?.apiFormat && provider.apiFormat !== 'anthropic'
    if (provider && (usesProxy
      ? /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+\/proxy$/.test(endpoint)
      : provider.baseUrl?.replace(/\/+$/, '') === endpoint)) {
      // Both OpenAI providers share the local proxy URL; scope them by saved ID.
      identity = JSON.stringify([provider.id, provider.baseUrl, provider.apiFormat])
    }
  } catch {
    // A manually configured API can still remember its model without a provider index.
  }
  identity += JSON.stringify([
    process.env.CLAUDE_CODE_USE_BEDROCK,
    process.env.CLAUDE_CODE_USE_VERTEX,
    process.env.CLAUDE_CODE_USE_FOUNDRY,
  ])
  return createHash('sha256').update(identity).digest('hex')
}

function readPreferences(): Preferences {
  try {
    const parsed = JSON.parse(readFileSync(preferencePath(), 'utf8'))
    if (parsed?.version !== 1 || !parsed.models || typeof parsed.models !== 'object' || Array.isArray(parsed.models)) return {}
    return Object.fromEntries(Object.entries(parsed.models)
      .filter((entry): entry is [string, ModelSetting] => entry[1] === null || (typeof entry[1] === 'string' && entry[1].trim().length > 0)))
  } catch {
    return {}
  }
}

export function getRememberedCliModel(previousSetting?: string): ModelSetting | undefined {
  const scope = providerScope()
  if (!scope) return undefined
  const models = readPreferences()
  if (Object.hasOwn(models, scope)) return models[scope]

  // Restore selections saved by older cch versions only if this API offers them.
  // This prevents importing a stale local-model setting into WD's model list.
  if (Object.keys(models).length === 0 && process.env.ANTHROPIC_BASE_URL && previousSetting && getConfiguredModelIds().includes(previousSetting)) {
    return previousSetting
  }
  return undefined
}

export function saveRememberedCliModel(model: ModelSetting): void {
  const scope = providerScope()
  if (!scope) return
  const models = readPreferences()
  models[scope] = model
  const filePath = preferencePath()
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  mkdirSync(join(getClaudeConfigHomeDir(), 'cc-haha'), { recursive: true })
  try {
    writeFileSync(temporaryPath, JSON.stringify({ version: 1, models }, null, 2) + '\n', { mode: 0o600 })
    renameSync(temporaryPath, filePath)
  } catch (error) {
    try { unlinkSync(temporaryPath) } catch {}
    throw error
  }
}
