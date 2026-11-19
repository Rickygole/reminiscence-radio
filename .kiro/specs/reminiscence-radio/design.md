# Design

- Vite multi page build: index.html, control.html, caregiver.html. No framework.
- Radio: inline SVG layers with CSS 3D depth (perspective, translateZ) and a slow tilt. Layers are body, interior, front panel with cutouts, and glass reflections.
- Audio: one AudioContext created on the first knob gesture. Source, then highpass 120 Hz, lowpass 5 kHz (3.8 kHz for music), soft waveshaper, master gain, analyser. Static is pink noise through a bandpass that follows the dial, capped at -24 dB.
- Songs: src/radio/song-synth.js renders a recipe, seed, bpm and key to samples in a worker. Warm organ, FM electric piano, plucked bass, brushes and vibes over I, vi, IV, V.
- Meter: RMS, one pole smoother (attack 150 ms, release 600 ms), 1.5 Hz low pass. Glow is 0.6 + 0.4 * level and the needle is a spring.
- Player: a pure reducer over off, warming, tuning and on, with injected audio.
- Photo window: raw WebGL2 depth drift loaded only when effects are allowed and a depth map exists; otherwise a CSS slow zoom.
- Contract: contract/*.json are byte identical copies of the crew schemas.
