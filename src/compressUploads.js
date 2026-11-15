// Compresses WAV, BMP and large image files in the browser before they are
// uploaded.
// Players download these files over mobile data, where an uncompressed
// recording is slow to arrive and can fail to play.
import {
  isBmp,
  withExtension,
  willConvert,
  saveProblem,
  fitWithin,
  hasTransparency,
  megabyte,
  MAX_IMAGE_SIDE,
  MAX_SOUND_MB,
} from "./uploads";
import { imageSize, isAnimated } from "./imageInfo";
import { fileSource } from "./wav";

// the field of each resource that holds the uploaded file
const fileFields = { images: "image", sounds: "sound" };

const jpegQuality = 0.85;

// enough of an image file to find its size and whether it is animated
const sniffBytes = 512 * 1024;

async function wavFileToMp3(file) {
  // the encoder is large and rarely needed, so it loads on first use
  const { wavToMp3 } = await import("./mp3");
  const parts = await wavToMp3(fileSource(file), {
    maxBytes: MAX_SOUND_MB * megabyte,
  });
  return new File(parts, withExtension(file.name, "mp3"), {
    type: "audio/mpeg",
  });
}

// Redraws an image no larger than MAX_IMAGE_SIDE: as PNG when it has
// see-through parts (map pins, logos), as JPEG otherwise. A BMP always comes
// back converted; any other image only when the result is smaller, and an
// animation never, since redrawing would freeze it.
async function compressImage(file) {
  const bmp = isBmp(file);
  const start = new Uint8Array(await file.slice(0, sniffBytes).arrayBuffer());
  if (!bmp && isAnimated(start)) return file;
  const stored = imageSize(start);
  const oversized =
    !!stored && Math.max(stored.width, stored.height) > MAX_IMAGE_SIDE;
  const options = { imageOrientation: "from-image" };
  if (oversized) {
    // Ask the browser to decode a large photo small, rather than hold all of
    // it in memory first. Only the longer side is given, so the shape is kept
    // whether or not the camera's rotation swaps the sides.
    const target = fitWithin(stored.width, stored.height, MAX_IMAGE_SIDE);
    if (stored.width >= stored.height) options.resizeWidth = target.width;
    else options.resizeHeight = target.height;
    options.resizeQuality = "high";
  }
  let bitmap;
  try {
    try {
      bitmap = await createImageBitmap(file, options);
    } catch (e) {
      if (!oversized) throw e;
      // some shapes cannot be decoded small (a strip a few pixels high);
      // decode those whole
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    }
  } catch (e) {
    if (bmp)
      throw new Error("無法轉換這張 BMP，請先轉成 JPG 或 PNG 再上傳", {
        cause: e,
      });
    // too large for this device to open: players' phones would fare no better
    if (oversized)
      throw new Error(
        `這張圖片太大（${stored.width}×${stored.height}），無法在瀏覽器裡壓縮，請先縮小到 ${MAX_IMAGE_SIDE} px 以內再上傳`,
        { cause: e }
      );
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
// compressed version; any other record comes back as it is. Throws a message
// for the author when the file is the wrong kind, cannot be converted, or is
// too large to upload.
export async function compressRecordFiles(resource, data) {
  const field = fileFields[resource];
  const value = field && data && data[field];
  const file = value && value.rawFile;
  if (!file) return data;
  let result = file;
  if (willConvert(resource, file))
    result =
      resource === "sounds"
        ? await wavFileToMp3(file)
        : await compressImage(file);
  // the last check before upload; the forms' own checks can be bypassed
  const problem = saveProblem(resource, result);
  if (problem) throw new Error(problem);
  if (result === file) return data;
  return {
    ...data,
    [field]: { ...value, rawFile: result, title: result.name },
  };
}
