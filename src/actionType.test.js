// A next step waits for its previous action's main content; the published
// trigger names that content, so a wrong main type waits for the wrong thing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getMainType, getPrevId, hasDelay } from "./actionType.js";

test("a popup the player answers by typing is a dialog, even with a main sound", () => {
  const action = {
    id: "a1",
    hasSound: true,
    hasPopup: true,
    destinations: ["ALERT"],
    allowTextReply: true,
  };
  assert.equal(getMainType(action), "dialog");
  assert.equal(getPrevId(action), "a1-popup");
});

test("a typed reply left switched on behind 不需用戶回應 does not make a dialog", () => {
  const action = {
    id: "a1",
    hasSound: true,
    hasPopup: true,
    destinations: ["ALERT"],
    allowTextReply: true,
    allowNoReply: true,
  };
  assert.equal(getMainType(action), "sound");
});

test("a popup with neither buttons nor typed reply follows its main sound", () => {
  const action = { id: "a1", hasSound: true, hasPopup: true, destinations: ["ALERT"] };
  assert.equal(getMainType(action), "sound");
});

// one case per content type whose delay the list used to miss
for (const [flag, prefix] of [
  ["hasMarkerRemoval", "markerRemoval"],
  ["hasPopupDismissal", "dismissal"],
  ["hasGuideImageRemoval", "guideImageRemoval"],
  ["hasSilence", "silence"],
  ["hasPopupStyle", "popupStyle"],
  ["endgame", "endgame"],
]) {
  test(`reports the delay of ${flag}`, () => {
    assert.equal(hasDelay({ [flag]: true, [prefix + "Delay"]: 500 }), true);
  });
}

test("reports a delay set through 進階時間控制", () => {
  assert.equal(hasDelay({ hasSound: true, soundDelayMinute: 2 }), true);
  assert.equal(hasDelay({ hasPopup: true, popupTime: "18:30" }), true);
});

test("ignores a delay left on content that is switched off", () => {
  assert.equal(hasDelay({ hasSound: false, soundDelay: 500 }), false);
});

test("reports no delay when none is set", () => {
  assert.equal(hasDelay({ hasSound: true, hasPopup: true, soundDelay: 0 }), false);
});
