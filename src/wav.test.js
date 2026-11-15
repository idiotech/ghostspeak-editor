// WAV files reach the editor from many recorders: 16 and 24 bit, float,
// mono and stereo, with extra chunks before the audio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWav, readSamples } from "./wav.js";
import { makeWav } from "./wavFixture.js";

test("reads the format of a 16-bit stereo file", () => {
  const wav = makeWav({ samples: [0, 0, 0.5, -0.5] });
  const info = parseWav(wav);
  assert.equal(info.channels, 2);
  assert.equal(info.sampleRate, 44100);
  assert.equal(info.frames, 2);
});

test("splits interleaved samples into one array per channel", () => {
  const wav = makeWav({ samples: [0.5, -0.5, 0.25, -0.25] });
  const [left, right] = readSamples(wav, parseWav(wav), 0, 2);
  assert.deepEqual([...left], [16384, 8192]);
  assert.deepEqual([...right], [-16384, -8192]);
});

test("reads from the middle of the file", () => {
  const wav = makeWav({ channels: 1, samples: [0, 0.5, -0.5, 0] });
  const [mono] = readSamples(wav, parseWav(wav), 1, 2);
  assert.deepEqual([...mono], [16384, -16384]);
});

test("finds the audio after other chunks", () => {
  const wav = makeWav({ channels: 1, samples: [0.5], extraChunk: true });
  const [mono] = readSamples(wav, parseWav(wav), 0, 1);
  assert.deepEqual([...mono], [16384]);
});

for (const [name, options] of [
  ["8-bit", { bits: 8 }],
  ["24-bit", { bits: 24 }],
  ["32-bit", { bits: 32 }],
  ["float", { bits: 32, format: 3 }],
]) {
  test(`scales ${name} samples to 16 bits`, () => {
    const wav = makeWav({ channels: 1, samples: [0.5, -0.5], ...options });
    const [mono] = readSamples(wav, parseWav(wav), 0, 2);
    // 8-bit audio is coarse; the others land within a step
    const tolerance = options.bits === 8 ? 200 : 2;
    assert.ok(Math.abs(mono[0] - 16384) <= tolerance, `got ${mono[0]}`);
    assert.ok(Math.abs(mono[1] + 16384) <= tolerance, `got ${mono[1]}`);
  });
}

test("clips float samples louder than full scale", () => {
  const wav = makeWav({ channels: 1, bits: 32, format: 3, samples: [2, -2] });
  const [mono] = readSamples(wav, parseWav(wav), 0, 2);
  assert.deepEqual([...mono], [32767, -32768]);
});

test("refuses a file that is not WAV", () => {
  const notWav = new TextEncoder().encode("ID3 this is an mp3 in disguise ....").buffer;
  assert.throws(() => parseWav(notWav), /不是有效的 WAV 檔/);
});

test("refuses WAV that is already compressed", () => {
  const adpcm = makeWav({ format: 2, samples: [0, 0] });
  assert.throws(() => parseWav(adpcm), /不支援這種 WAV 編碼/);
});
