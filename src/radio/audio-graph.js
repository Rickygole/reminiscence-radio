const STATIC_CAP = 0.063
const FADE_S = 0.4

const softCurve = (k = 1.4) => {
  const n = 1024
  const curve = new Float32Array(n)
  const norm = Math.tanh(k)
  for (let i = 0; i < n; i++) curve[i] = Math.tanh(k * ((i / (n - 1)) * 2 - 1)) / norm
  return curve
}

const pinkNoise = (ctx, seconds) => {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buffer
}

export const createAudioGraph = () => {
  const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext
  const ctx = new Ctx()
  const input = ctx.createGain()
  const high = ctx.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = 120
  const low = ctx.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 5000
  const shaper = ctx.createWaveShaper()
  shaper.curve = softCurve()
  shaper.oversample = '2x'
  const master = ctx.createGain()
  master.gain.value = 0.9
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  input.connect(high).connect(low).connect(shaper).connect(master).connect(analyser).connect(ctx.destination)

  const noise = ctx.createBufferSource()
  noise.buffer = pinkNoise(ctx, 3)
  noise.loop = true
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 900
  band.Q.value = 1.2
  const staticGain = ctx.createGain()
  staticGain.gain.value = 0
  noise.connect(band).connect(staticGain).connect(ctx.destination)
  noise.start()

  const samples = new Float32Array(analyser.fftSize)
  const element = new Audio()
  element.crossOrigin = 'anonymous'
  element.preload = 'auto'
  ctx.createMediaElementSource(element).connect(input)

  let current = null
  let settle = null
  let playToken = 0
  let activeTimer = 0
  let unlocked = false

  const setBand = (kind) => low.frequency.setTargetAtTime(kind === 'music' ? 3800 : 5000, ctx.currentTime, 0.05)

  return {
    ctx,
    element,
    resume: () => ctx.resume(),
    unlock() {
      if (unlocked) return
      unlocked = true
      const bytes = new Uint8Array(44 + 1600)
      const view = new DataView(bytes.buffer)
      const text = (at, s) => [...s].forEach((c, i) => bytes.set([c.charCodeAt(0)], at + i))
      text(0, 'RIFF')
      view.setUint32(4, 36 + 1600, true)
      text(8, 'WAVEfmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, 8000, true)
      view.setUint32(28, 16000, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      text(36, 'data')
      view.setUint32(40, 1600, true)
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
      element.src = url
      element.play().then(
        () => {
          if (element.src === url) element.pause()
        },
        () => {}
      ).finally(() => URL.revokeObjectURL(url))
    },
    setBand,
    rms() {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
      return Math.sqrt(sum / samples.length)
    },
    staticTo(level, seconds = FADE_S) {
      staticGain.gain.cancelScheduledValues(ctx.currentTime)
      staticGain.gain.setTargetAtTime(Math.min(STATIC_CAP, level * STATIC_CAP), ctx.currentTime, seconds / 3)
    },
    staticFreq(hz) {
      band.frequency.setTargetAtTime(hz, ctx.currentTime, 0.05)
    },
    click() {
      const length = Math.floor(ctx.sampleRate * 0.05)
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        const t = i / ctx.sampleRate
        data[i] = (Math.sin(2 * Math.PI * 95 * t) * 0.5 + (Math.random() * 2 - 1) * 0.25) * Math.exp(-t * 90)
      }
      const src = ctx.createBufferSource()
      const gain = ctx.createGain()
      gain.gain.value = 0.35
      src.buffer = buffer
      src.connect(gain).connect(input)
      src.start()
    },
    playBuffer(samplesArray, rate, kind) {
      setBand(kind)
      const buffer = ctx.createBuffer(1, samplesArray.length, rate)
      buffer.copyToChannel(samplesArray, 0)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(input)
      current = src
      return new Promise((resolve) => {
        src.onended = () => {
          if (current === src) current = null
          resolve('ended')
        }
        src.start()
      })
    },
    playFile(url, kind, timeoutMs) {
      settle?.('ended')
      setBand(kind)
      const token = ++playToken
      element.src = url
      return new Promise((resolve) => {
        let done = false
        const arm = (ms) => {
          clearTimeout(activeTimer)
          activeTimer = setTimeout(() => finish('ended'), ms)
        }
        const finish = (result) => {
          if (done) return
          done = true
          if (token === playToken) {
            clearTimeout(activeTimer)
            element.onended = null
            element.onerror = null
            element.onloadedmetadata = null
            settle = null
          }
          resolve(result)
        }
        settle = finish
        arm(timeoutMs ?? 60000)
        if (timeoutMs === undefined) {
          element.onloadedmetadata = () => {
            if (token === playToken && Number.isFinite(element.duration)) arm(element.duration * 1000 + 5000)
          }
        }
        element.onended = () => finish('ended')
        element.onerror = () => finish('failed')
        element.play().catch(() => finish('failed'))
      })
    },
    stop() {
      clearTimeout(activeTimer)
      settle?.('ended')
      try {
        current?.stop()
      } catch {
        current = null
      }
      element.pause()
      element.removeAttribute('src')
      staticGain.gain.cancelScheduledValues(ctx.currentTime)
      staticGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
    }
  }
}
