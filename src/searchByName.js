// react-admin's pickers send the text an author types as `q`. The Firebase
// provider matches each filter against a field of the records, and none is
// called `q`, so every search came back empty. Every picker shows records by
// their `name`, so the text searches that (case-insensitively, anywhere in
// the name).
export function searchByName(params) {
  const filter = params && params.filter;
  if (!filter || !("q" in filter)) return params;
  const { q, ...rest } = filter;
  const text = typeof q === "string" ? q.trim() : q;
  return {
    ...params,
    filter: text && !("name" in rest) ? { ...rest, name: text } : rest,
  };
}
