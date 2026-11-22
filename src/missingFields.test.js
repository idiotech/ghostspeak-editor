// Publishing and broadcasting refuse a record whose fields the server needs
// are empty, and say which ones, instead of the server's decoding error.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findMissingFields,
  findMissingVariableFields,
  describeMissingFields,
} from "./missingFields.js";

test("a complete action has nothing missing", () => {
  assert.deepEqual(
    findMissingFields({
      name: "a",
      prevs: [{ prev: "s", conditionType: "TEXT", userReply: "好" }],
      hasPopup: true,
    }),
    []
  );
});

test("button and popup styles need their colours", () => {
  assert.deepEqual(findMissingFields({ hasButtonStyle: true, textColor: "#fff" }), [
    "按鈕背景顏色",
  ]);
  assert.deepEqual(findMissingFields({ hasPopupStyle: true, alertTextColor: "" }), [
    "提示文字顏色",
  ]);
});

test("stopping a sound needs the sound and how long it fades out", () => {
  assert.deepEqual(findMissingFields({ hasSilence: true }), ["停止的聲音", "淡出秒數"]);
  // fading out in no time is a value
  assert.deepEqual(
    findMissingFields({ hasSilence: true, silencedSound: "x", forceFadeOutSeconds: 0 }),
    []
  );
});

test("each extra condition needs its variable, comparison and value", () => {
  assert.deepEqual(
    findMissingFields({
      preconditions: [{ variable: "v", comparison: ">=", value: 0 }, {}],
    }),
    ["第2個附加條件的變數", "第2個附加條件的比較", "第2個附加條件的數值"]
  );
});

test("each variable update needs its variable, operation and value", () => {
  assert.deepEqual(
    findMissingFields({
      hasVariableUpdate: true,
      variableUpdates: [{ variable: "v", operation: "+" }],
    }),
    ["第1個變數更新的數值"]
  );
});

test("calls, markers and marker removals need what the server reads", () => {
  assert.deepEqual(findMissingFields({ hasIncomingCall: true, callStatus: "" }), [
    "來電人",
    "來電狀態",
  ]);
  assert.deepEqual(findMissingFields({ hasHangUp: true }), ["來電人"]);
  assert.deepEqual(findMissingFields({ hasMarker: true }), ["圖釘標題"]);
  assert.deepEqual(findMissingFields({ hasMarkerRemoval: true }), ["要移除的圖釘"]);
});

test("a sound's volume setting needs the fields of its mode", () => {
  assert.deepEqual(findMissingFields({ hasSound: true, mode: "DYNAMIC_VOLUME" }), [
    "聲音中心點",
    "最小音量",
  ]);
  assert.deepEqual(
    findMissingFields({
      hasSound: true,
      mode: "BEACON_VOLUME",
      beaconForSound: "b",
      beaconMinValue: 0,
    }),
    ["Beacon最大值", "Beacon最小音量"]
  );
  assert.deepEqual(findMissingFields({ hasSound: true }), []);
});

test("a previous step's condition needs the fields of its kind", () => {
  assert.deepEqual(
    findMissingFields({
      prevs: [
        { prev: "s", conditionType: "TEXT" },
        { prev: "s", conditionType: "TEXT", fallback: true },
        { prev: "s", conditionType: "GEOFENCE" },
        { prev: "s", conditionType: "BEACON", beacon: "b" },
      ],
    }),
    ["第1個前一步的回應文字", "第3個前一步的地點", "第4個前一步的Beacon門檻", "第4個前一步的Beacon進出"]
  );
});

test("the initial action's leftover previous steps are not published", () => {
  assert.deepEqual(
    findMissingFields({ firstAction: true, prevs: [{ conditionType: "TEXT" }] }),
    []
  );
});

test("a broadcast's own trigger needs the fields of its kind", () => {
  const broadcast = { broadcast: true };
  assert.deepEqual(findMissingFields({ conditionType: "GEOFENCE" }, broadcast), ["地點"]);
  assert.deepEqual(findMissingFields({ conditionType: "ALWAYS" }, broadcast), []);
  // an action is triggered by its previous steps only
  assert.deepEqual(findMissingFields({ conditionType: "GEOFENCE" }), []);
});

test("a variable needs a name and a starting value", () => {
  assert.deepEqual(findMissingVariableFields({ name: "分數", value: 0 }), []);
  assert.deepEqual(findMissingVariableFields({ name: "" }), ["名稱", "初始值"]);
});

test("describes each record with missing fields on one line", () => {
  const records = [
    { name: "開場", hasButtonStyle: true },
    { name: "結尾" },
  ];
  assert.deepEqual(describeMissingFields(records, (r) => findMissingFields(r)), [
    "「開場」：按鈕背景顏色、按鈕文字顏色",
  ]);
});
