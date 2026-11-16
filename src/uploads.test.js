// The upload inputs hand a validator { rawFile, src, title } for a newly
// picked file, and the stored { src, title } for a file already uploaded.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateImageFile,
  validateSoundFile,
  MAX_IMAGE_MB,
  MAX_SOUND_MB,
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

test("refuses an image over the limit and says the limit", () => {
  assert.equal(
    validateImageFile(picked("image/jpeg", MAX_IMAGE_MB + 1)),
    `檔案太大（${MAX_IMAGE_MB + 1} MB），上限是 ${MAX_IMAGE_MB} MB`
  );
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
