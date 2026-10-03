/** Model IDs exposed by the configured API, preserving case and provider names. */
export function getConfiguredModelIds(env: Record<string, string | undefined> = process.env): string[] {
  let additional: unknown = []
  try {
    additional = JSON.parse(env.CCH_MODEL_OPTIONS || '[]')
  } catch {
    // Invalid optional configuration must not prevent opening /model.
  }

  const candidates: unknown[] = [
    env.ANTHROPIC_MODEL,
    env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    ...(Array.isArray(additional) ? additional : []),
  ]
  return [...new Set(candidates
    .filter((id): id is string => typeof id === 'string')
    .map(id => id.trim())
    .filter(Boolean))]
}
