export const OFF_DETENT = 12
export const ON_THRESHOLD = 30
export const MAX_ANGLE = 270
export const FRICTION = 0.92
export const ON_ANGLE = 120

export const angleFromPoint = (cx, cy, x, y) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI

export const shortestDelta = (from, to) => {
  let d = to - from
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

export const stepInertia = (angle, velocity) => {
  const next = Math.min(MAX_ANGLE, Math.max(0, angle + velocity))
  const hit = next === 0 || next === MAX_ANGLE
  return { angle: next, velocity: hit ? 0 : velocity * FRICTION }
}

export const createDial = ({ el, calm, onOn, onOff }) => {
  let angle = 0
  let powered = false
  let drag = null
  let frame = 0
  let tween = 0

  const paint = () => {
    el.closest('.radio')?.style.setProperty('--knob', String(angle - 135))
  }

  const settle = () => {
    if (angle <= OFF_DETENT) {
      if (powered) {
        powered = false
        onOff()
      }
      glide(0)
    } else if (angle > ON_THRESHOLD && !powered) {
      powered = true
      onOn()
    }
  }

  const glide = (target) => {
    cancelAnimationFrame(tween)
    if (calm() || Math.abs(target - angle) < 0.5) {
      angle = target
      paint()
      return
    }
    const from = angle
    const t0 = performance.now()
    const run = (now) => {
      const p = Math.min(1, (now - t0) / 700)
      const e = 1 - (1 - p) ** 3
      angle = from + (target - from) * e
      paint()
      if (p < 1) tween = requestAnimationFrame(run)
    }
    tween = requestAnimationFrame(run)
  }

  const move = (next) => {
    angle = Math.min(MAX_ANGLE, Math.max(0, next))
    paint()
    if (angle > ON_THRESHOLD && !powered) {
      powered = true
      onOn()
    }
  }

  const toggle = () => {
    if (powered) {
      powered = false
      glide(0)
      onOff()
    } else {
      powered = true
      glide(ON_ANGLE)
      onOn()
    }
  }

  const center = () => {
    const r = el.getBoundingClientRect()
    return [r.left + r.width / 2, r.top + r.height / 2]
  }

  el.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(frame)
    cancelAnimationFrame(tween)
    const [cx, cy] = center()
    drag = { last: angleFromPoint(cx, cy, e.clientX, e.clientY), v: 0, moved: 0, t: performance.now() }
    el.setPointerCapture(e.pointerId)
  })

  el.addEventListener('pointermove', (e) => {
    if (!drag) return
    const [cx, cy] = center()
    const now = performance.now()
    const a = angleFromPoint(cx, cy, e.clientX, e.clientY)
    const d = shortestDelta(drag.last, a)
    drag.last = a
    drag.moved += Math.abs(d)
    drag.v = (d / Math.max(1, now - drag.t)) * 16
    drag.t = now
    move(angle + d)
  })

  const release = () => {
    if (!drag) return
    const { v, moved } = drag
    drag = null
    if (moved < 4) {
      toggle()
      return
    }
    if (calm() || Math.abs(v) < 0.2) {
      settle()
      return
    }
    let velocity = v
    const run = () => {
      const s = stepInertia(angle, velocity)
      angle = s.angle
      velocity = s.velocity
      paint()
      if (angle > ON_THRESHOLD && !powered) {
        powered = true
        onOn()
      }
      if (Math.abs(velocity) > 0.05) frame = requestAnimationFrame(run)
      else settle()
    }
    frame = requestAnimationFrame(run)
  }

  el.addEventListener('pointerup', release)
  el.addEventListener('pointercancel', release)

  el.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      toggle()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(angle + 15)
      glide(angle)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      move(angle - 15)
      settle()
    }
  })

  paint()
  return {
    get powered() {
      return powered
    },
    reset() {
      powered = false
      glide(0)
    }
  }
}
