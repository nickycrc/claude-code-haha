import { describe, expect, test } from 'bun:test'
import { getConfiguredModelIds } from './configuredModels.js'

describe('configured API model choices', () => {
  test('lists distinct model mappings and additional models without changing case', () => {
    expect(getConfiguredModelIds({
      ANTHROPIC_MODEL: 'Qwen/Main',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'Qwen/Main',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'DeepSeek/Reasoner',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
      CCH_MODEL_OPTIONS: '[" Other:Model ", "Qwen/Main", "", null, 42]',
    })).toEqual(['Qwen/Main', 'DeepSeek/Reasoner', 'Other:Model'])
  })

  test('invalid optional lists retain the configured default models', () => {
    for (const list of ['invalid', '{}', 'null']) {
      expect(getConfiguredModelIds({
        ANTHROPIC_MODEL: 'local-model',
        CCH_MODEL_OPTIONS: list,
      })).toEqual(['local-model'])
    }
  })

  test('unconfigured APIs have no custom model choices', () => {
    expect(getConfiguredModelIds({})).toEqual([])
  })
})
