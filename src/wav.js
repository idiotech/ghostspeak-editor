// Reads uncompressed WAV files a slice at a time, without the browser's audio
// decoder, which would hold a whole recording in memory as floats.

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

// A file to read piece by piece: its size, and the bytes from `start` up to
// `end`. A field recording can be gigabytes, so it is never read whole.
export const fileSource = (file) => ({
  size: file.size,
  read: (start, end) => file.slice(start, end).arrayBuffer(),
});

export const bufferSource = (buffer) => ({
  size: buffer.byteLength,
  read: async (start, end) => buffer.slice(start, end),
});

// Where the audio is and how it is stored, from the chunk headers alone.
// Throws a message for the author when the file cannot be read.
export async function readWavInfo(source) {
  const invalid = () => new Error("這不是有效的 WAV 檔");
  if (source.size < 12) throw invalid();
  const riff = new DataView(await source.read(0, 12));
  if (tag(riff, 0) !== "RIFF" || tag(riff, 8) !== "WAVE") throw invalid();
  let format = null;
  let data = null;
  let offset = 12;
  while (offset + 8 <= source.size && !(format && data)) {
    const header = new DataView(await source.read(offset, offset + 8));
    const id = tag(header, 0);
    const size = header.getUint32(4, true);
    const body = offset + 8;
    if (id === "fmt " && size >= 16 && body + 16 <= source.size) {
      const fmt = new DataView(
        await source.read(body, Math.min(body + Math.min(size, 40), source.size))
      );
      let encoding = fmt.getUint16(0, true);
      // the extensible format keeps the real encoding in its sub-format
      if (encoding === EXTENSIBLE && fmt.byteLength >= 26)
        encoding = fmt.getUint16(24, true);
      format = {
        encoding,
        channels: fmt.getUint16(2, true),
        sampleRate: fmt.getUint32(4, true),
        bits: fmt.getUint16(14, true),
      };
    } else if (id === "data") {
      // recorders that were cut off leave a length of zero or one too long
      const available = source.size - body;
      data = { offset: body, length: size ? Math.min(size, available) : available };
    }
    // chunks are padded to an even length
    offset = body + size + (size % 2);
  }
  if (!format || !data) throw invalid();
  const { encoding, channels, sampleRate, bits } = format;
  const float = encoding === FLOAT;
  const supported = float
    ? bits === 32 || bits === 64
    : encoding === PCM && [8, 16, 24, 32].includes(bits);
  if (!supported || channels < 1 || sampleRate < 1)
    throw new Error("不支援這種 WAV 編碼，請先轉成 MP3 再上傳");
  const frameBytes = channels * (bits / 8);
  return {
    channels,
    sampleRate,
    bits,
    float,
    frameBytes,
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

// The first `count` frames of `buffer`, a slice of the file's audio, as
// 16-bit samples, one array per channel
export function decodeFrames(buffer, info, count) {
  const view = new DataView(buffer);
  const read = sampleReader(view, info);
  const sampleBytes = info.bits / 8;
  const channels = Array.from(
    { length: info.channels },
    () => new Int16Array(count)
  );
  let at = 0;
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < info.channels; c++) {
      channels[c][i] = read(at);
      at += sampleBytes;
    }
  }
  return channels;
}
