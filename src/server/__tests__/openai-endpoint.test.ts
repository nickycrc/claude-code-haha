import { expect, test } from 'bun:test'
import { getOpenaiEndpoint } from '../proxy/openaiEndpoint.js'

test('OpenAI endpoints accept server roots and versioned base URLs', () => {
  for (const endpoint of ['chat/completions', 'responses', 'models'] as const) {
    for (const base of ['https://example.test', 'https://example.test/', 'https://example.test/v1', 'https://example.test/v1/']) {
      expect(getOpenaiEndpoint(base, endpoint)).toBe(`https://example.test/v1/${endpoint}`)
    }
    expect(getOpenaiEndpoint('https://example.test/api/v1/', endpoint)).toBe(`https://example.test/api/v1/${endpoint}`)
  }
})
