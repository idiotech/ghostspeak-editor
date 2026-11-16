// Builds small WAV files for the tests.

// rounds away from zero, so +0.5 and -0.5 come out symmetric
const scale = (s, max) => Math.sign(s) * Math.round(Math.abs(s) * max);

// `samples` are floats in [-1, 1], interleaved by channel
export function makeWav({
  channels = 2,
  sampleRate = 44100,
  bits = 16,
  format = 1, // 1 PCM, 3 IEEE float
  samples = [],
  extraChunk = false,
}) {
  const bytesPerSample = bits / 8;
  const dataLength = samples.length * bytesPerSample;
  const extra = extraChunk ? 8 + 6 : 0;
  const buffer = new ArrayBuffer(44 + extra + dataLength);
  const view = new DataView(buffer);
  const text = (offset, s) =>
    [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bits, true);
  let offset = 36;
  if (extraChunk) {
    // recorders add chunks such as LIST before the audio
    text(offset, "LIST");
    view.setUint32(offset + 4, 6, true);
    offset += 14;
  }
  text(offset, "data");
  view.setUint32(offset + 4, dataLength, true);
  offset += 8;
  samples.forEach((s, i) => {
    const at = offset + i * bytesPerSample;
    if (format === 3) view.setFloat32(at, s, true);
    else if (bits === 8) view.setUint8(at, scale(s, 127) + 128);
    else if (bits === 16) view.setInt16(at, scale(s, 32767), true);
    else if (bits === 24) {
      const v = scale(s, 8388607);
      view.setUint8(at, v & 0xff);
      view.setUint8(at + 1, (v >> 8) & 0xff);
      view.setUint8(at + 2, (v >> 16) & 0xff);
    } else view.setInt32(at, scale(s, 2147483647), true);
  });
  return buffer;
}

// a 440 Hz tone, the same on every channel
export function tone({ seconds = 1, channels = 2, sampleRate = 44100 }) {
  const samples = [];
  for (let i = 0; i < seconds * sampleRate; i++) {
    const s = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    for (let c = 0; c < channels; c++) samples.push(s);
  }
  return samples;
}
