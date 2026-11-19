import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const read = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const playlist = ajv.compile(read('../contract/show-playlist.schema.json'))
const events = ajv.compile(read('../contract/crew-events.schema.json'))

test('bundled demo show matches the playlist contract', () => {
  assert.equal(playlist(read('../public/demo/show.json')), true, JSON.stringify(playlist.errors))
})

test('bundled demo events match the event contract', () => {
  assert.equal(events(read('../public/demo/events.json')), true, JSON.stringify(events.errors))
})

test('every media file the demo show points at exists', () => {
  const show = read('../public/demo/show.json')
  const files = show.segments.flatMap((s) => [s.audio?.src, s.photo?.src, s.photo?.depthSrc]).filter(Boolean)
  assert.ok(files.length >= 3)
  for (const f of files) assert.ok(existsSync(new URL(`../public/demo/${f}`, import.meta.url)), f)
})

test('the demo keeps a blocked family note out of the show', () => {
  const show = read('../public/demo/show.json')
  assert.ok(show.safety.blocked.length >= 1)
  assert.equal(show.listener.fictional, true)
})
