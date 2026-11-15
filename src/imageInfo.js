// What the first bytes of an image file say about it, before the browser
// decodes it. `bytes` is a Uint8Array of the start of the file.

const startsWith = (bytes, at, text) =>
  bytes.length >= at + text.length &&
  [...text].every((c, i) => bytes[at + i] === c.charCodeAt(0));

const be16 = (b, at) => (b[at] << 8) | b[at + 1];
const be32 = (b, at) =>
  ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
const le16 = (b, at) => b[at] | (b[at + 1] << 8);
const le24 = (b, at) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);
const le32 = (b, at) =>
  (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;

const isPng = (b) => b.length >= 8 && b[0] === 0x89 && startsWith(b, 1, "PNG");
const isJpeg = (b) => b.length >= 2 && b[0] === 0xff && b[1] === 0xd8;
const isWebp = (b) => startsWith(b, 0, "RIFF") && startsWith(b, 8, "WEBP");

function jpegSize(b) {
  let at = 2;
  while (at + 4 <= b.length) {
    if (b[at] !== 0xff) return null;
    const marker = b[at + 1];
    // padding, and markers that stand alone
    if (marker === 0xff) at += 1;
    else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) at += 2;
    // the picture data starts here; the size comes before it
    else if (marker === 0xda) return null;
    else if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    )
      return at + 9 <= b.length
        ? { width: be16(b, at + 7), height: be16(b, at + 5) }
        : null;
    else at += 2 + be16(b, at + 2);
  }
  return null;
}

function webpSize(b) {
  if (startsWith(b, 12, "VP8X") && b.length >= 30)
    return { width: le24(b, 24) + 1, height: le24(b, 27) + 1 };
  if (
    startsWith(b, 12, "VP8 ") &&
    b.length >= 30 &&
    b[23] === 0x9d &&
    b[24] === 0x01 &&
    b[25] === 0x2a
  )
    return { width: le16(b, 26) & 0x3fff, height: le16(b, 28) & 0x3fff };
  if (startsWith(b, 12, "VP8L") && b.length >= 25 && b[20] === 0x2f) {
    const bits = le32(b, 21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

// The picture's size in pixels as stored (before any camera rotation), or
// null when the format is not PNG, JPEG or WebP or the size lies further in.
export function imageSize(bytes) {
  if (isPng(bytes))
    return bytes.length >= 24 && startsWith(bytes, 12, "IHDR")
      ? { width: be32(bytes, 16), height: be32(bytes, 20) }
      : null;
  if (isJpeg(bytes)) return jpegSize(bytes);
  if (isWebp(bytes)) return webpSize(bytes);
  return null;
}

// Whether a PNG or WebP is an animation, which redrawing would freeze on its
// first frame.
export function isAnimated(bytes) {
  if (isPng(bytes)) {
    // an animated PNG announces itself in a chunk before the picture data
    let at = 8;
    while (at + 8 <= bytes.length) {
      if (startsWith(bytes, at + 4, "acTL")) return true;
      if (startsWith(bytes, at + 4, "IDAT")) return false;
      at += 12 + be32(bytes, at);
    }
    return false;
  }
  if (isWebp(bytes))
    return startsWith(bytes, 12, "VP8X") && bytes.length > 20 && (bytes[20] & 0x02) !== 0;
  return false;
}
