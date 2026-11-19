const KEY = 'rr-settings'
const REMINDERS_KEY = 'rr-reminders'

const parse = (raw) => {
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

const env = (deps = {}) => ({
  storage: deps.storage ?? globalThis.localStorage,
  search: deps.search ?? globalThis.location?.search ?? '',
  matchMedia: deps.matchMedia ?? globalThis.matchMedia?.bind(globalThis)
})

export const readSettings = (deps) => {
  const { storage, search, matchMedia } = env(deps)
  const saved = parse(storage?.getItem(KEY) ?? '{}')
  const simple = new URLSearchParams(search).get('simple') === '1'
  return {
    simpleMode: simple || saved.simpleMode === true,
    captions: saved.captions !== false,
    reducedMotion: Boolean(matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  }
}

export const saveSettings = (patch, deps) => {
  const { storage } = env(deps)
  const saved = parse(storage?.getItem(KEY) ?? '{}')
  const next = { simpleMode: saved.simpleMode === true, captions: saved.captions !== false }
  if ('simpleMode' in patch) next.simpleMode = patch.simpleMode === true
  if ('captions' in patch) next.captions = patch.captions !== false
  storage?.setItem(KEY, JSON.stringify(next))
  return next
}

export const calm = (settings) => settings.simpleMode || settings.reducedMotion

export const applyDocumentFlags = (settings, root = document.documentElement) => {
  root.dataset.simple = String(settings.simpleMode)
  root.dataset.reduced = String(settings.reducedMotion)
  root.dataset.calm = String(calm(settings))
}

export const readOverrides = (deps) => {
  const { storage } = env(deps)
  return parse(storage?.getItem(REMINDERS_KEY) ?? '{}')
}

export const saveOverrides = (overrides, deps) => env(deps).storage?.setItem(REMINDERS_KEY, JSON.stringify(overrides))
