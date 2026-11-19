import '../shared/base.css'
import './caregiver.css'
import { readSettings, saveSettings, applyDocumentFlags, readOverrides, saveOverrides } from '../shared/settings.js'
import { loadShow, applyOverrides, sanitizeReminder, MAX_REMINDER } from '../shared/show-loader.js'

let settings = readSettings()
applyDocumentFlags(settings)

const KIND_NAMES = { host: 'Host', story: 'On this day', voice_message: 'Family voice', song: 'Song', reminder: 'Reminder' }
const RULE_NAMES = {
  medical: 'Health or medicine talk',
  dose: 'An amount of medicine',
  avoid_topic: 'A topic you asked us to avoid',
  distressing: 'Something that could be upsetting',
  memory_quiz: 'A memory quiz',
  too_long: 'A line that was too long',
  reminder_not_verbatim: 'A reminder that did not match your words',
  llm_flag: 'Flagged by the second reader'
}

const params = new URLSearchParams(location.search)
const { show: original, source } = await loadShow({ live: params.get('show') === 'live' })

const summary = (seg) => {
  if (seg.kind === 'voice_message') return `${seg.caption}${seg.performedByVolunteer ? '' : ' (placeholder recording)'}`
  if (seg.kind === 'song') return `${seg.title} (${seg.era}), made by our own code`
  return seg.text
}

const text = (tag, content, className) => {
  const node = document.createElement(tag)
  node.textContent = content
  if (className) node.className = className
  return node
}

const renderShow = (show) => {
  document.getElementById('show-meta').textContent = `${show.date}, ${source === 'live' ? 'latest published show' : 'bundled demo show'}, ${show.segments.length} segments`
  const list = document.getElementById('segments')
  list.replaceChildren()
  for (const seg of show.segments) {
    const li = document.createElement('li')
    li.append(text('span', KIND_NAMES[seg.kind], `kind ${seg.kind}`), document.createTextNode(summary(seg)))
    list.append(li)
  }
}

const renderSafety = (show) => {
  const box = document.getElementById('safety')
  box.replaceChildren()
  const { blocked, fixed } = show.safety
  if (!blocked.length && !fixed.length) {
    box.append(text('p', 'Nothing needed blocking or fixing today.', 'ok'))
    return
  }
  const seen = new Set()
  for (const f of blocked.filter((b) => !seen.has(b.itemId) && seen.add(b.itemId))) {
    const d = document.createElement('div')
    d.className = 'finding'
    d.append(text('strong', `Kept out of the show: ${RULE_NAMES[f.rule] ?? f.rule}`), text('span', f.reason), text('span', ` (item ${f.itemId})`, 'original'))
    box.append(d)
  }
  for (const f of fixed) {
    const d = document.createElement('div')
    d.className = 'finding fixed'
    d.append(text('strong', `Fixed before airing: ${RULE_NAMES[f.rule] ?? f.rule}`), text('span', f.reason))
    box.append(d)
  }
}

const reminders = original.segments.filter((s) => s.kind === 'reminder')
const remList = document.getElementById('rem-list')
const remStatus = document.getElementById('rem-status')

const speakPreview = (value) => {
  if (!('speechSynthesis' in window)) {
    remStatus.textContent = 'This browser cannot read aloud.'
    return
  }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(value)
  u.rate = 0.9
  u.lang = 'en-US'
  speechSynthesis.speak(u)
}

const renderReminders = () => {
  const overrides = readOverrides()
  const current = applyOverrides(original, overrides).segments.filter((s) => s.kind === 'reminder')
  remList.replaceChildren()
  if (!reminders.length) remList.append(text('li', 'There are no reminders in today\'s show.'))
  current.forEach((seg, i) => {
    const li = document.createElement('li')
    li.className = 'rem-item'
    const id = `rem-${i}`
    const label = text('label', `Reminder for ${seg.time ?? 'any time'}`)
    label.htmlFor = id
    const line = document.createElement('div')
    line.className = 'line'
    const input = document.createElement('input')
    input.type = 'text'
    input.id = id
    input.value = seg.text
    input.maxLength = MAX_REMINDER
    input.dataset.reminderId = seg.reminderId
    input.setAttribute('aria-describedby', `${id}-count`)
    const preview = text('button', 'Preview', 'btn quiet')
    preview.type = 'button'
    preview.setAttribute('aria-label', `Preview reminder for ${seg.time ?? 'any time'} read aloud`)
    preview.addEventListener('click', () => speakPreview(sanitizeReminder(input.value)))
    line.append(input, preview)
    const count = text('div', '', 'count')
    count.id = `${id}-count`
    const update = () => {
      count.textContent = `${input.value.length} of ${MAX_REMINDER} characters`
    }
    input.addEventListener('input', update)
    update()
    li.append(label, line, count)
    const base = reminders[i]
    if (base && base.text !== seg.text) li.append(text('div', `Original: ${base.text}`, 'original'))
    remList.append(li)
  })
}

document.getElementById('rem-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const overrides = {}
  for (const input of remList.querySelectorAll('input[data-reminder-id]')) {
    const value = sanitizeReminder(input.value)
    const base = reminders.find((r) => r.reminderId === input.dataset.reminderId)
    if (value && base && value !== base.text) overrides[input.dataset.reminderId] = value
  }
  saveOverrides(overrides)
  renderReminders()
  remStatus.textContent = 'Saved. The radio will use these words next time it starts.'
})

document.getElementById('rem-reset').addEventListener('click', () => {
  saveOverrides({})
  renderReminders()
  remStatus.textContent = 'The original reminders are back.'
})

const simple = document.getElementById('set-simple')
const captions = document.getElementById('set-captions')
simple.checked = settings.simpleMode
captions.checked = settings.captions
const sync = () => {
  saveSettings({ simpleMode: simple.checked, captions: captions.checked })
  settings = readSettings()
  applyDocumentFlags(settings)
}
simple.addEventListener('change', sync)
captions.addEventListener('change', sync)

renderShow(original)
renderSafety(original)
renderReminders()
