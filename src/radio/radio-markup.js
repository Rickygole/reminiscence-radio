const NUMBERS = [55, 60, 70, 80, 91, 110, 130, 160]
const DIAL_LEFT = 470
const DIAL_STEP = 440 / 7
export const STATION_INDEX = 4
export const DIAL_START_X = 452
export const STATION_X = DIAL_LEFT + STATION_INDEX * DIAL_STEP

const FACE_HOLES = [
  [330, 72, 340, 148, 14],
  [100, 88, 200, 134, 12],
  [430, 262, 500, 226, 16],
  [70, 262, 330, 360, 18]
]

const roundRect = ([x, y, w, h, r]) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`

const CAB = 'M30 664L30 150Q30 34 146 34L854 34Q970 34 970 150L970 664Q970 682 952 682L48 682Q30 682 30 664Z'
const PANEL = 'M52 650L52 160Q52 56 156 56L844 56Q948 56 948 160L948 650Q948 664 934 664L66 664Q52 664 52 650Z'
const FACE_PATH = `${PANEL}${FACE_HOLES.map(roundRect).join('')}`

const dialMarks = () => {
  let out = ''
  for (let i = 0; i <= 56; i++) {
    const x = DIAL_LEFT + (i * 440) / 56
    const major = i % 8 === 0
    out += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${major ? 300 : 312}" y2="336" stroke="#3a2312" stroke-width="${major ? 2.4 : 1.2}"/>`
  }
  out += NUMBERS.map((n, i) => `<text class="dial-num" x="${(DIAL_LEFT + i * DIAL_STEP).toFixed(1)}" y="292" text-anchor="middle">${n}</text>`).join('')
  return out
}

const vuMarks = () => {
  let out = ''
  for (let i = 0; i <= 18; i++) {
    const a = ((-45 + (i * 90) / 18) * Math.PI) / 180
    const major = i % 3 === 0
    const r1 = 128
    const r2 = major ? 112 : 119
    const red = i >= 14
    out += `<line x1="${(200 + Math.sin(a) * r1).toFixed(1)}" y1="${(238 - Math.cos(a) * r1).toFixed(1)}" x2="${(200 + Math.sin(a) * r2).toFixed(1)}" y2="${(238 - Math.cos(a) * r2).toFixed(1)}" stroke="${red ? '#a93a22' : '#3a2312'}" stroke-width="${major ? 2.4 : 1.4}"/>`
  }
  return out
}

const knurl = () => Array.from({ length: 48 }, (_, i) => `<line x1="0" y1="-84" x2="0" y2="-77" transform="rotate(${(i * 360) / 48})" stroke="#1d110a" stroke-width="2.4" stroke-linecap="round"/>`).join('')

const knobTicks = () => {
  let out = ''
  for (let i = 0; i <= 10; i++) {
    const a = ((-135 + i * 27) * Math.PI) / 180
    out += `<line x1="${(780 + Math.sin(a) * 90).toFixed(1)}" y1="${(574 - Math.cos(a) * 90).toFixed(1)}" x2="${(780 + Math.sin(a) * 100).toFixed(1)}" y2="${(574 - Math.cos(a) * 100).toFixed(1)}" stroke="#E9C46A" stroke-width="${i % 5 === 0 ? 3 : 1.6}" stroke-linecap="round"/>`
  }
  return out
}

const tube = (cx, h, i) => {
  const base = 206
  const top = base - h
  const w = 21
  return `<g class="tube" style="--i:${i}">
<path d="M${cx - w} ${base}V${top + w}A${w} ${w} 0 0 1 ${cx + w} ${top + w}V${base}Z" fill="url(#glass)" stroke="#8a6a52" stroke-opacity=".55" stroke-width="1.6"/>
<rect x="${cx - 12}" y="${top + 26}" width="24" height="${h - 50}" rx="3" fill="url(#plate)"/>
<g stroke="#2a2a2a" stroke-opacity=".5" stroke-width="1">${Array.from({ length: 5 }, (_, k) => `<line x1="${cx - 12 + k * 6}" x2="${cx - 12 + k * 6}" y1="${top + 28}" y2="${base - 26}"/>`).join('')}</g>
<ellipse cx="${cx}" cy="${top + 13}" rx="9" ry="5" fill="#c8cdd0" opacity=".75"/>
<g class="tube-lit"><g class="halo"><ellipse cx="${cx}" cy="${(top + base) / 2}" rx="34" ry="${h / 2 + 6}" fill="url(#halo)"/></g>
<path class="fil" d="M${cx - 5} ${base - 30}V${top + 40}M${cx + 5} ${base - 30}V${top + 40}M${cx - 5} ${top + 40}H${cx + 5}" fill="none" stroke-width="3" stroke-linecap="round"/></g>
<rect x="${cx - 17}" y="${base}" width="34" height="14" rx="4" fill="url(#bakelite)"/>
<g fill="#b9892f"><rect x="${cx - 11}" y="${base + 12}" width="3" height="5"/><rect x="${cx + 8}" y="${base + 12}" width="3" height="5"/></g>
</g>`
}

export const radioMarkup = () => `
<div class="layer l-shadow" aria-hidden="true"></div>
${[24, 16, 8]
  .map((z) => `<svg class="layer l-slab" style="--z:-${z}px" viewBox="0 0 1000 700" aria-hidden="true"><path d="${CAB}" fill="#25140a"/></svg>`)
  .join('')}
<svg class="layer l-body" viewBox="0 0 1000 700" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="walnut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a4d2c"/><stop offset=".45" stop-color="#5A3A22"/><stop offset="1" stop-color="#3b2314"/></linearGradient>
<linearGradient id="walnut2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a35"/><stop offset=".5" stop-color="#6a4326"/><stop offset="1" stop-color="#4a2d19"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E3A1"/><stop offset=".3" stop-color="#D9A441"/><stop offset=".6" stop-color="#8E6422"/><stop offset=".8" stop-color="#E9C46A"/><stop offset="1" stop-color="#7A531B"/></linearGradient>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".88" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4efe2" stop-opacity=".22"/><stop offset=".5" stop-color="#f4efe2" stop-opacity=".05"/><stop offset="1" stop-color="#f4efe2" stop-opacity=".2"/></linearGradient>
<linearGradient id="plate" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e6e6e"/><stop offset=".5" stop-color="#b3b3b0"/><stop offset="1" stop-color="#5c5c5c"/></linearGradient>
<linearGradient id="bakelite" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#140c07"/><stop offset=".5" stop-color="#3a281b"/><stop offset="1" stop-color="#140c07"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb04a" stop-opacity=".95"/><stop offset=".45" stop-color="#ff8a2a" stop-opacity=".4"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
<radialGradient id="dialglass" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#FFE6A8"/><stop offset=".6" stop-color="#F3BC62"/><stop offset="1" stop-color="#C98A36"/></radialGradient>
<radialGradient id="cone" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".7" stop-color="#000" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="vuface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EBC8"/><stop offset="1" stop-color="#E4D3A0"/></linearGradient>
<linearGradient id="chassis" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#150b06"/><stop offset="1" stop-color="#2d1c11"/></linearGradient>
<pattern id="weave" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#C2AB74"/><path d="M0 2.5H5M2.5 0V5" stroke="#8d7647" stroke-width="1.1"/><path d="M0 0L5 5" stroke="#d8c690" stroke-width=".5" opacity=".6"/></pattern>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .16" numOctaves="3" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .13  0 0 0 0 .07  0 0 0 0 .03  2.1 0 0 0 -.72"/></filter>
<filter id="pores" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".018 .75" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 .05  0 0 0 0 .02  1.6 0 0 0 -.62"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
<clipPath id="cabClip"><path d="${CAB}"/></clipPath>
<clipPath id="faceClip"><path clip-rule="evenodd" d="${FACE_PATH}"/></clipPath>
</defs>
<rect x="76" y="676" width="96" height="22" rx="9" fill="#24130a"/><rect x="828" y="676" width="96" height="22" rx="9" fill="#24130a"/>
<path d="${CAB}" fill="url(#walnut)"/>
<rect width="1000" height="700" filter="url(#grain)" clip-path="url(#cabClip)" opacity=".7"/>
<rect width="1000" height="700" filter="url(#pores)" clip-path="url(#cabClip)" opacity=".5"/>
<path d="${CAB}" fill="url(#edge)"/>
<path d="${CAB}" fill="url(#sheen)"/>
<path d="${CAB}" fill="none" stroke="#c28a56" stroke-opacity=".45" stroke-width="2.5" transform="translate(1.5 1.5)"/>
<path d="${CAB}" fill="none" stroke="#1b0e06" stroke-opacity=".7" stroke-width="3"/>
</svg>
<svg class="layer l-inside" viewBox="0 0 1000 700" aria-hidden="true" focusable="false">
<rect x="330" y="72" width="340" height="148" rx="14" fill="url(#chassis)"/>
<g class="bay-glow"><rect x="330" y="72" width="340" height="148" rx="14" fill="url(#halo)" opacity=".5"/></g>
${[0, 1, 2, 3, 4].map((i) => tube(372 + i * 64, i % 2 === 0 ? 120 : 104, i)).join('')}
<rect x="100" y="88" width="200" height="134" rx="12" fill="url(#vuface)"/>
<path d="M${200 + Math.sin((10 * Math.PI) / 180) * 128} ${238 - Math.cos((10 * Math.PI) / 180) * 128}A128 128 0 0 1 ${200 + Math.sin((45 * Math.PI) / 180) * 128} ${238 - Math.cos((45 * Math.PI) / 180) * 128}" fill="none" stroke="#a93a22" stroke-opacity=".5" stroke-width="7"/>
${vuMarks()}
<text class="vu-label" x="200" y="196" text-anchor="middle">VU</text>
<g class="needle"><line x1="200" y1="238" x2="200" y2="112" stroke="#1e130b" stroke-width="2.4" stroke-linecap="round"/><circle cx="200" cy="238" r="9" fill="#1e130b"/></g>
<rect x="430" y="262" width="500" height="226" rx="16" fill="#2a1b12"/>
<rect class="dial-lit" x="430" y="262" width="500" height="226" rx="16" fill="url(#dialglass)"/>
${dialMarks()}
<line x1="440" x2="920" y1="354" y2="354" stroke="#3a2312" stroke-opacity=".45" stroke-width="2"/>
<g class="pointer-wrap"><g class="pointer" style="transform: translateX(${DIAL_START_X - 452}px)"><rect x="450" y="268" width="5" height="88" rx="2.5" fill="#B5391E"/><rect x="447" y="268" width="11" height="88" rx="5" fill="#ff6a3a" opacity=".28" filter="url(#soft)"/></g></g>
<text class="station-tag" x="${STATION_X.toFixed(1)}" y="349" text-anchor="middle">ROSE</text>
<rect x="70" y="262" width="330" height="360" rx="18" fill="url(#weave)"/>
<circle cx="235" cy="442" r="150" fill="url(#cone)"/>
<g fill="none" stroke="#7A531B" stroke-opacity=".5"><circle cx="235" cy="442" r="52" stroke-width="2"/><circle cx="235" cy="442" r="104" stroke-width="2"/><circle cx="235" cy="442" r="150" stroke-width="2"/></g>
</svg>
<svg class="layer l-face" viewBox="0 0 1000 700" aria-hidden="true" focusable="false">
<path clip-rule="evenodd" fill-rule="evenodd" d="${FACE_PATH}" fill="url(#walnut2)"/>
<rect width="1000" height="700" filter="url(#grain)" clip-path="url(#faceClip)" opacity=".65"/>
<rect width="1000" height="700" filter="url(#pores)" clip-path="url(#faceClip)" opacity=".45"/>
<path clip-rule="evenodd" fill-rule="evenodd" d="${FACE_PATH}" fill="url(#sheen)"/>
<path d="${PANEL}" fill="none" stroke="url(#brass)" stroke-width="5"/>
<path d="${PANEL}" fill="none" stroke="#1b0e06" stroke-opacity=".6" stroke-width="1.5" transform="translate(0 4)"/>
${FACE_HOLES.map((h) => `<path d="${roundRect(h)}" fill="none" stroke="url(#brass)" stroke-width="7"/><path d="${roundRect(h)}" fill="none" stroke="#120a05" stroke-opacity=".7" stroke-width="2.5" transform="translate(0 -3)"/>`).join('')}
<g>
<rect x="706" y="88" width="212" height="134" rx="10" fill="url(#brass)"/>
<rect x="714" y="96" width="196" height="118" rx="6" fill="none" stroke="#5a3a12" stroke-opacity=".55" stroke-width="1.5"/>
<text class="plaque-title" x="812" y="148" text-anchor="middle">Reminiscence</text>
<text class="plaque-sub" x="812" y="176" text-anchor="middle">R A D I O</text>
<text class="plaque-small" x="812" y="200" text-anchor="middle">TUBE CONSOLE</text>
</g>
<g>
<circle cx="610" cy="574" r="36" fill="#120a05" opacity=".45" transform="translate(3 5)"/>
<circle cx="610" cy="574" r="36" fill="url(#brass)"/>
<circle cx="610" cy="574" r="29" fill="url(#bakelite)"/>
<line x1="610" y1="552" x2="610" y2="564" stroke="#F3E9D2" stroke-width="3" stroke-linecap="round" transform="rotate(35 610 574)"/>
<text class="knob-label" x="610" y="630" text-anchor="middle">TONE</text>
</g>
${knobTicks()}
<text class="knob-label" x="716" y="656" text-anchor="middle">OFF</text>
<text class="knob-label" x="844" y="656" text-anchor="middle">ON</text>
<circle cx="900" cy="574" r="15" fill="url(#brass)"/>
<circle class="pilot" cx="900" cy="574" r="9" fill="#ff8a3a"/>
</svg>
<svg class="layer l-glass" viewBox="0 0 1000 700" aria-hidden="true" focusable="false">
<defs>
<linearGradient id="streak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<path d="M334 76H470L378 216H334Z" fill="url(#streak)"/>
<path d="M490 76H530L438 216H398Z" fill="url(#streak)" opacity=".6"/>
<path d="M434 266H640L520 484H434Z" fill="url(#streak)"/>
<path d="M104 92H190L120 220H104Z" fill="url(#streak)" opacity=".7"/>
</svg>
<div class="caption" id="caption" aria-hidden="true"></div>
<button class="knob" id="knob" type="button" role="switch" aria-checked="false" aria-label="Radio power knob. Press to turn the radio on or off. Arrow keys turn it.">
<svg viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
<circle r="96" cx="4" cy="8" fill="#0d0703" opacity=".4" filter="url(#soft)"/>
<circle r="92" fill="url(#brass)"/>
<circle r="86" fill="url(#bakelite)"/>
<g class="knob-rot">
<circle r="86" fill="#2b1a10"/>
${knurl()}
<circle r="72" fill="#3b2619"/>
<circle r="62" fill="#4a3220"/>
<circle r="52" fill="#3b2619" stroke="#E9C46A" stroke-opacity=".5" stroke-width="1.5"/>
<rect x="-4" y="-66" width="8" height="40" rx="4" fill="#F3E9D2"/>
</g>
<ellipse cx="-26" cy="-34" rx="30" ry="16" fill="#fff" opacity=".12" transform="rotate(-35 -26 -34)"/>
</svg>
</button>
`
