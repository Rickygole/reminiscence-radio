import '../shared/base.css'
import './radio.css'
import { readSettings, applyDocumentFlags, calm, readOverrides } from '../shared/settings.js'
import { loadShow, applyOverrides } from '../shared/show-loader.js'
import { radioMarkup, STATION_X, DIAL_START_X } from './radio-markup.js'
import { createDial } from './dial.js'
import { createPlayer, chunkCaption, chunkTimes } from './player.js'
import { createMeter, speechEnvelope } from './meter.js'
import { createAudioGraph } from './audio-graph.js'
import { renderSong, SAMPLE_RATE } from './song-synth.js'

const settings = readSettings()
applyDocumentFlags(settings)
const calmMode = calm(settings)

const radio = document.getElementById('radio')
radio.innerHTML = radioMarkup()
const rig = document.getElementById('rig')
const hint = document.getElementById('hint')
const live = document.getElementById('live')
const captionEl = document.getElementById('caption')
const captionBelow = document.getElementById('caption-below')
const photoEl = document.getElementById('photo')
const photoImg = document.getElementById('photo-img')
const photoCredit = document.getElementById('photo-credit')
const shot = photoEl.querySelector('.shot')
const knob = document.getElementById('knob')
const pointer = radio.querySelector('.pointer')
const about = document.getElementById('about')

if (!settings.captions) {
  radio.classList.add('nocaptions')
  captionBelow.hidden = true
}

document.getElementById('about-open').addEventListener('click', () => about.showModal())

const params = new URLSearchParams(location.search)
const { show: loaded } = await loadShow({ live: params.get('show') === 'live' })
const show = applyOverrides(loaded, readOverrides())
const listenerName = show.listener.name

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const wordsIn = (text) => String(text).trim().split(/\s+/).length

let graph = null
const ensureGraph = () => {
  if (!graph) graph = createAudioGraph()
  return graph
}

let captionTimers = []
const clearCaptions = () => {
  captionTimers.forEach(clearTimeout)
  captionTimers = []
}

const paintCaption = (html, plain) => {
  captionEl.innerHTML = `<span>${html}</span>`
  captionBelow.textContent = plain
}

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const idleCaption = (text) => {
  clearCaptions()
  paintCaption(escapeHtml(text), text)
}

const runCaptions = (text, totalMs, small) => {
  clearCaptions()
  live.textContent = small ? `${text}. ${small}` : text
  const chunks = chunkCaption(text)
  const times = chunkTimes(chunks, totalMs)
  let at = 0
  chunks.forEach((chunk, i) => {
    const show = () => {
      const extra = small && i === chunks.length - 1 ? `<small>${escapeHtml(small)}</small>` : ''
      paintCaption(`${escapeHtml(chunk)}${extra}`, small && i === chunks.length - 1 ? `${chunk} ${small}` : chunk)
    }
    if (at === 0) show()
    else captionTimers.push(setTimeout(show, at))
    at += times[i]
  })
}

const meter = createMeter()
const envelope = speechEnvelope()
let source = 'none'
let powerOn = false
let meterRaf = 0
let lastFrame = 0

const meterLoop = (now) => {
  const dt = lastFrame ? now - lastFrame : 16
  lastFrame = now
  const rms = source === 'analyser' && graph ? graph.rms() : source === 'speech' ? envelope.rms(dt) : 0
  const out = meter.step(rms, dt)
  radio.style.setProperty('--needle', out.needle.toFixed(2))
  if (!calmMode) radio.style.setProperty('--glow', out.glow.toFixed(3))
  if (powerOn || Math.abs(out.needle + 45) > 0.4) meterRaf = requestAnimationFrame(meterLoop)
  else {
    meterRaf = 0
    lastFrame = 0
  }
}

const startMeter = () => {
  if (!meterRaf) meterRaf = requestAnimationFrame(meterLoop)
}

const songs = new Map()
let worker = null
const pending = new Map()
let nextId = 1

const renderAsync = (spec) =>
  new Promise((resolve) => {
    try {
      worker ??= new Worker(new URL('./song-worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => {
        pending.get(e.data.id)?.(e.data)
        pending.delete(e.data.id)
      }
      worker.onerror = () => {
        worker = null
        for (const [id, done] of pending) {
          done({ samples: renderSong(spec), rate: SAMPLE_RATE })
          pending.delete(id)
        }
      }
      const id = nextId++
      pending.set(id, resolve)
      worker.postMessage({ id, spec })
    } catch {
      resolve({ samples: renderSong(spec), rate: SAMPLE_RATE })
    }
  })

const prepareSong = (seg) => {
  if (!songs.has(seg.id)) songs.set(seg.id, renderAsync(seg.audio.synth))
  return songs.get(seg.id)
}

const pickVoice = () => {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  return voices.find((v) => /samantha|serena|karen|moira|google us english|natural/i.test(v.name)) ?? voices[0] ?? null
}

const speak = (text, ms) =>
  new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return setTimeout(() => resolve('ended'), ms)
    let done = false
    const finish = (result, wait = 0) => {
      if (done) return
      done = true
      clearTimeout(guard)
      setTimeout(() => resolve(result), wait)
    }
    const guard = setTimeout(() => finish('ended'), ms * 1.8 + 4000)
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.9
    u.lang = 'en-US'
    const voice = pickVoice()
    if (voice) u.voice = voice
    u.onboundary = () => envelope.word()
    u.onend = () => finish('ended')
    u.onerror = (e) => finish('ended', e.error === 'interrupted' || e.error === 'canceled' ? 0 : ms)
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  })

const webgl2 = () => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

let photoHandle = null
let photoToken = 0

const hidePhoto = () => {
  photoToken += 1
  photoEl.classList.remove('up')
  photoEl.setAttribute('aria-hidden', 'true')
  rig.classList.remove('has-photo')
  const handle = photoHandle
  photoHandle = null
  if (handle) setTimeout(() => handle.destroy(), 1400)
}

const showPhoto = async (seg) => {
  const token = ++photoToken
  const { photo, from } = seg
  photoImg.src = photo.src
  photoImg.alt = photo.alt
  photoImg.hidden = false
  shot.querySelector('canvas')?.remove()
  photoCredit.textContent = `${from.name}, your ${from.relation}${seg.performedByVolunteer ? ', voice by a volunteer' : ', placeholder'}`
  photoEl.setAttribute('aria-hidden', 'false')
  rig.classList.add('has-photo')
  requestAnimationFrame(() => photoEl.classList.add('up'))
  const fx3d = !calmMode && Boolean(photo.depthSrc) && webgl2()
  if (!fx3d) return
  try {
    const { mountDepthPhoto } = await import('./photo-window.js')
    const canvas = document.createElement('canvas')
    shot.append(canvas)
    const handle = await mountDepthPhoto(canvas, { src: photo.src, depthSrc: photo.depthSrc })
    if (token !== photoToken) return handle.destroy()
    photoImg.hidden = true
    photoHandle = handle
  } catch {
    shot.querySelector('canvas')?.remove()
  }
}

const voiceCaption = (seg) => (seg.performedByVolunteer ? seg.caption : `${seg.from.name}'s recorded message will play here`)

const chime = async (fallbackMs) => {
  const g = ensureGraph()
  g.setBand('voice')
  await sleep(fallbackMs)
}

const playSegment = async (seg) => {
  const g = ensureGraph()
  if (seg.kind !== 'voice_message') hidePhoto()
  if (seg.kind === 'song') {
    const buffer = await prepareSong(seg)
    const seconds = buffer.samples.length / buffer.rate
    runCaptions(seg.title, seconds * 1000, `${seg.era}, music made by our own code`)
    source = 'analyser'
    return g.playBuffer(buffer.samples, buffer.rate, 'music')
  }
  if (seg.kind === 'voice_message') {
    const ms = seg.audio.durationMs ?? 6000
    runCaptions(voiceCaption(seg), ms + 600)
    if (seg.photo) showPhoto(seg)
    source = 'analyser'
    const result = await g.playFile(seg.audio.src, 'voice', ms + 4000)
    if (result === 'failed') await chime(0)
    return result
  }
  const ms = Math.max(2500, (wordsIn(seg.text) / 2.3) * 1000)
  runCaptions(seg.text, ms)
  if (seg.audio.speak) {
    source = 'speech'
    return speak(seg.text, ms)
  }
  source = 'analyser'
  return g.playFile(seg.audio.src, 'voice', ms + 8000)
}

const resetPointer = () => {
  pointer.getAnimations().forEach((a) => a.cancel())
  pointer.style.transform = 'translateX(0px)'
}

const tune = async (ms) => {
  idleCaption('Finding your station')
  const dx = STATION_X - DIAL_START_X - 0.5
  if (calmMode) {
    pointer.style.transform = `translateX(${dx}px)`
    await sleep(500)
    return
  }
  const g = ensureGraph()
  g.staticTo(1)
  pointer.animate(
    [
      { transform: 'translateX(0px)' },
      { transform: `translateX(${dx * 0.55}px)`, offset: 0.35 },
      { transform: `translateX(${dx * 1.05}px)`, offset: 0.72 },
      { transform: `translateX(${dx}px)` }
    ],
    { duration: ms, easing: 'ease-in-out', fill: 'forwards' }
  )
  const t0 = performance.now()
  let faded = false
  const follow = (now) => {
    const p = Math.min(1, (now - t0) / ms)
    g.staticFreq(500 + 2400 * p)
    if (!faded && now - t0 > ms - 400) {
      faded = true
      g.staticTo(0, 0.4)
    }
    if (p < 1 && powerOn) requestAnimationFrame(follow)
  }
  requestAnimationFrame(follow)
  await sleep(ms)
  g.staticTo(0, 0.4)
}

const stopAll = () => {
  clearCaptions()
  graph?.stop()
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  hidePhoto()
  source = 'none'
}

const io = {
  sleep,
  warmUp: async (current) => {
    const g = ensureGraph()
    await g.resume()
    current.segments.filter((s) => s.kind === 'song').forEach(prepareSong)
  },
  tune,
  play: playSegment,
  stop: stopAll,
  ended: () => {
    source = 'none'
    idleCaption(`That is all for today, ${listenerName}.`)
  }
}

const player = createPlayer({
  show,
  io,
  onState: (state) => {
    radio.dataset.power = state.power
    if (state.power === 'warming') {
      radio.classList.add('warm', 'lit')
      hint.classList.add('gone')
      idleCaption('Warming up')
    }
    if (state.power === 'off') {
      radio.classList.remove('warm', 'lit')
      hint.classList.remove('gone')
      live.textContent = ''
      resetPointer()
      idleCaption('Turn the big knob to listen')
    }
  }
})

const dial = createDial({
  el: knob,
  calm: () => calmMode,
  onOn: () => {
    const g = ensureGraph()
    g.resume()
    g.click()
    powerOn = true
    knob.setAttribute('aria-checked', 'true')
    startMeter()
    player.powerOn()
  },
  onOff: () => {
    powerOn = false
    knob.setAttribute('aria-checked', 'false')
    player.powerOff()
    startMeter()
    graph?.click()
  }
})

knob.addEventListener('pointerdown', ensureGraph, { once: true })
knob.addEventListener('keydown', ensureGraph, { once: true })

idleCaption('Turn the big knob to listen')
window.addEventListener('pagehide', () => {
  if (dial.powered) dial.reset()
})
