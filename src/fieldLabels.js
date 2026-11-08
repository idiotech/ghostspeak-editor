// Names a form field for the author by the label beside its input, read from
// the page itself so every input is covered without a separate list of labels.
// Works without a page too (tests, or an error after the form has gone), by
// falling back to the field's path.

export function findField(path) {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector(`[name="${path}"]`) ||
    document.getElementsByClassName("ra-input-" + path)[0] ||
    null
  );
}

function labelOf(element) {
  const control = element?.closest(".MuiFormControl-root");
  const label = control?.querySelector("label, legend");
  return label ? label.textContent.replace(/\s*\*\s*$/, "").trim() : "";
}

// "前一步 第1項的「文字」" for prevs.0.userReply, "「名稱」" for name
export function describePath(path) {
  const element = findField(path);
  const own = labelOf(element) || path;
  const parts = path.split(".");
  const index = parts.findIndex((p) => /^\d+$/.test(p));
  if (index > 0 && typeof document !== "undefined") {
    const listPath = parts.slice(0, index).join(".");
    const list = document
      .getElementsByClassName("ra-input-" + listPath)[0]
      ?.querySelector(".RaArrayInput-label")
      ?.textContent.trim();
    if (list) return `${list} 第${Number(parts[index]) + 1}項的「${own}」`;
  }
  return `「${own}」`;
}
