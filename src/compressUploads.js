// Compresses WAV, BMP and large image files in the browser before they are
// uploaded.
// Players download these files over mobile data, where an uncompressed
// recording is slow to arrive and can fail to play.
import {
  isWav,
  isBmp,
  withExtension,
  shouldCompressImage,
  fitWithin,
  hasTransparency,
  tooLarge,
  megabyte,
  MAX_IMAGE_SIDE,
  MAX_IMAGE_MB,
  MAX_SOUND_MB,
} from "./uploads";

// the field holding the uploaded file, and the limit its result must meet
const uploads = {
  images: { field: "image", maxMegabytes: MAX_IMAGE_MB },
  sounds: { field: "sound", maxMegabytes: MAX_SOUND_MB },
};

const jpegQuality = 0.85;

async function wavFileToMp3(file) {
  // the encoder is large and rarely needed, so it loads on first use
  const { wavToMp3 } = await import("./mp3");
  const parts = await wavToMp3(await file.arrayBuffer());
  return new File(parts, withExtension(file.name, "mp3"), {
    type: "audio/mpeg",
  });
}

// Redraws an image no larger than MAX_IMAGE_SIDE: as PNG when it has
// see-through parts (map pins, logos), as JPEG otherwise. A BMP always comes
// back converted; any other image only when the result is smaller.
async function compressImage(file) {
  const bmp = isBmp(file);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    if (bmp)
      throw new Error("無法轉換這張 BMP，請先轉成 JPG 或 PNG 再上傳", {
        cause: e,
      });
    // a format this browser cannot draw is uploaded as it is
    return file;
  }
  const canvas = document.createElement("canvas");
  const size = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_SIDE);
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  // JPEG and BMP carry no transparency worth keeping
  const seeThrough =
    !bmp &&
    file.type !== "image/jpeg" &&
    hasTransparency(
      context.getImageData(0, 0, size.width, size.height).data
    );
  if (!seeThrough) {
    // paint white behind the picture, so stray see-through pixels do not
    // turn black in the JPEG
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
  }
  const [type, extension] = seeThrough
    ? ["image/png", "png"]
    : ["image/jpeg", "jpg"];
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, type, jpegQuality)
  );
  if (!blob) {
    if (bmp) throw new Error("無法轉換這張 BMP，請先轉成 JPG 或 PNG 再上傳");
    return file;
  }
  if (!bmp && blob.size >= file.size) return file;
  return new File([blob], withExtension(file.name, extension), { type });
}

// The record with a newly picked WAV, BMP or large image replaced by its
// compressed version; any other record comes back as it is. Throws a message for the
// author when the file cannot be converted or is still too large.
export async function compressRecordFiles(resource, data) {
  const upload = uploads[resource];
  const value = upload && data && data[upload.field];
  const file = value && value.rawFile;
  if (!file) return data;
  const convert =
    resource === "sounds" && isWav(file)
      ? wavFileToMp3
      : resource === "images" && shouldCompressImage(file)
      ? compressImage
      : null;
  if (!convert) return data;
  const compressed = await convert(file);
  // the pick-time check let this file through unmeasured
  if (compressed.size > upload.maxMegabytes * megabyte)
    throw new Error(tooLarge(compressed.size, upload.maxMegabytes));
  if (compressed === file) return data;
  return {
    ...data,
    [upload.field]: { ...value, rawFile: compressed, title: compressed.name },
  };
}
