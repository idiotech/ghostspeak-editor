// Limits for uploaded files. Players download these over mobile data, and
// Storage keeps whatever is uploaded.
export const MAX_IMAGE_MB = 5;
export const MAX_SOUND_MB = 50;

export const megabyte = 1024 * 1024;

export const tooLarge = (bytes, maxMegabytes) =>
  `檔案太大（${Math.ceil(bytes / megabyte)} MB），上限是 ${maxMegabytes} MB`;

// uncompressed formats, which are converted before upload
const wavTypes = ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"];
const bmpTypes = ["image/bmp", "image/x-ms-bmp"];

export const isWav = (file) =>
  wavTypes.includes(file.type) || /\.wav$/i.test(file.name || "");

export const isBmp = (file) =>
  bmpTypes.includes(file.type) || /\.bmp$/i.test(file.name || "");

// images over this size are redrawn smaller before upload
const COMPRESS_IMAGE_OVER = megabyte;
// the longest side a compressed image keeps; wider than any phone screen
export const MAX_IMAGE_SIDE = 2048;

// formats that survive being redrawn: an animated GIF would lose its
// animation and an SVG its sharpness
const redrawableTypes = ["image/jpeg", "image/png", "image/webp"];

// whether an image is compressed before upload
export const shouldCompressImage = (file) =>
  isBmp(file) ||
  (redrawableTypes.includes(file.type) && file.size > COMPRESS_IMAGE_OVER);

// the size that fits `max` on the longest side without enlarging
export function fitWithin(width, height, max) {
  const scale = Math.min(1, max / Math.max(width, height));
  // a very thin picture keeps at least one pixel on its short side
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// whether any pixel of RGBA data is see-through
export function hasTransparency(rgba) {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 255) return true;
  return false;
}

// "第一站.WAV" with "mp3" gives "第一站.mp3"
export const withExtension = (name, extension) =>
  name.replace(/\.[^.]*$/, "") + "." + extension;

// what each resource accepts
const rules = {
  images: { typePrefix: "image/", wrongType: "請選擇圖片檔", maxMegabytes: MAX_IMAGE_MB },
  sounds: { typePrefix: "audio/", wrongType: "請選擇聲音檔", maxMegabytes: MAX_SOUND_MB },
};

// whether saving a record of `resource` compresses this file first
export const willConvert = (resource, file) =>
  resource === "sounds"
    ? isWav(file)
    : resource === "images"
    ? shouldCompressImage(file)
    : false;

function typeProblem(resource, file) {
  const { typePrefix, wrongType } = rules[resource];
  // some browsers cannot tell the type of less common files; let those through
  return file.type && !file.type.startsWith(typePrefix) ? wrongType : undefined;
}

function sizeProblem(resource, file) {
  const { maxMegabytes } = rules[resource];
  return file.size > maxMegabytes * megabyte
    ? tooLarge(file.size, maxMegabytes)
    : undefined;
}

// What is wrong with a file as the author picks it. A file that will be
// compressed is not measured yet: the limit applies to the result.
export function pickProblem(resource, file) {
  return (
    typeProblem(resource, file) ||
    (willConvert(resource, file) ? undefined : sizeProblem(resource, file))
  );
}

// What is wrong with a file about to be uploaded, after any compression.
// Every upload passes through here, whichever form it came from.
export function saveProblem(resource, file) {
  return typeProblem(resource, file) || sizeProblem(resource, file);
}

// Form validators. `value` is what react-admin's file inputs hold:
// { rawFile, src, title } for a newly picked file, the stored { src, title }
// for one already uploaded.
export const validateImageFile = (value) =>
  value && value.rawFile ? pickProblem("images", value.rawFile) : undefined;

export const validateSoundFile = (value) =>
  value && value.rawFile ? pickProblem("sounds", value.rawFile) : undefined;
