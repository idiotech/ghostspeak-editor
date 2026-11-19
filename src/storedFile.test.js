// The link to a stored file shows the file's own name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileTitleSource } from "./storedFile.js";

test("a file uploaded through the editor is named by its title", () => {
  assert.equal(fileTitleSource({ src: "x", title: "tone.mp3" }), "title");
});

test("older files keep their name in `name`", () => {
  assert.equal(fileTitleSource({ src: "x", name: "default-marker.png" }), "name");
});

test("a file with neither shows a plain word", () => {
  assert.equal(fileTitleSource({ src: "x" }), "檔案");
  assert.equal(fileTitleSource(undefined), "檔案");
});
