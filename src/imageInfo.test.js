// Read from the first bytes of a file, before the browser decodes it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAnimated, imageSize } from "./imageInfo.js";

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le32 = (n) => be32(n).reverse();
const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const bytes = (...parts) => new Uint8Array(parts.flat());

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const pngChunk = (type, body) => [...be32(body.length), ...ascii(type), ...body, 0, 0, 0, 0];
const ihdr = (w, h) => pngChunk("IHDR", [...be32(w), ...be32(h), 8, 6, 0, 0, 0]);

const png = (w, h, ...chunks) => bytes(pngSignature, ihdr(w, h), ...chunks);
const riff = (...chunks) => {
  const body = [...ascii("WEBP"), ...chunks.flat()];
  return bytes(ascii("RIFF"), le32(body.length), body);
};
const webpChunk = (type, body) => [...ascii(type), ...le32(body.length), ...body];
const vp8x = (flags, w, h) => webpChunk("VP8X", [flags, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)]);

test("reads the size of a PNG", () => {
  assert.deepEqual(imageSize(png(4000, 3000, pngChunk("IDAT", [1, 2]))), { width: 4000, height: 3000 });
});

test("reads the size of a JPEG, past the camera's own data", () => {
  const app1 = [0xff, 0xe1, 0, 6, 1, 2, 3, 4]; // EXIF
  const sof = [0xff, 0xc0, 0, 17, 8, 0x0b, 0xb8, 0x0f, 0xa0, 3]; // 3000 high, 4000 wide
  assert.deepEqual(imageSize(bytes([0xff, 0xd8], app1, sof)), { width: 4000, height: 3000 });
});

test("reads the size of a progressive JPEG", () => {
  const sof2 = [0xff, 0xc2, 0, 17, 8, 0, 100, 0, 200, 3];
  assert.deepEqual(imageSize(bytes([0xff, 0xd8], sof2)), { width: 200, height: 100 });
});

test("reads the size of an extended WebP", () => {
  assert.deepEqual(imageSize(riff(vp8x(0, 4000, 3000))), { width: 4000, height: 3000 });
});

test("reads the size of a plain lossy WebP", () => {
  const frame = [0, 0, 0, 0x9d, 0x01, 0x2a, 0xa0, 0x0f, 0xb8, 0x0b]; // 4000 x 3000
  assert.deepEqual(imageSize(riff(webpChunk("VP8 ", frame))), { width: 4000, height: 3000 });
});

test("reads the size of a lossless WebP", () => {
  // 14 bits of width-1, then 14 bits of height-1, after the 0x2f signature
  const packed = (4000 - 1) | ((3000 - 1) << 14);
  assert.deepEqual(imageSize(riff(webpChunk("VP8L", [0x2f, ...le32(packed)]))), { width: 4000, height: 3000 });
});

test("gives no size for a file it does not know", () => {
  assert.equal(imageSize(bytes(ascii("GIF89a"), [1, 2, 3, 4])), null);
  assert.equal(imageSize(new Uint8Array(0)), null);
  assert.equal(imageSize(bytes([0xff, 0xd8, 0xff, 0xe1, 0, 6, 1, 2])), null);
});

test("spots an animated PNG", () => {
  const apng = png(100, 100, pngChunk("acTL", [0, 0, 0, 2, 0, 0, 0, 0]), pngChunk("IDAT", [1]));
  assert.equal(isAnimated(apng), true);
});

test("takes a PNG without animation for a still", () => {
  assert.equal(isAnimated(png(100, 100, pngChunk("IDAT", [1]))), false);
});

test("is not fooled by the letters acTL inside the picture data", () => {
  assert.equal(isAnimated(png(100, 100, pngChunk("IDAT", ascii("xxacTLxx")))), false);
});

test("spots an animated WebP", () => {
  assert.equal(isAnimated(riff(vp8x(0x02, 100, 100))), true);
});

test("takes a WebP without the animation flag for a still", () => {
  assert.equal(isAnimated(riff(vp8x(0x10, 100, 100))), false);
  assert.equal(isAnimated(riff(webpChunk("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0]))), false);
});

test("takes a JPEG for a still", () => {
  assert.equal(isAnimated(bytes([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0, 1, 0, 1, 3])), false);
});
