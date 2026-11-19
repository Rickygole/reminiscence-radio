import test from 'node:test'
import assert from 'node:assert/strict'
import { createMeter, speechEnvelope } from '../src/radio/meter.js'

const FRAME = 1000 / 60

const swingsPerSecond = (values, seconds, threshold = 0.1) => {
  let extreme = values[0]
  let direction = 0
  const buckets = new Map()
  for (let i = 1; i < values.length; i++) {
    const v = values[i]
    if (direction >= 0 && v < extreme - threshold) {
      direction = -1
      extreme = v
      buckets.set(Math.floor(i / 60), (buckets.get(Math.floor(i / 60)) ?? 0) + 1)
    } else if (direction <= 0 && v > extreme + threshold) {
      direction = 1
      extreme = v
      buckets.set(Math.floor(i / 60), (buckets.get(Math.floor(i / 60)) ?? 0) + 1)
    } else if ((direction > 0 && v > extreme) || (direction < 0 && v < extreme)) extreme = v
  }
  return Math.max(0, ...buckets.values())
}

const square = (hz, seconds) => {
  const meter = createMeter()
  const glow = []
  for (let i = 0; i < seconds * 60; i++) {
    const t = (i * FRAME) / 1000
    const high = Math.floor(t * hz * 2) % 2 === 0
    glow.push(meter.step(high ? 0.5 : 0, FRAME).glow)
  }
  return glow
}

test('a 10 Hz square wave never swings brightness by more than 10 percent more than 3 times per second', () => {
  assert.ok(swingsPerSecond(square(10, 6), 6) <= 3)
})

test('a 3 Hz and a 1 Hz square wave also stay within three swings per second', () => {
  assert.ok(swingsPerSecond(square(3, 6), 6) <= 3)
  assert.ok(swingsPerSecond(square(1, 8), 8) <= 3)
})

test('the swing counter really sees a flashing signal', () => {
  const raw = Array.from({ length: 360 }, (_, i) => (Math.floor(i / 3) % 2 === 0 ? 1 : 0))
  assert.ok(swingsPerSecond(raw, 6) > 3)
})

test('glow stays between 0.6 and 1 and the needle between -50 and 50 degrees', () => {
  const meter = createMeter()
  for (let i = 0; i < 600; i++) {
    const out = meter.step(i % 120 < 60 ? 0.4 : 0, FRAME)
    assert.ok(out.glow >= 0.6 && out.glow <= 1)
    assert.ok(out.needle >= -50 && out.needle <= 50)
  }
})

test('level rises under steady sound and falls back in silence', () => {
  const meter = createMeter()
  let out
  for (let i = 0; i < 180; i++) out = meter.step(0.3, FRAME)
  assert.ok(out.level > 0.8)
  for (let i = 0; i < 600; i++) out = meter.step(0, FRAME)
  assert.ok(out.level < 0.05)
})

test('speech envelope bumps on a word and decays', () => {
  const env = speechEnvelope()
  const idle = env.rms(16)
  env.word()
  assert.ok(env.rms(16) > idle)
  for (let i = 0; i < 40; i++) env.rms(16)
  assert.ok(Math.abs(env.rms(16) - 0.05) < 0.001)
})
