// A WAV is roughly 10 MB per minute; the app downloads it over mobile data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { wavToMp3 } from "./mp3.js";
import { bufferSource } from "./wav.js";
import { makeWav, tone } from "./wavFixture.js";

async function bytes(parts) {
  return new Uint8Array(await new Blob(parts).arrayBuffer());
}

test("turns a stereo WAV into MP3 at about 128 kbps", async () => {
  const wav = makeWav({ samples: tone({ seconds: 2 }) });
  const mp3 = await bytes(await wavToMp3(bufferSource(wav)));
  // an MPEG audio frame starts with eleven set bits
  assert.equal(mp3[0], 0xff);
  assert.equal(mp3[1] & 0xe0, 0xe0);
  // 2 s at 128 kbps is 32 kB; the WAV is 353 kB
  assert.ok(mp3.length > 28000 && mp3.length < 40000, `got ${mp3.length} bytes`);
});

test("turns a mono WAV into MP3", async () => {
  const wav = makeWav({ channels: 1, samples: tone({ seconds: 1, channels: 1 }) });
  const mp3 = await bytes(await wavToMp3(bufferSource(wav)));
  assert.equal(mp3[0], 0xff);
  assert.ok(mp3.length > 5000, `got ${mp3.length} bytes`);
});

test("lets the page breathe while it encodes a long file", async () => {
  const wav = makeWav({ channels: 1, samples: tone({ seconds: 3, channels: 1 }) });
  let pauses = 0;
  await wavToMp3(bufferSource(wav), { pause: async () => pauses++ });
  assert.ok(pauses >= 2, `paused ${pauses} times`);
});

test("refuses a sample rate MP3 cannot hold", async () => {
  const wav = makeWav({ sampleRate: 96000, samples: [0, 0] });
  await assert.rejects(wavToMp3(bufferSource(wav)), /取樣率 96000 Hz/);
});

test("refuses more than two channels", async () => {
  const wav = makeWav({ channels: 6, samples: [0, 0, 0, 0, 0, 0] });
  await assert.rejects(wavToMp3(bufferSource(wav)), /聲道/);
});

test("encodes without ever holding more than a block of the WAV", async () => {
  const wav = makeWav({ samples: tone({ seconds: 5 }) });
  const source = bufferSource(wav);
  let largest = 0;
  const watching = {
    size: source.size,
    read: (start, end) => {
      largest = Math.max(largest, end - start);
      return source.read(start, end);
    },
  };
  await wavToMp3(watching);
  // one block is about a second of audio; the file is five
  assert.ok(largest < wav.byteLength / 4, `read ${largest} of ${wav.byteLength} bytes at once`);
});

test("refuses up front a recording whose MP3 would be over the limit", async () => {
  // 10 s at 128 kbps is 160 kB
  const wav = makeWav({ channels: 1, samples: tone({ seconds: 10, channels: 1 }) });
  let reads = 0;
  const source = bufferSource(wav);
  const counting = { size: source.size, read: (s, e) => (reads++, source.read(s, e)) };
  await assert.rejects(
    wavToMp3(counting, { maxBytes: 100 * 1000 }),
    /這段錄音長 10 秒，轉成 MP3 後仍超過上限/
  );
  assert.ok(reads < 10, `read ${reads} times before refusing`);
});
