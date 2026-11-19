// The browser's colour picker only knows #rrggbb; the app also takes
// #AARRGGBB, with the transparency first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { swatchColor, pickedColor } from "./colorValue.js";

test("a #rrggbb colour is shown as it is", () => {
  assert.equal(swatchColor("#C62828"), "#c62828");
});

test("a colour with transparency is shown without it", () => {
  assert.equal(swatchColor("#99203060"), "#203060");
});

test("a colour name is shown as its colour", () => {
  assert.equal(swatchColor("teal"), "#008080");
});

test("nothing or nonsense shows black", () => {
  assert.equal(swatchColor(""), "#000000");
  assert.equal(swatchColor(undefined), "#000000");
  assert.equal(swatchColor("#12"), "#000000");
});

test("picking keeps the transparency the colour had", () => {
  assert.equal(pickedColor("#99203060", "#ff0000"), "#99ff0000");
});

test("picking replaces a colour without transparency", () => {
  assert.equal(pickedColor("#203060", "#ff0000"), "#ff0000");
  assert.equal(pickedColor("", "#ff0000"), "#ff0000");
  assert.equal(pickedColor("teal", "#ff0000"), "#ff0000");
});
