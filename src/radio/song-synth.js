export const SAMPLE_RATE = 22050
const TARGET_PEAK = 0.5
const TAU = Math.PI * 2

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const PROGRESSION = [
  { root: 0, tones: [0, 4, 7] },
  { root: 9, tones: [0, 3, 7] },
  { root: 5, tones: [0, 4, 7] },
  { root: 7, tones: [0, 4, 7] }
]

const mulberry = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const tonicOf = (key) => {
  const base = PITCH[key[0]] + (key[1] === '#' ? 1 : key[1] === 'b' ? -1 : 0)
  return ((base % 12) + 12) % 12
}

const RECIPES = {
  doowop_ballad: {
    beatsPerBar: 4,
    swing: 0,
    rhythms: [
      [[0, 1.5], [1.5, 0.5], [2, 2]],
      [[0, 2], [2, 1], [3, 1]],
      [[0, 1], [1, 1], [2, 2]],
      [[1, 1], [2, 1], [3, 1]]
    ]
  },
  lounge_swing: {
    beatsPerBar: 4,
    swing: 1,
    rhythms: [
      [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]],
      [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1], [3, 1]],
      [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
      [[0.5, 0.5], [1, 1], [2, 0.5], [2.5, 1.5]]
    ]
  },
  country_waltz: {
    beatsPerBar: 3,
    swing: 0,
    rhythms: [
      [[0, 2], [2, 1]],
      [[0, 1], [1, 1], [2, 1]],
      [[0, 1], [1, 2]],
      [[0, 1.5], [1.5, 0.5], [2, 1]]
    ]
  }
}

const note = (buf, startSec, durSec, rate, voice, gain) => {
  const start = Math.floor(startSec * rate)
  const len = Math.floor(durSec * rate)
  for (let i = 0; i < len && start + i < buf.length; i++) {
    if (start + i >= 0) buf[start + i] += voice(i / rate, durSec) * gain
  }
}

const organ = (freq) => (t, dur) => {
  const env = Math.min(1, t / 0.09) * Math.min(1, Math.max(0, (dur - t) / 0.25))
  const f = freq * (1 + 0.003 * Math.sin(TAU * 5.3 * t))
  return env * (Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * 2 * f * t) + 0.2 * Math.sin(TAU * 3 * f * t) + 0.08 * Math.sin(TAU * 4 * f * t))
}

const epiano = (freq) => (t) => {
  const index = 0.9 * Math.exp(-t * 7) + 0.12
  const env = Math.min(1, t / 0.006) * Math.exp(-t * 3.4)
  return env * Math.sin(TAU * freq * t + index * Math.sin(TAU * freq * t)) + 0.05 * env * Math.sin(TAU * freq * 4 * t) * Math.exp(-t * 14)
}

const bass = (freq) => (t) => {
  const env = Math.min(1, t / 0.008) * Math.exp(-t * 3.2)
  return env * (Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * 2 * freq * t) * Math.exp(-t * 5) + 0.12 * Math.sin(TAU * 3 * freq * t) * Math.exp(-t * 9))
}

const vibes = (freq) => (t) => {
  const env = Math.min(1, t / 0.004) * Math.exp(-t * 2.4)
  const trem = 1 + 0.12 * Math.sin(TAU * 4.2 * t)
  return env * trem * (Math.sin(TAU * freq * t) + 0.12 * Math.sin(TAU * 4 * freq * t) * Math.exp(-t * 7))
}

const brush = (rng) => {
  let lp = 0
  return (t, dur) => {
    lp += (rng() * 2 - 1 - lp) * 0.28
    return lp * Math.min(1, t / 0.012) * Math.exp(-t * (9 / dur))
  }
}

const onePole = (buf, cutoff, rate) => {
  const a = 1 - Math.exp((-TAU * cutoff) / rate)
  let y = 0
  for (let i = 0; i < buf.length; i++) {
    y += (buf[i] - y) * a
    buf[i] = y
  }
}

const echoes = (buf, rate) => {
  const out = new Float32Array(buf.length)
  for (const [ms, fb] of [[29.7, 0.42], [37.1, 0.4], [41.1, 0.38], [43.7, 0.36]]) {
    const d = Math.round((ms / 1000) * rate)
    const line = new Float32Array(buf.length)
    for (let i = 0; i < buf.length; i++) {
      line[i] = buf[i] + (i >= d ? line[i - d] * fb : 0)
      out[i] += line[i] * 0.07
    }
  }
  for (let i = 0; i < buf.length; i++) buf[i] += out[i] * 1.2
}

const melody = (recipe, seed, midC, bars, tonic) => {
  const rng = mulberry(seed * 7919 + 13)
  const phrases = {}
  const place = (name) => {
    const r = mulberry(seed * 104729 + name.charCodeAt(0))
    return Array.from({ length: 4 }, () => ({ rhythm: Math.floor(r() * recipe.rhythms.length), steps: Array.from({ length: 6 }, () => Math.floor(r() * 5) - 2), rests: Array.from({ length: 6 }, () => r() < 0.12) }))
  }
  phrases.A = place('A')
  phrases.B = place('B')
  const order = ['A', 'A', 'B', 'A']
  const notes = []
  let degree = 4
  for (let bar = 0; bar < bars; bar++) {
    const chord = PROGRESSION[bar % 4]
    const phrase = phrases[order[Math.floor(bar / 4) % 4]][bar % 4]
    const classes = chord.tones.map((t) => (chord.root + t) % 12)
    recipe.rhythms[phrase.rhythm].forEach(([pos, len], k) => {
      degree = Math.max(0, Math.min(9, degree + phrase.steps[k]))
      if (k === 0) {
        let best = degree
        for (let d = 0; d <= 9; d++) {
          const semi = MAJOR[d % 7] + 12 * Math.floor(d / 7)
          if (classes.includes(semi % 12) && Math.abs(d - degree) < Math.abs(best - degree)) best = d
          if (classes.includes(semi % 12) && Math.abs(d - degree) === Math.abs(best - degree) && rng() < 0.5) best = d
        }
        degree = best
      }
      if (phrase.rests[k] && k > 0) return
      const semi = MAJOR[degree % 7] + 12 * Math.floor(degree / 7)
      notes.push({ bar, pos, len, freq: midC * 2 * 2 ** (semi / 12) })
    })
  }
  return notes
}

export const renderSong = ({ recipe: name, seed, bpm, key, seconds }, rate = SAMPLE_RATE) => {
  const recipe = RECIPES[name]
  if (!recipe) throw new Error(`Unknown recipe ${name}`)
  const total = Math.round(seconds * rate)
  const buf = new Float32Array(total)
  const rng = mulberry(seed * 31 + 7)
  const tonic = tonicOf(key)
  const midC = 261.626 * 2 ** ((tonic > 6 ? tonic - 12 : tonic) / 12)
  const beat = 60 / bpm
  const bar = beat * recipe.beatsPerBar
  const bars = Math.ceil(seconds / bar)
  const at = (b, pos) => b * bar + (recipe.swing && pos % 1 === 0.5 ? pos - 0.5 + 2 / 3 : pos) * beat
  const freqOf = (semi, octave) => midC * 2 ** ((semi + 12 * octave) / 12)

  for (let b = 0; b < bars; b++) {
    const chord = PROGRESSION[b % 4]
    const root = chord.root
    const voicing = chord.tones.map((t) => freqOf(root + t, 0))
    const bassNote = freqOf(root, -2)
    const fifth = freqOf(root + 7, -2)
    const third = freqOf(root + chord.tones[1], -2)

    for (const f of voicing) note(buf, at(b, 0), bar * 1.02, rate, organ(f), 0.05)

    if (name === 'doowop_ballad') {
      for (let i = 0; i < 12; i++) {
        const tone = voicing[i % 3] * (i % 6 >= 3 ? 1 : 1)
        note(buf, b * bar + (i / 3) * beat, beat * 1.4, rate, epiano(tone * 2), 0.085 * (i % 3 === 0 ? 1.15 : 1))
      }
      note(buf, at(b, 0), beat * 1.9, rate, bass(bassNote), 0.27)
      note(buf, at(b, 2), beat * 1.9, rate, bass(fifth), 0.22)
      for (const p of [1, 3]) note(buf, at(b, p), beat * 0.5, rate, brush(rng), 0.05)
    } else if (name === 'lounge_swing') {
      const walk = [bassNote, third, fifth, freqOf(root + 9, -2)]
      for (let i = 0; i < 4; i++) note(buf, at(b, i), beat * 0.95, rate, bass(walk[i]), 0.24)
      for (const p of [1, 3]) note(buf, at(b, p), beat * 1.1, rate, epiano(voicing[(p + b) % 3] * 2), 0.1)
      for (let i = 0; i < 4; i++) {
        note(buf, at(b, i), beat * 0.4, rate, brush(rng), 0.045)
        note(buf, at(b, i + 0.5), beat * 0.25, rate, brush(rng), 0.025)
      }
    } else {
      note(buf, at(b, 0), beat * 1.8, rate, bass(bassNote), 0.27)
      for (const p of [1, 2]) {
        voicing.forEach((f, i) => note(buf, at(b, p) + i * 0.012, beat * 0.9, rate, epiano(f * 2), 0.07))
        note(buf, at(b, p), beat * 0.3, rate, brush(rng), 0.04)
      }
    }
  }

  const lead = melody(recipe, seed, midC, bars, tonic)
  for (const n of lead) note(buf, at(n.bar, n.pos), Math.min(n.len * beat * 1.5, 2.6), rate, vibes(n.freq), name === 'lounge_swing' ? 0.17 : 0.15)

  echoes(buf, rate)
  onePole(buf, 4200, rate)

  const fadeIn = Math.floor(rate * 0.6)
  const fadeOut = Math.floor(rate * 2.5)
  for (let i = 0; i < fadeIn && i < total; i++) buf[i] *= i / fadeIn
  for (let i = 0; i < fadeOut && i < total; i++) buf[total - 1 - i] *= i / fadeOut

  let peak = 0
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(buf[i]))
  const scale = peak > 0 ? TARGET_PEAK / peak : 1
  for (let i = 0; i < total; i++) buf[i] *= scale
  return buf
}
