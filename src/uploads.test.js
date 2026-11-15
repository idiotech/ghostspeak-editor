// The upload inputs hand a validator { rawFile, src, title } for a newly
// picked file, and the stored { src, title } for a file already uploaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateImageFile,
  validateSoundFile,
  MAX_IMAGE_MB,
  MAX_SOUND_MB,
  isWav,
  isBmp,
  withExtension,
  shouldCompressImage,
  fitWithin,
  hasTransparency,
  MAX_IMAGE_SIDE,
  pickProblem,
  saveProblem,
} from "./uploads.js";

const picked = (type, megabytes) => ({
  rawFile: { type, size: megabytes * 1024 * 1024 },
  src: "blob:x",
  title: "x",
});

test("accepts an image within the limit", () => {
  assert.equal(validateImageFile(picked("image/png", 1)), undefined);
});

test("refuses a file that is not an image", () => {
  assert.equal(validateImageFile(picked("application/pdf", 1)), "請選擇圖片檔");
});

// GIF is uploaded as it is, so its size when picked is its size in Storage
test("refuses an image over the limit and says the limit", () => {
  assert.equal(
    validateImageFile(picked("image/gif", MAX_IMAGE_MB + 1)),
    `檔案太大（${MAX_IMAGE_MB + 1} MB），上限是 ${MAX_IMAGE_MB} MB`
  );
});

test("lets a large photo through, since it is compressed before upload", () => {
  assert.equal(validateImageFile(picked("image/jpeg", MAX_IMAGE_MB + 1)), undefined);
});

test("accepts a sound within the limit", () => {
  assert.equal(validateSoundFile(picked("audio/mpeg", 10)), undefined);
});

test("refuses a file that is not a sound", () => {
  assert.equal(validateSoundFile(picked("image/png", 1)), "請選擇聲音檔");
});

test("refuses a sound over the limit", () => {
  assert.match(validateSoundFile(picked("audio/mpeg", MAX_SOUND_MB + 1)), /檔案太大/);
});

test("accepts a file whose type the browser could not tell", () => {
  assert.equal(validateSoundFile(picked("", 1)), undefined);
});

test("leaves a file that is already uploaded alone", () => {
  assert.equal(validateImageFile({ src: "https://x/a.png", title: "a" }), undefined);
  assert.equal(validateImageFile(undefined), undefined);
});

// WAV and BMP are compressed when the record is saved, so their size on disk
// says nothing about what gets uploaded
test("lets a large WAV through, since it is compressed before upload", () => {
  const wav = { rawFile: { name: "walk.wav", type: "audio/wav", size: 300 * 1024 * 1024 } };
  assert.equal(validateSoundFile(wav), undefined);
});

test("lets a large BMP through, since it is compressed before upload", () => {
  const bmp = { rawFile: { name: "map.bmp", type: "image/bmp", size: 30 * 1024 * 1024 } };
  assert.equal(validateImageFile(bmp), undefined);
});

test("recognizes WAV by type or by name", () => {
  assert.equal(isWav({ name: "a.mp3", type: "audio/x-wav" }), true);
  assert.equal(isWav({ name: "A.WAV", type: "" }), true);
  assert.equal(isWav({ name: "a.mp3", type: "audio/mpeg" }), false);
});

test("recognizes BMP by type or by name", () => {
  assert.equal(isBmp({ name: "a", type: "image/bmp" }), true);
  assert.equal(isBmp({ name: "A.BMP", type: "" }), true);
  assert.equal(isBmp({ name: "a.png", type: "image/png" }), false);
});

test("swaps the extension of a file name", () => {
  assert.equal(withExtension("第一站.WAV", "mp3"), "第一站.mp3");
  assert.equal(withExtension("take.2.wav", "mp3"), "take.2.mp3");
  assert.equal(withExtension("noextension", "jpg"), "noextension.jpg");
});

const megabyte = 1024 * 1024;
const image = (type, size, name = "x") => ({ name, type, size });

test("compresses photos and drawings over 1 MB", () => {
  assert.equal(shouldCompressImage(image("image/jpeg", megabyte + 1)), true);
  assert.equal(shouldCompressImage(image("image/png", 3 * megabyte)), true);
  assert.equal(shouldCompressImage(image("image/webp", 3 * megabyte)), true);
});

test("leaves images of 1 MB or less alone", () => {
  assert.equal(shouldCompressImage(image("image/jpeg", megabyte)), false);
  assert.equal(shouldCompressImage(image("image/png", 20 * 1024)), false);
});

test("compresses a BMP whatever its size", () => {
  assert.equal(shouldCompressImage(image("image/bmp", 20 * 1024)), true);
});

test("leaves animations and vector drawings alone, which redrawing would ruin", () => {
  assert.equal(shouldCompressImage(image("image/gif", 3 * megabyte)), false);
  assert.equal(shouldCompressImage(image("image/svg+xml", 3 * megabyte)), false);
});

test("shrinks a large picture to fit the longest side, keeping its shape", () => {
  assert.deepEqual(fitWithin(4096, 3072, MAX_IMAGE_SIDE), { width: 2048, height: 1536 });
  assert.deepEqual(fitWithin(3000, 6000, MAX_IMAGE_SIDE), { width: 1024, height: 2048 });
});

test("never enlarges a picture", () => {
  assert.deepEqual(fitWithin(800, 600, MAX_IMAGE_SIDE), { width: 800, height: 600 });
});

test("spots a see-through pixel", () => {
  // two RGBA pixels
  assert.equal(hasTransparency([10, 20, 30, 255, 10, 20, 30, 254]), true);
  assert.equal(hasTransparency([10, 20, 30, 255, 0, 0, 0, 255]), false);
});

test("keeps at least one pixel on the short side of a very thin picture", () => {
  assert.deepEqual(fitWithin(8192, 1, MAX_IMAGE_SIDE), { width: 2048, height: 1 });
  assert.deepEqual(fitWithin(1, 8192, MAX_IMAGE_SIDE), { width: 1, height: 2048 });
});

// a file is only excused from the limit where it will actually be compressed
test("measures a WAV picked as an image, which nothing would compress", () => {
  const big = 300 * megabyte;
  assert.match(pickProblem("images", image("", big, "x.wav")), /檔案太大/);
  assert.match(pickProblem("sounds", image("", big, "x.bmp")), /檔案太大/);
});

test("still excuses a WAV picked as a sound and a BMP picked as an image", () => {
  const big = 300 * megabyte;
  assert.equal(pickProblem("sounds", image("", big, "x.wav")), undefined);
  assert.equal(pickProblem("images", image("", big, "x.bmp")), undefined);
});

// the last check before upload, whichever form the file came from
test("measures every file when it is saved", () => {
  assert.match(saveProblem("sounds", image("audio/mpeg", 200 * megabyte, "a.mp3")), /檔案太大/);
  assert.match(saveProblem("images", image("image/gif", 30 * megabyte, "a.gif")), /檔案太大/);
  assert.equal(saveProblem("sounds", image("audio/mpeg", megabyte, "a.mp3")), undefined);
});

test("refuses the wrong kind of file when it is saved", () => {
  assert.equal(saveProblem("images", image("application/pdf", 1000, "a.pdf")), "請選擇圖片檔");
  assert.equal(saveProblem("sounds", image("image/png", 1000, "a.png")), "請選擇聲音檔");
});

test("does not exempt a large photo from the limit once it has been compressed", () => {
  assert.match(saveProblem("images", image("image/jpeg", 6 * megabyte, "a.jpg")), /檔案太大/);
});
