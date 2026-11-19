const ATTACK_MS = 150
const RELEASE_MS = 600
const LOWPASS_HZ = 1.5
const GAIN = 3.5
const SPRING = 55
const DAMPING = 11
const MAX_STEP_MS = 100

const smooth = (current, target, dtMs, tauMs) => current + (target - current) * (1 - Math.exp(-dtMs / tauMs))

export const createMeter = () => {
  let level = 0
  let low = 0
  let angle = -45
  let velocity = 0
  return {
    step(rms, dtMs) {
      const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS)
      const x = Math.min(1, Math.max(0, rms * GAIN))
      level = smooth(level, x, dt, x > level ? ATTACK_MS : RELEASE_MS)
      low = smooth(low, level, dt, 1000 / (2 * Math.PI * LOWPASS_HZ))
      const target = -45 + 90 * low
      const s = dt / 1000
      velocity += (SPRING * (target - angle) - DAMPING * velocity) * s
      angle = Math.min(50, Math.max(-50, angle + velocity * s))
      return { level: low, glow: 0.6 + 0.4 * low, needle: angle }
    },
    reset() {
      level = 0
      low = 0
      angle = -45
      velocity = 0
    }
  }
}

export const speechEnvelope = () => {
  let bump = 0
  return {
    word() {
      bump = 1
    },
    rms(dtMs) {
      bump = Math.max(0, bump - dtMs / 420)
      return 0.05 + 0.1 * bump
    }
  }
}
