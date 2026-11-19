import test from 'node:test'
import assert from 'node:assert/strict'
import { renderSong, SAMPLE_RATE } from '../src/radio/song-synth.js'

const recipes = ['doowop_ballad', 'lounge_swing', 'country_waltz']
const spec = (recipe, seed = 62) => ({ recipe, seed, bpm: recipe === 'country_waltz' ? 84 : 72, key: 'Bb', seconds: 20 })

const stats = (a) => {
  let peak = 0
  let sum = 0
  for (const v of a) {
    peak = Math.max(peak, Math.abs(v))
    sum += v * v
  }
  return { peak, rms: Math.sqrt(sum / a.length) }
}

for (const recipe of recipes) {
  test(`${recipe}: same seed renders identical samples`, () => {
    const a = renderSong(spec(recipe))
    const b = renderSong(spec(recipe))
    assert.equal(a.length, b.length)
    assert.ok(a.every((v, i) => v === b[i]))
  })

  test(`${recipe}: different seeds differ`, () => {
    const a = renderSong(spec(recipe, 1))
    const b = renderSong(spec(recipe, 2))
    assert.ok(a.some((v, i) => v !== b[i]))
  })

  test(`${recipe}: length is seconds times sample rate, peak is below 0.99 and level is gentle`, () => {
    const a = renderSong(spec(recipe))
    assert.equal(a.length, 20 * SAMPLE_RATE)
    const { peak, rms } = stats(a)
    assert.ok(peak < 0.99, `peak ${peak}`)
    assert.ok(rms > 0.03 && rms < 0.2, `rms ${rms}`)
    assert.ok(a.every(Number.isFinite))
  })
}

test('unknown recipe throws', () => {
  assert.throws(() => renderSong({ recipe: 'nope', seed: 1, bpm: 70, key: 'C', seconds: 20 }))
})

test('every key letter renders', () => {
  for (const key of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb', 'F#']) {
    assert.ok(renderSong({ recipe: 'doowop_ballad', seed: 3, bpm: 66, key, seconds: 20 }, 8000).length > 0)
  }
})
