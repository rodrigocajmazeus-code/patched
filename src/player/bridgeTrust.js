export function playerOrigin(playerUrl) {
  try {
    const url = new URL(playerUrl)
    return url.protocol === 'https:' ? url.origin : null
  } catch { return null }
}

export function isTrustedPlayerEvent(event, frameWindow, playerUrl) {
  const origin = playerOrigin(playerUrl)
  return !!origin && !!frameWindow && event.source === frameWindow && event.origin === origin
}

// A forward position jump can be a seek. Infer playing only from plausible,
// recent progression; no advancement is not evidence of a pause (buffering).
export function resolvePaused(parsed, previous, now) {
  if (typeof parsed.paused === 'boolean') return parsed.paused
  const elapsed = (now - previous.updatedAt) / 1000
  const advanced = parsed.time - previous.time
  if (!previous.updatedAt || elapsed <= 0 || elapsed > 15) return null
  const rate = advanced / elapsed
  return advanced > 0.15 && rate >= 0.25 && rate <= 2.5 ? false : null
}
