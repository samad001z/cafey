function toCanonicalOrigin(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''

  if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, '')
  if (value.startsWith('//')) return `${window.location.protocol}${value}`.replace(/\/$/, '')
  if (value.startsWith(':')) return `${window.location.protocol}//localhost${value}`.replace(/\/$/, '')
  if (value.startsWith('/')) return value.replace(/\/$/, '')
  if (/^[a-z0-9.-]+:\d+$/i.test(value)) return `${window.location.protocol}//${value}`.replace(/\/$/, '')

  return value.replace(/\/$/, '')
}

function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin, window.location.origin)
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function resolveApiBase(rawBase) {
  const configured = toCanonicalOrigin(rawBase)
  if (!configured) return import.meta.env.DEV ? 'http://localhost:8787' : ''

  // In production, never call a localhost API from user browsers.
  if (!import.meta.env.DEV && isLocalhostOrigin(configured)) return ''

  return configured
}

export function buildApiUrl(path, rawBase) {
  return `${resolveApiBase(rawBase)}${String(path || '')}`
}
