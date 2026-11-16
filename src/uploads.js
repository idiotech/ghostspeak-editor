// Limits for uploaded files. Players download these over mobile data, and
// Storage keeps whatever is uploaded.
export const MAX_IMAGE_MB = 5;
export const MAX_SOUND_MB = 50;

const megabyte = 1024 * 1024;

// `value` is what react-admin's file inputs hold: { rawFile, src, title } for
// a newly picked file, the stored { src, title } for one already uploaded
function validateFile(value, typePrefix, wrongType, maxMegabytes) {
  const file = value && value.rawFile;
  if (!file) return undefined;
  // some browsers cannot tell the type of less common files; let those through
  if (file.type && !file.type.startsWith(typePrefix)) return wrongType;
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
