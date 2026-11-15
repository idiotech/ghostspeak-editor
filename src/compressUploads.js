// Compresses WAV and BMP files in the browser before they are uploaded.
// Players download these files over mobile data, where an uncompressed
// recording is slow to arrive and can fail to play.
import {
  isWav,
  isBmp,
  withExtension,
  validateImageFile,
  validateSoundFile,
} from "./uploads";

// the field holding the uploaded file, and the limit its result must meet
const uploads = {
  images: { field: "image", validate: validateImageFile },
  sounds: { field: "sound", validate: validateSoundFile },
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

async function bmpFileToJpeg(file) {
  const failed = "無法轉換這張 BMP，請先轉成 JPG 或 PNG 再上傳";
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    throw new Error(failed, { cause: e });
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  // JPEG has no transparency; anything see-through becomes white, not black
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", jpegQuality)
  );
  if (!blob) throw new Error(failed);
  return new File([blob], withExtension(file.name, "jpg"), {
    type: "image/jpeg",
  });
}

// The record with a newly picked WAV or BMP replaced by its compressed
// version; any other record comes back as it is. Throws a message for the
// author when the file cannot be converted or is still too large.
export async function compressRecordFiles(resource, data) {
  const upload = uploads[resource];
  const value = upload && data && data[upload.field];
  const file = value && value.rawFile;
  if (!file) return data;
  const convert = isWav(file) ? wavFileToMp3 : isBmp(file) ? bmpFileToJpeg : null;
  if (!convert) return data;
  const compressed = await convert(file);
  const problem = upload.validate({ rawFile: compressed });
  if (problem) throw new Error(problem);
  return {
    ...data,
    [upload.field]: { ...value, rawFile: compressed, title: compressed.name },
  };
}
