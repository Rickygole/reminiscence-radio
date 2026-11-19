import '../shared/base.css'
import './control.css'
import { readSettings, applyDocumentFlags, calm } from '../shared/settings.js'
import { loadEvents } from '../shared/show-loader.js'

const settings = readSettings()
applyDocumentFlags(settings)
const calmMode = calm(settings)

const NS = 'http://www.w3.org/2000/svg'
const CENTER = { x: 500, y: 440 }
const RADIUS = 380
const SHORT = { archivist: 'Archivist', music_director: 'Music Director', scriptwriter: 'Scriptwriter', care_checker: 'Care Checker', producer: 'Producer' }

const ICONS = {
  archivist: '<rect x="-17" y="-12" width="34" height="24" rx="3" fill="none" stroke="#F3E9D2" stroke-width="3"/><path d="M-17 -10L0 3L17 -10" fill="none" stroke="#F3E9D2" stroke-width="3"/>',
  music_director: '<circle cx="-6" cy="10" r="7" fill="#F3E9D2"/><path d="M1 10V-14Q14 -10 12 2" fill="none" stroke="#F3E9D2" stroke-width="3.5" stroke-linecap="round"/>',
  scriptwriter: '<path d="M-14 14L-10 4L10 -16L16 -10L-4 10Z" fill="none" stroke="#F3E9D2" stroke-width="3" stroke-linejoin="round"/><path d="M-14 14L-10 4L-4 10Z" fill="#F3E9D2"/>',
  care_checker: '<path d="M0 -17L15 -11V3Q15 13 0 18Q-15 13 -15 3V-11Z" fill="none" stroke="#F3E9D2" stroke-width="3"/><path d="M-7 1L-2 6L8 -6" fill="none" stroke="#E9C46A" stroke-width="3.5" stroke-linecap="round"/>',
  producer: '<circle r="16" fill="none" stroke="#F3E9D2" stroke-width="3"/><circle r="4" fill="#E9C46A"/><path d="M0 -12V-6M12 0H6M0 12V6M-12 0H-6" stroke="#F3E9D2" stroke-width="2.4"/>'
}

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  parent?.append(node)
  return node
}

const floor = document.getElementById('floor')
const itemsList = document.getElementById('items')
const logEl = document.getElementById('log')
const statusEl = document.getElementById('status')
const noteEl = document.getElementById('tab-note')
const replayBtn = document.getElementById('replay')
const tabDemo = document.getElementById('tab-demo')
const tabLive = document.getElementById('tab-live')

let run = 0
let doc = null

const place = (index, count) => {
  const a = Math.PI - (index * Math.PI) / (count - 1)
  return { x: CENTER.x + RADIUS * Math.cos(a), y: CENTER.y - RADIUS * Math.sin(a) }
}

const arcPath = (p, q, pull = 0.35) => {
  const mx = (p.x + q.x) / 2
  const my = (p.y + q.y) / 2
  const cx = mx + (CENTER.x - mx) * pull
  const cy = my + (CENTER.y - 120 - my) * pull
  return { d: `M${p.x} ${p.y}Q${cx} ${cy} ${q.x} ${q.y}`, cx, cy }
}

const quad = (p, c, q, t) => ({
  x: (1 - t) ** 2 * p.x + 2 * (1 - t) * t * c.x + t ** 2 * q.x,
  y: (1 - t) ** 2 * p.y + 2 * (1 - t) * t * c.y + t ** 2 * q.y
})

const build = (data) => {
  floor.replaceChildren()
  itemsList.replaceChildren()
  logEl.replaceChildren()
  const defs = el('defs', {}, floor)
  defs.innerHTML = `
<radialGradient id="agent-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#D9A441" stop-opacity=".85"/><stop offset=".6" stop-color="#D9A441" stop-opacity=".3"/><stop offset="1" stop-color="#D9A441" stop-opacity="0"/></radialGradient>
<linearGradient id="agent-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E3A1"/><stop offset=".35" stop-color="#D9A441"/><stop offset=".7" stop-color="#8E6422"/><stop offset="1" stop-color="#E9C46A"/></linearGradient>
<radialGradient id="agent-face" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4a3220"/><stop offset="1" stop-color="#1e120a"/></radialGradient>`
  const points = {}
  data.agents.forEach((a, i) => {
    points[a.id] = place(i, data.agents.length)
  })
  const ids = data.agents.map((a) => a.id)
  const arcs = {}
  for (let i = 0; i < ids.length - 1; i++) {
    const a = arcPath(points[ids[i]], points[ids[i + 1]])
    arcs[`${ids[i]}>${ids[i + 1]}`] = { p: points[ids[i]], q: points[ids[i + 1]], c: { x: a.cx, y: a.cy } }
    el('path', { class: 'arc', d: a.d }, floor)
  }
  if (points.archivist && points.care_checker) {
    const a = arcPath(points.archivist, points.care_checker, 0.7)
    arcs['archivist>care_checker'] = { p: points.archivist, q: points.care_checker, c: { x: a.cx, y: a.cy } }
    el('path', { class: 'arc held', d: a.d }, floor)
  }
  const agents = {}
  data.agents.forEach((a) => {
    const { x, y } = points[a.id]
    const g = el('g', { class: 'agent', 'data-agent': a.id, transform: `translate(${x} ${y})` }, floor)
    el('circle', { class: 'glow', r: 105, fill: 'url(#agent-glow)' }, g)
    const pulse = el('g', { class: 'pulse' }, g)
    el('circle', { r: 64, fill: 'url(#agent-brass)' }, pulse)
    el('circle', { r: 55, fill: 'url(#agent-face)' }, pulse)
    el('circle', { class: 'halo-ring', r: 72 }, pulse)
    const icon = el('g', {}, pulse)
    icon.innerHTML = ICONS[a.id]
    const name = el('text', { class: 'name', y: 106, 'text-anchor': 'middle' }, g)
    name.textContent = a.name
    agents[a.id] = g
  })
  const tokenLayer = el('g', {}, floor)
  const tokens = {}
  data.items.forEach((item) => {
    const li = document.createElement('li')
    li.className = item.hero ? 'hero' : ''
    li.innerHTML = `<span class="dot ${item.kind}"></span><span class="name"></span><span class="state">waiting</span>`
    li.querySelector('.name').textContent = item.label
    itemsList.append(li)
    tokens[item.id] = { item, li, node: null, at: null, slot: 0 }
  })
  return { points, arcs, agents, tokenLayer, tokens, ids }
}

const slotOffset = (k) => ({ x: (k - 2) * 32, y: 134 })

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const sleepFor = (ms, token) => new Promise((resolve) => setTimeout(() => resolve(token === run), ms))

const logLine = (data, e) => {
  const li = document.createElement('li')
  li.className = `ev ev-${e.type}`
  const name = data.agents.find((a) => a.id === e.agent)?.name ?? e.agent
  li.innerHTML = '<span class="who"></span><span class="msg"></span>'
  li.querySelector('.who').textContent = name
  li.querySelector('.msg').textContent = e.message
  logEl.prepend(li)
}

const moveToken = (stage, id, toAgent, token) =>
  new Promise((resolve) => {
    const t = stage.tokens[id]
    if (!t?.node) return resolve()
    const from = t.at
    const key = `${from}>${toAgent}`
    const arc = stage.arcs[key]
    const slotCount = Object.values(stage.tokens).filter((x) => x.at === toAgent).length
    const dest = stage.points[toAgent]
    const off = slotOffset(slotCount)
    t.at = toAgent
    const end = { x: dest.x + off.x, y: dest.y + off.y }
    if (calmMode || !arc) {
      t.node.setAttribute('transform', `translate(${end.x} ${end.y})`)
      return resolve()
    }
    const start = { x: stage.points[from].x + slotOffset(0).x, y: stage.points[from].y + slotOffset(0).y }
    const t0 = performance.now()
    const dur = 1300
    const step = (now) => {
      if (token !== run) return resolve()
      const p = clamp((now - t0) / dur, 0, 1)
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
      const pos = quad(start, arc.c, end, e)
      t.node.setAttribute('transform', `translate(${pos.x} ${pos.y})`)
      if (p < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })

const apply = async (data, stage, e, token) => {
  logLine(data, e)
  const agentNode = stage.agents[e.agent]
  const setActive = (id, on) => stage.agents[id]?.classList.toggle('active', on)
  if (e.type === 'start') {
    agentNode.classList.remove('done')
    setActive(e.agent, true)
  } else if (e.type === 'item_in') {
    for (const id of e.itemIds ?? []) {
      const t = stage.tokens[id]
      if (!t) continue
      const count = Object.values(stage.tokens).filter((x) => x.at === e.agent).length
      const pos = stage.points[e.agent]
      const off = slotOffset(count)
      const g = el('g', { class: `token ${t.item.kind}${t.item.hero ? ' hero' : ''}`, transform: `translate(${pos.x + off.x} ${pos.y + off.y})` }, stage.tokenLayer)
      el('circle', { class: 'halo', r: 30 }, g)
      el('circle', { class: 'body', r: t.item.hero ? 15 : 11 }, g)
      el('path', { class: 'cross', d: 'M-6 -6L6 6M6 -6L-6 6' }, g)
      if (t.item.hero) {
        const tag = el('text', { class: 'tag', y: 34, 'text-anchor': 'middle' }, g)
        tag.textContent = `${t.item.from ?? 'Family'}'s message`
      }
      t.node = g
      t.at = e.agent
      t.li.querySelector('.state').textContent = `arrived at ${SHORT[e.agent]}`
    }
  } else if (e.type === 'work') {
    setActive(e.agent, true)
  } else if (e.type === 'flag') {
    for (const id of e.itemIds ?? []) {
      stage.tokens[id]?.node?.classList.add('flagged')
      if (stage.tokens[id]) stage.tokens[id].li.querySelector('.state').textContent = 'held back by the Archivist'
    }
  } else if (e.type === 'handoff') {
    setActive(e.to, true)
    await Promise.all((e.itemIds ?? []).map((id) => moveToken(stage, id, e.to, token)))
    for (const id of e.itemIds ?? []) if (stage.tokens[id]) stage.tokens[id].li.querySelector('.state').textContent = `with ${SHORT[e.to]}`
  } else if (e.type === 'block') {
    for (const id of e.itemIds ?? []) {
      const t = stage.tokens[id]
      if (!t) continue
      t.node?.classList.remove('flagged')
      t.node?.classList.add('blocked')
      t.li.classList.add('blocked')
      t.li.querySelector('.state').textContent = 'blocked, never aired'
    }
  } else if (e.type === 'done') {
    setActive(e.agent, false)
    agentNode.classList.add('done')
  } else if (e.type === 'error') {
    setActive(e.agent, false)
    agentNode.classList.add('error')
  }
}

const play = async (data) => {
  const token = ++run
  const stage = build(data)
  statusEl.textContent = 'Replaying the run'
  let prev = data.events[0]?.t ?? 0
  for (const e of data.events) {
    const wait = clamp(e.t - prev, 600, 2500)
    prev = e.t
    if (!(await sleepFor(wait, token))) return
    await apply(data, stage, e, token)
    if (token !== run) return
  }
  for (const a of Object.values(stage.agents)) a.classList.remove('active')
  statusEl.textContent =
    data.result.status === 'ok'
      ? `Show ready: ${data.result.showId}, ${data.result.segments} segments`
      : 'This run failed, so yesterday\'s show stays on air'
}

const show = (data) => {
  doc = data
  return play(data)
}

const selectTab = (which) => {
  tabDemo.setAttribute('aria-selected', String(which === 'demo'))
  tabLive.setAttribute('aria-selected', String(which === 'live'))
  document.getElementById('floor-panel').setAttribute('aria-labelledby', which === 'demo' ? 'tab-demo' : 'tab-live')
}

let liveDoc = null
let demoDoc = null

tabDemo.addEventListener('click', () => {
  selectTab('demo')
  noteEl.textContent = ''
  show(demoDoc)
})

tabLive.addEventListener('click', () => {
  selectTab('live')
  noteEl.textContent = 'This is the most recent run published by the crew.'
  show(liveDoc)
})

replayBtn.addEventListener('click', () => doc && play(doc))

demoDoc = await loadEvents()
show(demoDoc)

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
Promise.race([loadEvents({ live: true }), timeout(4000)])
  .then((data) => {
    liveDoc = data
    tabLive.disabled = false
  })
  .catch(() => {
    noteEl.textContent = 'The latest 5 AM run is not published yet. The demo run is a full replay.'
  })
