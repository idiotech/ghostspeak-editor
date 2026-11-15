// Encodes WAV as MP3 in the browser, so authors can upload what their
// recorder produced without shipping it to players at ten times the size.
import { Mp3Encoder } from "@breezystack/lamejs";
import { parseWav, readSamples } from "./wav.js";

// the sample rates an MP3 file can carry
const mp3Rates = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

// frames per encoder call: a multiple of the MP3 frame size, about a second
const block = 1152 * 40;

// encoding runs on the page's own thread; stepping aside between blocks keeps
// the page responsive
const nextTick = () => new Promise((resolve) => setTimeout(resolve));

// Returns the MP3 as a list of byte arrays, ready for `new Blob(parts)`.
// Throws a message for the author when the WAV cannot be converted.
export async function wavToMp3(buffer, { kbps = 128, pause = nextTick } = {}) {
  const info = parseWav(buffer);
  if (info.channels > 2)
    throw new Error(
      `這個 WAV 有 ${info.channels} 個聲道，請先轉成立體聲或 MP3 再上傳`
    );
  if (!mp3Rates.includes(info.sampleRate))
    throw new Error(
      `這個 WAV 的取樣率 ${info.sampleRate} Hz 無法轉成 MP3，請先轉成 44100 或 48000 Hz 再上傳`
    );
  const encoder = new Mp3Encoder(info.channels, info.sampleRate, kbps);
  const parts = [];
  for (let start = 0; start < info.frames; start += block) {
    const count = Math.min(block, info.frames - start);
    const [left, right] = readSamples(buffer, info, start, count);
    const encoded = encoder.encodeBuffer(left, right);
    if (encoded.length > 0) parts.push(new Uint8Array(encoded));
    await pause();
  }
  const rest = encoder.flush();
  if (rest.length > 0) parts.push(new Uint8Array(rest));
  return parts;
}
