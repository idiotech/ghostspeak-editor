// The pickers send what the author types as `q`; the Firebase provider can
// only match it against a field of the records.
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchByName } from "./searchByName.js";

test("typed text searches the names", () => {
  assert.deepEqual(searchByName({ filter: { q: "測試音" }, perPage: 1 }), {
    filter: { name: "測試音" },
    perPage: 1,
  });
});

test("other filters are kept", () => {
  assert.deepEqual(searchByName({ filter: { q: "a", hasMarker: true } }).filter, {
    hasMarker: true,
    name: "a",
  });
});

test("empty text searches nothing", () => {
  assert.deepEqual(searchByName({ filter: { q: "" } }).filter, {});
});

test("a name filter already given wins", () => {
  assert.deepEqual(searchByName({ filter: { q: "a", name: "b" } }).filter, {
    name: "b",
  });
});

test("params without a search are passed through untouched", () => {
  const params = { filter: { name: "x" } };
  assert.equal(searchByName(params), params);
  const none = { pagination: {} };
  assert.equal(searchByName(none), none);
});
