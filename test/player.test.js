import test from 'node:test'
import assert from 'node:assert/strict'
import { reduce, OFF, createPlayer, chunkCaption, chunkTimes } from '../src/radio/player.js'

const show = { segments: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }

const states = [
  OFF,
  { power: 'warming', startedAt: 1 },
  { power: 'tuning', startedAt: 2 },
  { power: 'on', index: 1, phase: 'playing' },
  { power: 'on', index: 1, phase: 'between' },
  { power: 'on', phase: 'ended' }
]

test('power off from every state returns to off', () => {
  for (const s of states) assert.deepEqual(reduce(s, { type: 'powerOff' }, 3), OFF)
})

test('off, warming, tuning, on in order', () => {
  let s = OFF
  s = reduce(s, { type: 'powerOn', now: 5 }, 3)
  assert.deepEqual(s, { power: 'warming', startedAt: 5 })
  s = reduce(s, { type: 'warmed', now: 9 }, 3)
  assert.deepEqual(s, { power: 'tuning', startedAt: 9 })
  s = reduce(s, { type: 'tuned' }, 3)
  assert.deepEqual(s, { power: 'on', index: 0, phase: 'playing' })
})

test('actions that do not apply leave the state alone', () => {
  assert.equal(reduce(OFF, { type: 'tuned' }, 3), OFF)
  assert.equal(reduce(OFF, { type: 'segmentEnded' }, 3), OFF)
  const warming = states[1]
  assert.equal(reduce(warming, { type: 'powerOn', now: 7 }, 3), warming)
})

test('a failed segment advances and the last one ends the show', () => {
  assert.deepEqual(reduce({ power: 'on', index: 0, phase: 'playing' }, { type: 'segmentFailed' }, 3), { power: 'on', index: 1, phase: 'playing' })
  assert.deepEqual(reduce({ power: 'on', index: 2, phase: 'playing' }, { type: 'segmentFailed' }, 3), { power: 'on', phase: 'ended' })
})

test('between advances to the next segment', () => {
  assert.deepEqual(reduce({ power: 'on', index: 0, phase: 'between' }, { type: 'betweenDone' }, 3), { power: 'on', index: 1, phase: 'playing' })
})

const makeIo = (results) => {
  const log = []
  return {
    log,
    sleep: async () => {},
    warmUp: async () => log.push('warm'),
    tune: async () => log.push('tune'),
    play: async (seg) => {
      log.push(`play ${seg.id}`)
      const r = results[seg.id]
      if (r instanceof Error) throw r
      return r ?? 'ended'
    },
    stop: () => log.push('stop'),
    ended: () => log.push('ended')
  }
}

const settle = () => new Promise((r) => setTimeout(r, 20))

test('player runs the whole show and skips a failing segment', async () => {
  const io = makeIo({ b: new Error('decode failed') })
  const seen = []
  const p = createPlayer({ show, io, onState: (s) => seen.push(s.power + (s.phase ? `:${s.phase}` : '')) })
  p.powerOn()
  await settle()
  assert.deepEqual(io.log, ['warm', 'tune', 'play a', 'play b', 'play c', 'ended'])
  assert.deepEqual(p.state, { power: 'on', phase: 'ended' })
  assert.deepEqual(seen.slice(0, 4), ['warming', 'tuning', 'on:playing', 'on:between'])
})

test('power off during playback stops everything and nothing else plays', async () => {
  let release
  const io = makeIo({})
  io.play = (seg) => {
    io.log.push(`play ${seg.id}`)
    return new Promise((r) => {
      release = () => r('ended')
    })
  }
  const p = createPlayer({ show, io })
  p.powerOn()
  await settle()
  assert.equal(p.state.power, 'on')
  p.powerOff()
  release()
  await settle()
  assert.deepEqual(p.state, OFF)
  assert.deepEqual(io.log, ['warm', 'tune', 'play a', 'stop'])
})

test('power off while warming cancels the start', async () => {
  const io = makeIo({})
  let open
  io.sleep = () => new Promise((r) => (open = r))
  const p = createPlayer({ show, io })
  p.powerOn()
  assert.equal(p.state.power, 'warming')
  p.powerOff()
  open()
  await settle()
  assert.deepEqual(p.state, OFF)
  assert.ok(!io.log.includes('tune'))
})

test('captions split into short readable chunks', () => {
  const chunks = chunkCaption('Good morning, Rose. Your grandson Leo sent you something. ' + 'word '.repeat(40))
  assert.ok(chunks.length >= 4)
  assert.ok(chunks.every((c) => c.length <= 80))
  const times = chunkTimes(chunks, 10000)
  assert.ok(Math.abs(times.reduce((a, b) => a + b, 0) - 10000) < 1)
})
