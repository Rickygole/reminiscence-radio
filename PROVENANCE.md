# Provenance

## Music
Every song is rendered by code in `src/radio/song-synth.js` from a recipe, a seed, a tempo and a key. No recordings or samples are used. The code and its output are released under CC0 1.0 and credited in each song segment.

## Voices
- Host, stories and reminders are a computer voice: clips rendered with the open Kokoro text to speech model (Apache-2.0, https://github.com/hexgrad/kokoro, voice af_heart) and published by the crew. A reminder the caregiver edits on this device is read by the browser speech engine instead. The host is labelled as a computer voice.
- Family messages are recordings made by the people who sent them. The demo has none yet, so `public/demo/media/leo.mp3` is a soft three note chime made by `scripts/make-placeholders.js` in the crew repository, with the caption "Leo's recorded message will play here". No voice is generated or cloned for any family member.

## Photos
`public/demo/media/leo.svg` is an original illustration of a porch swing at sunset with no people in it, drawn for this project. `leo-depth.png` is a synthetic depth map, also made by the crew's placeholder script. Both stand in for a real family photo.

## Stories
On this day stories in the crew's `data/stories.json` point to primary source home pages (NASA, Library of Congress, National Archives, Smithsonian). They are marked `verified: false` until a person checks each one.

## Fonts
Abril Fatface and Lora, loaded from Google Fonts under the SIL Open Font License.

## Listener
Rose is fictional. No real patient data is used anywhere.
