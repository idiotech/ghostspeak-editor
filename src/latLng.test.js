// Authors paste coordinates from map apps, which put spaces in various places.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLatLng } from "./latLng.js";

test("reads a pasted pair", () => {
  assert.deepEqual(parseLatLng("25.0478,121.5319"), {
    lat: "25.0478",
    lon: "121.5319",
  });
});

test("drops every space, not only the first", () => {
  assert.deepEqual(parseLatLng(" 25.0478 , 121.5319 "), {
    lat: "25.0478",
    lon: "121.5319",
  });
});

test("rejects text that is not a pair of numbers", () => {
  assert.equal(parseLatLng("25.0478"), null);
  assert.equal(parseLatLng("25.0478,abc"), null);
  assert.equal(parseLatLng(","), null);
  assert.equal(parseLatLng("25.0478,"), null);
});
