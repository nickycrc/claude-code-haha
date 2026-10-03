import { ProviderService } from '../src/server/services/providerService.js'
import { handleProxyRequest } from '../src/server/proxy/handler.js'

const svc = new ProviderService()
const { providers, activeId } = await svc.listProviders()
const provider = providers.find(item => item.id === activeId)
if (!provider || provider.name !== 'WD 合集') throw new Error('WD provider is not active')
for (const model of ['cn:balanced-model', 'cn:fast-model']) {
  const url = new URL('http://127.0.0.1:3456/proxy/v1/messages')
  const response = await handleProxyRequest(new Request(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 32, stream: true, messages: [{ role: 'user', content: 'Reply with exactly: PONG' }] }),
  }), url)
  const body = await response.text()
  if (!response.ok || !body.includes('message_stop')) throw new Error(`Streaming check failed for ${model}: HTTP ${response.status}`)
  const text = body.split('\n').filter(line => line.startsWith('data: '))
    .flatMap(line => {
      try {
        const event = JSON.parse(line.slice(6))
        return event.delta?.type === 'text_delta' ? [event.delta.text] : []
      } catch { return [] }
    }).join('')
  if (!text.includes('PONG')) throw new Error(`Unexpected response for ${model}: ${text.slice(0, 120)}`)
  console.log(JSON.stringify({ model, status: response.status, streamComplete: true, reply: text }))
}
