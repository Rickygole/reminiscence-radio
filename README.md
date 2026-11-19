# Reminiscence Radio

A website shaped like a tabletop tube radio. One big knob plays a calm daily show for Rose, a fictional listener born in 1946: a host who greets her, a recorded message from a grandchild with a photo that rises above the radio, gentle songs from her teenage years, an on this day story, and her caregiver's reminders word for word.

The show is built each night by a separate five-agent crew: [reminiscence-radio-crew](https://github.com/Rickygole/reminiscence-radio-crew). This repository is the radio, a Control Room that replays the crew's run, and a Caregiver page. Every page works with zero credentials using a bundled demo show.

## Pages

| Page | What it does |
| --- | --- |
| `/` | The radio. Turn or press the big knob. Add `?simple=1` for simple mode. `?show=live` loads the crew's published show and falls back to the demo. |
| `/control.html` | Replays the crew run as agents hand items to each other. Never plays sound. |
| `/caregiver.html` | Today's segments, the safety report, a reminder editor with spoken preview, simple mode and captions. |

## Run it

Node 22 or newer.

```
npm install
npm test
npm run dev
npm run build
npm run preview
```

## How it sounds

Songs are rendered in the browser by `src/radio/song-synth.js`: a warm additive organ, FM electric piano, plucked bass, brushes and vibes over a I, vi, IV, V progression in 12/8 (doo-wop ballad), swing 4/4 (lounge) or 3/4 (country waltz). Output is band limited like an old radio and kept quiet (peak 0.5 before the master gain). Between the warm-up and the show a soft pink noise static follows the dial pointer and fades out.

## Calm by design

Everything is slow. The tubes warm over three seconds, staggered. The meter glow is smoothed so nothing flashes more than three times a second (tested in `test/meter.test.js`). Simple mode and `prefers-reduced-motion` remove tilt, static, the dial sweep, the moving photo and page transitions. Captions are large, on by default and mirrored to a live region. Everything works from the keyboard.

## Contract

`contract/show-playlist.schema.json` and `contract/crew-events.schema.json` are byte-identical copies of the crew's schemas. `test/demo-contract.test.js` validates the bundled demo against them. Voice cloning is impossible by schema: a voice message only accepts a recorded file.

## Deploy

A static Vite build (`npm run build`, output in `dist`). On Vercel use the Vite preset. No environment variables.

## Known limits

- The radio is an SVG illustration with CSS 3D layers, not a three.js scene. It is light and works everywhere but is not a true 3D model.
- Caregiver edits are stored per device in the browser, not on a server.
- Songs are synthesized. Drop in a CC0 recording by giving a song segment an `audio.src` instead of a recipe.
- The host reads with the browser's speech engine, so the voice differs between devices.
- The Care Checker in the crew is deterministic: it misses paraphrases and over-blocks health words on purpose. Stories stay `verified: false` until a person checks them.
- The demo voice and photo are labelled placeholders.

See `PROVENANCE.md` for where every sound, picture and story comes from. License: MIT.
