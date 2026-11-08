// Firestore refuses to store undefined ("Unsupported field value: undefined"),
// and react-hook-form reports every input the record has no value for as
// undefined, so a form with an untouched optional field could not be saved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withoutUndefined } from "./utils.js";

test("drops undefined fields at every depth", () => {
  const data = {
    name: "score",
    description: undefined,
    prevs: [{ prev: "a1", userReply: undefined }, undefined],
    style: { color: undefined, size: 2 },
  };
  assert.deepEqual(withoutUndefined(data), {
    name: "score",
    prevs: [{ prev: "a1" }],
    style: { size: 2 },
  });
});

test("keeps every other empty-looking value", () => {
  const when = new Date("2026-11-01T10:00:00Z");
  const data = { a: null, b: "", c: 0, d: false, e: [], f: {}, g: when };
  const result = withoutUndefined(data);
  assert.deepEqual(result, data);
  assert.equal(result.g, when);
});

test("leaves the submitted data untouched", () => {
  const data = { description: undefined, list: [{ x: undefined }] };
  withoutUndefined(data);
  assert.ok("description" in data);
  assert.ok("x" in data.list[0]);
});

test("hands class instances such as uploads to Firebase intact", () => {
  class FakeFile {
    constructor() {
      this.name = "a.png";
    }
  }
  const file = new FakeFile();
  const result = withoutUndefined({ image: { rawFile: file, src: undefined } });
  assert.equal(result.image.rawFile, file);
  assert.ok(!("src" in result.image));
});

test("passes non-objects through", () => {
  assert.equal(withoutUndefined(undefined), undefined);
  assert.equal(withoutUndefined("x"), "x");
});
