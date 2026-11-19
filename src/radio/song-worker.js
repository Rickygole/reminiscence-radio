import { renderSong, SAMPLE_RATE } from './song-synth.js'

self.onmessage = (e) => {
  const { id, spec } = e.data
  const samples = renderSong(spec)
  self.postMessage({ id, samples, rate: SAMPLE_RATE }, [samples.buffer])
}
