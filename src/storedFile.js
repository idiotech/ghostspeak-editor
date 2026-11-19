// Which field of a stored file (an image, sound or map style) holds its file
// name, for a FileField's `title`: files uploaded through the editor keep it
// in `title`, older ones in `name`. A title that is not a field of the
// record is shown as written.
export function fileTitleSource(file) {
  if (file && file.title) return "title";
  if (file && file.name) return "name";
  return "檔案";
}
