/** Accept either a server root or an OpenAI base URL already ending in /v1. */
export function getOpenaiEndpoint(baseUrl: string, endpoint: 'chat/completions' | 'responses' | 'models'): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base.endsWith('/v1') ? base : `${base}/v1`}/${endpoint}`
}
