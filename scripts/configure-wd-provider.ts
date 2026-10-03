import { createInterface } from 'node:readline'
import { ProviderService } from '../src/server/services/providerService.js'

if (process.argv.includes('--sync-active')) {
  const svc = new ProviderService()
  const { activeId, providers } = await svc.listProviders()
  const provider = providers.find(item => item.id === activeId && item.name === 'WD 合集')
  if (!provider) throw new Error('WD provider is not active')
  await svc.activateProvider(provider.id)
  console.log(JSON.stringify({ synced: true, name: provider.name, count: provider.availableModels?.length }))
  process.exit(0)
}

const input = createInterface({ input: process.stdin, terminal: false })
const apiKey = await new Promise<string>(resolve => input.once('line', resolve))
input.close()
const baseUrl = 'https://wb.3dvrtv.net:8443/v1'
const response = await fetch(`${baseUrl}/models`, {
  headers: { Authorization: `Bearer ${apiKey}` },
  signal: AbortSignal.timeout(30_000),
})
if (!response.ok) throw new Error(`Models API returned HTTP ${response.status}`)
const body = await response.json() as { data?: { id?: unknown }[] }
const models = [...new Set((body.data ?? [])
  .map(model => model.id)
  .filter((id): id is string => typeof id === 'string' && id.length > 0))]
if (models.length === 0) throw new Error('Models API returned no model IDs')
if (process.argv.includes('--inspect')) {
  console.log(JSON.stringify({ baseUrl, count: models.length, models }))
} else {
  const svc = new ProviderService()
  const { providers } = await svc.listProviders()
  const existing = providers.find(provider => provider.name === 'WD 合集' && provider.baseUrl === baseUrl)
  const requestedDefault = process.argv.find(arg => arg.startsWith('--default='))?.slice('--default='.length)
  const main = requestedDefault || models.find(id => /claude-sonnet/i.test(id)) || models[0]!
  if (!models.includes(main)) throw new Error('Requested default model is not in the API model list')
  const data = {
    name: 'WD 合集', baseUrl, apiKey, apiFormat: 'openai_chat' as const,
    models: { main, sonnet: main, opus: main, haiku: main },
    availableModels: models,
  }
  const provider = existing
    ? await svc.updateProvider(existing.id, data)
    : await svc.addProvider({ presetId: 'custom', ...data })
  await svc.activateProvider(provider.id)
  console.log(JSON.stringify({ configured: true, name: provider.name, default: main, count: models.length }))
}
