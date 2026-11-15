// Reads uncompressed WAV files without the browser's audio decoder, which
// would hold a whole recording in memory as floats.

const PCM = 1;
const FLOAT = 3;
const EXTENSIBLE = 0xfffe;

const tag = (view, offset) =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );

// Where the audio is and how it is stored. Throws a message for the author
// when the file cannot be read.
export function parseWav(buffer) {
  const view = new DataView(buffer);
  if (
    buffer.byteLength < 12 ||
    tag(view, 0) !== "RIFF" ||
    tag(view, 8) !== "WAVE"
  )
    throw new Error("這不是有效的 WAV 檔");
  let format = null;
  let data = null;
  let offset = 12;
  while (offset + 8 <= buffer.byteLength && !(format && data)) {
    const id = tag(view, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= buffer.byteLength) {
      let encoding = view.getUint16(body, true);
      // the extensible format keeps the real encoding in its sub-format
      if (encoding === EXTENSIBLE && size >= 26)
        encoding = view.getUint16(body + 24, true);
      format = {
        encoding,
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === "data") {
      // recorders that were cut off leave a length of zero or one too long
      const available = buffer.byteLength - body;
      data = { offset: body, length: size ? Math.min(size, available) : available };
    }
    // chunks are padded to an even length
    offset = body + size + (size % 2);
  }
  if (!format || !data) throw new Error("這不是有效的 WAV 檔");
  const { encoding, channels, sampleRate, bits } = format;
  const float = encoding === FLOAT;
  const supported = float
    ? bits === 32 || bits === 64
    : encoding === PCM && [8, 16, 24, 32].includes(bits);
  if (!supported || channels < 1)
    throw new Error("不支援這種 WAV 編碼，請先轉成 MP3 再上傳");
  const frameBytes = channels * (bits / 8);
  return {
    channels,
    sampleRate,
    bits,
    float,
    dataOffset: data.offset,
    frames: Math.floor(data.length / frameBytes),
  };
}

function clip(value) {
  return value > 32767 ? 32767 : value < -32768 ? -32768 : value;
}

function sampleReader(view, { bits, float }) {
  if (float && bits === 32)
    return (at) => clip(Math.round(view.getFloat32(at, true) * 32768));
  if (float) return (at) => clip(Math.round(view.getFloat64(at, true) * 32768));
  if (bits === 8) return (at) => (view.getUint8(at) - 128) << 8;
  if (bits === 16) return (at) => view.getInt16(at, true);
  // keep the top 16 bits of wider samples
  if (bits === 24) return (at) => view.getInt16(at + 1, true);
  return (at) => view.getInt16(at + 2, true);
}

// `count` frames from frame `start`, as 16-bit samples, one array per channel
export function readSamples(buffer, info, start, count) {
  const view = new DataView(buffer);
  const read = sampleReader(view, info);
  const sampleBytes = info.bits / 8;
  const frameBytes = info.channels * sampleBytes;
  const channels = Array.from(
    { length: info.channels },
    () => new Int16Array(count)
  );
  let at = info.dataOffset + start * frameBytes;
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < info.channels; c++) {
      channels[c][i] = read(at);
      at += sampleBytes;
    }
  }
  return channels;
}
