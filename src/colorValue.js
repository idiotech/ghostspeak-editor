// The browser's colour picker only takes #rrggbb; the app also reads
// #AARRGGBB (transparency first) and colour names.
import { cssColor } from "./phoneStyles.js";

// the colour the picker shows for a stored value, without its transparency
export function swatchColor(value) {
  const css = cssColor(value);
  return css ? css.slice(0, 7).toLowerCase() : "#000000";
}

// the value to store after picking `picked` (#rrggbb): a colour that had
// transparency keeps it
export function pickedColor(value, picked) {
  const text = typeof value === "string" ? value.trim() : "";
  const argb = /^#([0-9a-f]{2})[0-9a-f]{6}$/i.exec(text);
  return argb ? `#${argb[1]}${picked.slice(1)}` : picked;
}
