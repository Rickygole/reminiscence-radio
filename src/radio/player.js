export const OFF = { power: 'off' }

export const reduce = (state, action, count) => {
  switch (action.type) {
    case 'powerOff':
      return OFF
    case 'powerOn':
      return state.power === 'off' ? { power: 'warming', startedAt: action.now } : state
    case 'warmed':
      return state.power === 'warming' ? { power: 'tuning', startedAt: action.now } : state
    case 'tuned':
      return state.power === 'tuning' ? { power: 'on', index: 0, phase: 'playing' } : state
    case 'segmentEnded':
      return state.power === 'on' && state.phase === 'playing' ? { power: 'on', index: state.index, phase: 'between' } : state
    case 'segmentFailed':
    case 'betweenDone': {
      if (state.power !== 'on' || state.phase === 'ended') return state
      if (action.type === 'betweenDone' && state.phase !== 'between') return state
      if (action.type === 'segmentFailed' && state.phase !== 'playing') return state
      const next = state.index + 1
      return next >= count ? { power: 'on', phase: 'ended' } : { power: 'on', index: next, phase: 'playing' }
    }
    default:
      return state
  }
}

export const WARM_MS = 3000
export const TUNE_MS = 2200
export const BETWEEN_MS = 1400

export const createPlayer = ({ show, io, onState = () => {}, now = Date.now }) => {
  let state = OFF
  let run = 0
  const count = show.segments.length

  const dispatch = (action) => {
    const next = reduce(state, action, count)
    if (next !== state) {
      state = next
      onState(state)
    }
  }

  const loop = async (token) => {
    const live = () => token === run
    await Promise.all([io.warmUp(show, WARM_MS), io.sleep(WARM_MS)])
    if (!live()) return
    dispatch({ type: 'warmed', now: now() })
    await io.tune(TUNE_MS)
    if (!live()) return
    dispatch({ type: 'tuned' })
    while (live() && state.power === 'on' && state.phase === 'playing') {
      const seg = show.segments[state.index]
      let result
      try {
        result = await io.play(seg, state.index)
      } catch {
        result = 'failed'
      }
      if (!live()) return
      if (result === 'failed') {
        dispatch({ type: 'segmentFailed' })
        continue
      }
      dispatch({ type: 'segmentEnded' })
      await io.sleep(BETWEEN_MS)
      if (!live()) return
      dispatch({ type: 'betweenDone' })
    }
    if (live() && state.power === 'on' && state.phase === 'ended') io.ended()
  }

  return {
    get state() {
      return state
    },
    powerOn() {
      if (state.power !== 'off') return
      run += 1
      dispatch({ type: 'powerOn', now: now() })
      loop(run).catch(() => dispatch({ type: 'powerOff' }))
    },
    powerOff() {
      run += 1
      io.stop()
      dispatch({ type: 'powerOff' })
    }
  }
}

export const chunkCaption = (text, max = 80) => {
  const sentences = String(text).match(/[^.!?]+[.!?]*\s*/g) ?? [String(text)]
  const out = []
  for (const s of sentences) {
    const words = s.trim().split(/\s+/)
    let line = ''
    for (const w of words) {
      if (line && (line + ' ' + w).length > max) {
        out.push(line)
        line = w
      } else line = line ? `${line} ${w}` : w
    }
    if (line) out.push(line)
  }
  return out.filter(Boolean)
}

export const chunkTimes = (chunks, totalMs) => {
  const weight = chunks.map((c) => c.length)
  const sum = weight.reduce((a, b) => a + b, 0) || 1
  return weight.map((w) => (w / sum) * totalMs)
}
