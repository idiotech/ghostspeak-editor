// Reads "lat,lng" as pasted from a map app. Returns the two parts as the
// author typed them, or null when the text is not a pair of numbers.
export function parseLatLng(text) {
  const parts = String(text ?? "")
    .replace(/\s/g, "")
    .split(",");
  if (parts.length !== 2) return null;
  if (parts.some((part) => part === "" || isNaN(part))) return null;
  return { lat: parts[0], lon: parts[1] };
}
