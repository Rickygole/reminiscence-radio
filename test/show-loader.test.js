import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadShow, applyOverrides, sanitizeReminder, validateShow } from '../src/shared/show-loader.js'

const demo = JSON.parse(readFileSync(new URL('../public/demo/show.json', import.meta.url), 'utf8'))
const baseHref = 'https://radio.test/'

const respond = (map) => async (url) => {
  const entry = map[url]
  if (!entry) return { ok: false, status: 404, json: async () => ({}) }
  return { ok: true, status: 200, json: async () => (typeof entry === 'string' ? JSON.parse(entry) : entry) }
}

const demoMap = { 'https://radio.test/demo/show.json': demo }
const liveUrl = 'https://crew.test/show/latest.json'

const load = (map, extra = {}) => loadShow({ live: true, url: liveUrl, fetchFn: respond({ ...demoMap, ...map }), baseHref, ...extra })

test('valid live show is used and media resolves against the site root', async () => {
  const { source, show } = await load({ [liveUrl]: demo })
  assert.equal(source, 'live')
  assert.equal(show.segments.find((s) => s.kind === 'voice_message').audio.src, 'https://crew.test/media/leo.mp3')
})

test('bad schemaVersion falls back to the demo', async () => {
  const { source } = await load({ [liveUrl]: { ...demo, schemaVersion: 2 } })
  assert.equal(source, 'demo')
})

test('non-JSON falls back to the demo', async () => {
  const fetchFn = async (url) => (url === liveUrl ? { ok: true, status: 200, json: async () => JSON.parse('<html>') } : respond(demoMap)(url))
  const { source } = await loadShow({ live: true, url: liveUrl, fetchFn, baseHref })
  assert.equal(source, 'demo')
})

test('404 falls back to the demo', async () => {
  const { source } = await load({})
  assert.equal(source, 'demo')
})

test('demo is used when live is not requested', async () => {
  const { source, show } = await loadShow({ fetchFn: respond(demoMap), baseHref })
  assert.equal(source, 'demo')
  assert.equal(show.segments.find((s) => s.kind === 'voice_message').audio.src, 'https://radio.test/demo/media/leo.mp3')
})

test('unknown kinds are skipped', () => {
  const doc = { ...demo, segments: [...demo.segments, { id: 'x', kind: 'clone', text: 'hi', audio: { speak: true } }] }
  const show = validateShow(doc, 'https://radio.test/demo/')
  assert.equal(show.segments.length, demo.segments.length)
})

test('segments with unusable audio are skipped', () => {
  const doc = { ...demo, segments: demo.segments.map((s) => (s.kind === 'voice_message' ? { ...s, audio: { src: 'javascript:alert(1)' } } : s)) }
  const show = validateShow(doc, 'https://radio.test/demo/')
  assert.ok(!show.segments.some((s) => s.kind === 'voice_message'))
})

test('a song with speech audio is skipped', () => {
  const doc = { ...demo, segments: demo.segments.map((s) => (s.kind === 'song' ? { ...s, audio: { speak: true } } : s)) }
  assert.ok(!validateShow(doc, 'https://radio.test/demo/').segments.some((s) => s.kind === 'song'))
})

test('overrides merge by reminderId, are trimmed, stripped and capped at 200', () => {
  const show = validateShow(demo, 'https://radio.test/demo/')
  const out = applyOverrides(show, { 'rem-lunch': `  Soup\u0007 is ready  ${'x'.repeat(300)}`, nope: 'ignored' })
  const lunch = out.segments.find((s) => s.reminderId === 'rem-lunch')
  assert.equal(lunch.text.length, 200)
  assert.ok(lunch.text.startsWith('Soup is ready'))
  assert.deepEqual(lunch.audio, { speak: true })
  assert.equal(out.segments.find((s) => s.reminderId === 'rem-pill').text, show.segments.find((s) => s.reminderId === 'rem-pill').text)
})

test('empty override keeps the original text', () => {
  const show = validateShow(demo, 'https://radio.test/demo/')
  const out = applyOverrides(show, { 'rem-lunch': '   \u0007 ' })
  assert.equal(out.segments.find((s) => s.reminderId === 'rem-lunch').text, 'Time for lunch, Rose.')
})

test('sanitizeReminder strips control characters', () => {
  assert.equal(sanitizeReminder('a\u0000b\nc'), 'a b c')
})
