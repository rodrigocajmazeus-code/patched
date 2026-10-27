// Quality metadata for media the user owns or is authorized to stream.
// This data comes from hls.js, never from third-party iframe pages.
export function mapHlsLevels(levels) {
  if (!Array.isArray(levels)) return []
  return levels.map((level, index) => ({
    index,
    height: Number.isSafeInteger(level?.height) && level.height > 0 ? level.height : null,
    bitrate: Number.isFinite(level?.bitrate) && level.bitrate > 0 ? level.bitrate : null,
  }))
}

export function hlsLevelLabel(level) {
  if (!level) return 'Nivel desconocido'
  const resolution = level.height ? `${level.height}p` : `Nivel ${level.index + 1}`
  return level.bitrate ? `${resolution} · ${(level.bitrate / 1000000).toFixed(1)} Mb/s` : resolution
}

export function canSelectHlsLevel(levels, value) {
  const index = Number(value)
  return Number.isInteger(index) && (index === -1 || levels.some(level => level.index === index))
}
