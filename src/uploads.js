// Limits for uploaded files. Players download these over mobile data, and
// Storage keeps whatever is uploaded.
export const MAX_IMAGE_MB = 5;
export const MAX_SOUND_MB = 50;

const megabyte = 1024 * 1024;

// uncompressed formats, which are converted before upload
const wavTypes = ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"];
const bmpTypes = ["image/bmp", "image/x-ms-bmp"];

export const isWav = (file) =>
  wavTypes.includes(file.type) || /\.wav$/i.test(file.name || "");

export const isBmp = (file) =>
  bmpTypes.includes(file.type) || /\.bmp$/i.test(file.name || "");

// "第一站.WAV" with "mp3" gives "第一站.mp3"
export const withExtension = (name, extension) =>
  name.replace(/\.[^.]*$/, "") + "." + extension;

// `value` is what react-admin's file inputs hold: { rawFile, src, title } for
// a newly picked file, the stored { src, title } for one already uploaded
function validateFile(value, typePrefix, wrongType, maxMegabytes) {
  const file = value && value.rawFile;
  if (!file) return undefined;
  // some browsers cannot tell the type of less common files; let those through
  if (file.type && !file.type.startsWith(typePrefix)) return wrongType;
  // WAV and BMP shrink when the record is saved; the limit applies to the result
  if (isWav(file) || isBmp(file)) return undefined;
  if (file.size > maxMegabytes * megabyte) {
    const size = Math.ceil(file.size / megabyte);
    return `檔案太大（${size} MB），上限是 ${maxMegabytes} MB`;
  }
  return undefined;
}

export const validateImageFile = (value) =>
  validateFile(value, "image/", "請選擇圖片檔", MAX_IMAGE_MB);

export const validateSoundFile = (value) =>
  validateFile(value, "audio/", "請選擇聲音檔", MAX_SOUND_MB);
