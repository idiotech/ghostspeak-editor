// Encodes WAV as MP3 in the browser, so authors can upload what their
// recorder produced without shipping it to players at ten times the size.
import { Mp3Encoder } from "@breezystack/lamejs";
import { readWavInfo, decodeFrames } from "./wav.js";

// the sample rates an MP3 file can carry
const mp3Rates = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

// frames per encoder call: a multiple of the MP3 frame size, about a second
const block = 1152 * 40;

// Encoding runs on the page's own thread; stepping aside between blocks keeps
// the page responsive. A message, not a timer: browsers slow timers down to
// one a second or less in a tab the author has switched away from.
const nextTick = () =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });

const megabyte = 1024 * 1024;

const describeLength = (seconds) =>
  seconds < 60
    ? `${Math.round(seconds)} 秒`
    : `${Math.round(seconds / 60)} 分鐘`;

// Returns the MP3 as a list of byte arrays, ready for `new Blob(parts)`.
// `source` gives the WAV a slice at a time (see wav.js). Throws a message for
// the author when the WAV cannot be converted, or when its MP3 would be
// larger than `maxBytes`.
export async function wavToMp3(
  source,
  { kbps = 128, pause = nextTick, maxBytes = Infinity } = {}
) {
  const info = await readWavInfo(source);
  if (info.channels > 2)
    throw new Error(
      `這個 WAV 有 ${info.channels} 個聲道，請先轉成立體聲或 MP3 再上傳`
    );
  if (!mp3Rates.includes(info.sampleRate))
    throw new Error(
      `這個 WAV 的取樣率 ${info.sampleRate} Hz 無法轉成 MP3，請先轉成 44100 或 48000 Hz 再上傳`
    );
  // the size is known from the length, so a recording that cannot fit is
  // refused before minutes are spent encoding it
  const seconds = info.frames / info.sampleRate;
  if ((seconds * kbps * 1000) / 8 > maxBytes)
    throw new Error(
      `這段錄音長 ${describeLength(seconds)}，轉成 MP3 後仍超過上限（${Math.floor(
        maxBytes / megabyte
      )} MB），請分段後再上傳`
    );
  const encoder = new Mp3Encoder(info.channels, info.sampleRate, kbps);
  const parts = [];
  for (let start = 0; start < info.frames; start += block) {
    const count = Math.min(block, info.frames - start);
    const from = info.dataOffset + start * info.frameBytes;
    const slice = await source.read(from, from + count * info.frameBytes);
    const [left, right] = decodeFrames(slice, info, count);
    const encoded = encoder.encodeBuffer(left, right);
    if (encoded.length > 0) parts.push(new Uint8Array(encoded));
    await pause();
  }
  const rest = encoder.flush();
  if (rest.length > 0) parts.push(new Uint8Array(rest));
  return parts;
}
