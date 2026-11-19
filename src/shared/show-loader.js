export const KINDS = new Set(['host', 'story', 'voice_message', 'song', 'reminder'])
export const DEMO_URL = './demo/show.json'
export const LIVE_URL = 'https://rickygole.github.io/reminiscence-radio-crew/show/latest.json'
export const LIVE_EVENTS_URL = 'https://rickygole.github.io/reminiscence-radio-crew/events/latest.json'
export const MAX_REMINDER = 200

const CONTROL = /[\u0000-\u001f\u007f]/g

export const sanitizeReminder = (text) => String(text ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_REMINDER)

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStr = (v) => typeof v === 'string' && v.length > 0

const resolveSrc = (src, base) => {
  if (!isStr(src)) return null
  try {
    const url = new URL(src, base)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

const cleanAudio = (audio, base) => {
  if (!isObj(audio)) return null
  if (audio.speak === true) return { speak: true }
  if (isObj(audio.synth)) {
    const s = audio.synth
    const ok = ['doowop_ballad', 'lounge_swing', 'country_waltz'].includes(s.recipe) && Number.isFinite(s.seed) && Number.isFinite(s.bpm) && isStr(s.key) && Number.isFinite(s.seconds)
    return ok ? { synth: { recipe: s.recipe, seed: s.seed, bpm: s.bpm, key: s.key, seconds: s.seconds } } : null
  }
  const src = resolveSrc(audio.src, base)
  return src ? { src, ...(Number.isFinite(audio.durationMs) ? { durationMs: audio.durationMs } : {}) } : null
}

const cleanSegment = (seg, base) => {
  if (!isObj(seg) || !KINDS.has(seg.kind) || !isStr(seg.id)) return null
  const audio = cleanAudio(seg.audio, base)
  if (!audio) return null
  const out = { ...seg, audio }
  if (seg.kind === 'song' && audio.speak) return null
  if (seg.kind === 'voice_message') {
    if (audio.speak || audio.synth || !isStr(seg.caption)) return null
    if (isObj(seg.photo)) {
      const src = resolveSrc(seg.photo.src, base)
      if (src && isStr(seg.photo.alt)) {
        const depthSrc = resolveSrc(seg.photo.depthSrc, base)
        out.photo = { src, alt: seg.photo.alt, ...(depthSrc ? { depthSrc } : {}) }
      } else delete out.photo
    }
  } else if (seg.kind === 'song') {
    if (!isStr(seg.title)) return null
  } else {
    if (audio.synth || !isStr(seg.text)) return null
    if (seg.kind === 'reminder') out.text = sanitizeReminder(seg.text)
    if (seg.kind === 'reminder' && !out.text) return null
  }
  return out
}

export const validateShow = (doc, base) => {
  if (!isObj(doc) || doc.schemaVersion !== 1 || !Array.isArray(doc.segments) || !isObj(doc.listener)) return null
  const segments = doc.segments.map((s) => cleanSegment(s, base)).filter(Boolean)
  if (!segments.length) return null
  return { ...doc, segments, safety: isObj(doc.safety) ? doc.safety : { rulesVersion: '1', llmReview: false, blocked: [], fixed: [] } }
}

export const applyOverrides = (show, overrides = {}) => ({
  ...show,
  segments: show.segments.map((seg) => {
    if (seg.kind !== 'reminder' || typeof overrides[seg.reminderId] !== 'string') return seg
    const text = sanitizeReminder(overrides[seg.reminderId])
    return text ? { ...seg, text, audio: { speak: true } } : seg
  })
})

const absolute = (url, baseHref) => new URL(url, baseHref).href
const dirOf = (href) => new URL('./', href).href

const attempt = async (url, fetchFn, baseHref, mediaBase) => {
  try {
    const target = absolute(url, baseHref)
    const res = await fetchFn(target)
    if (!res.ok) return null
    const doc = await res.json()
    return validateShow(doc, mediaBase ?? dirOf(target))
  } catch {
    return null
  }
}

export const loadShow = async ({ live = false, url, mediaBase, demoUrl = DEMO_URL, fetchFn = globalThis.fetch?.bind(globalThis), baseHref = globalThis.location?.href ?? 'http://localhost/' } = {}) => {
  if (live) {
    const target = absolute(url ?? LIVE_URL, baseHref)
    const show = await attempt(target, fetchFn, baseHref, mediaBase ?? new URL('../', target).href)
    if (show) return { show, source: 'live' }
  }
  const show = await attempt(demoUrl, fetchFn, baseHref)
  if (!show) throw new Error('The bundled demo show could not be loaded')
  return { show, source: 'demo' }
}

export const loadEvents = async ({ live = false, url, demoUrl = './demo/events.json', fetchFn = globalThis.fetch?.bind(globalThis), baseHref = globalThis.location?.href ?? 'http://localhost/' } = {}) => {
  const target = absolute(live ? (url ?? LIVE_EVENTS_URL) : demoUrl, baseHref)
  const res = await fetchFn(target)
  if (!res.ok) throw new Error(`Events not available (${res.status})`)
  const doc = await res.json()
  if (!isObj(doc) || doc.schemaVersion !== 1 || !Array.isArray(doc.events) || !Array.isArray(doc.agents) || !Array.isArray(doc.items)) throw new Error('Events file has an unknown format')
  return doc
}
