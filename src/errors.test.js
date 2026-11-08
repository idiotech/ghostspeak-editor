// Pins the Ghostspeak server's error text as the editor understands it. The
// server (ghostspeak-agent) answers a bad publish with a 500 whose body is
// "invalid scenario: invalid template: " + circe 0.14's DecodingFailure
// message; if that format ever changes, these tests say so before an author
// sees a raw error.
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeError, describeResponse, describeTemplateFailure } from "./errors.js";

const template = [
  {
    name: "initial",
    performances: [
      { action: { id: "a0-popup", content: { task: { type: "POPUP" } }, description: "開場" } },
      { action: { id: "friend-1", content: { task: { type: "FRIEND" } } } },
    ],
  },
  {
    name: "a1",
    performances: [
      { action: { id: "a1-sound", content: { task: { type: "SOUND" } } } },
      { action: { id: "a1-marker", content: { task: { type: "MARKER" } } } },
      { action: { id: "a1-mystery" } },
    ],
    triggers: [{}],
  },
];
const actions = { a1: { id: "a1", name: "找到鑰匙" } };
const context = { request: "publish", method: "PUT", scenarioId: "s1", template, actions };
const invalid = (circe) => "invalid scenario: invalid template: " + circe;

function reply(status, body, type = "text/plain; charset=UTF-8") {
  return new Response(body, {
    status,
    statusText: "Internal Server Error",
    headers: { "content-type": type },
  });
}

// describeResponse logs through console.error; keep the test output clean
// and capture the record
let logged = [];
console.error = (...args) => logged.push(args);

const describe = (status, body, ctx = context) => describeResponse(reply(status, body), ctx);

test("a missing field is pinned to the action, the effect and the field", async () => {
  assert.equal(
    await describe(500, invalid("DecodingFailure at .[1].performances[1].action.content.task.title: Missing required field")),
    "動作「找到鑰匙」的地圖標記（MARKER）效果缺少必要欄位「title」。請修正這個動作後再發佈"
  );
});

test("a path without the leading dot and a wrong type are understood", async () => {
  assert.equal(
    await describe(500, invalid("DecodingFailure at [0].performances[0].action.content.task.text: Got value 'null' with wrong type, expecting string")),
    "動作「初始動作」的對話框（POPUP）效果欄位「text」的值不對：需要 string，但給的是 null。請修正這個動作後再發佈"
  );
});

test("an effect the editor added itself is marked as such", async () => {
  assert.equal(
    await describe(500, invalid("DecodingFailure at .[0].performances[1].action.content.task.icon: Missing required field")),
    "動作「初始動作」的好友（FRIEND）效果（由編輯器自動加入，請回報給開發者）缺少必要欄位「icon」。請修正這個動作後再發佈"
  );
});

test("an effect with no task type falls back to its position", async () => {
  assert.equal(
    await describe(500, invalid("DecodingFailure at .[1].performances[2].action.content: Missing required field")),
    "動作「找到鑰匙」的第 3 個效果缺少必要欄位「content」。請修正這個動作後再發佈"
  );
});

test("a value the server does not know is reported with the server's words", async () => {
  assert.equal(
    await describe(500, invalid("DecodingFailure at .[1].triggers[0].payload.type: type FOO not found in [TEXT, GEOFENCE]")),
    "動作「找到鑰匙」的第 1 個觸發條件欄位「type」的值伺服器不認得：type FOO not found in [TEXT, GEOFENCE]。請修正這個動作後再發佈"
  );
});

test("an apostrophe inside the offending value does not cut it short", () => {
  assert.equal(
    describeTemplateFailure(
      `DecodingFailure at .[1].performances[0].action.delay: Got value '"Don't go"' with wrong type, expecting Int`,
      template,
      actions
    ),
    `動作「找到鑰匙」的聲音（SOUND）效果欄位「delay」的值不對：需要 Int，但給的是 "Don't go"。請修正這個動作後再發佈`
  );
});

test("a huge offending value and a long raw reason are clipped", () => {
  const blob = "x".repeat(5000);
  const clippedValue = describeTemplateFailure(
    `DecodingFailure at .[1].performances[0].action: Got value '${blob}' with wrong type, expecting object`,
    template,
    actions
  );
  assert.ok(clippedValue.length < 200, clippedValue.length);
  assert.ok(clippedValue.includes("…"));
  const clippedRaw = describeTemplateFailure(blob, template, actions);
  assert.ok(clippedRaw.length <= 420, clippedRaw.length);
});

test("a path rooted at the request body or at the metadata is still located", () => {
  assert.equal(
    describeTemplateFailure("DecodingFailure at .template[1].performances[0].action.content.task.url: Missing required field", template, actions),
    "動作「找到鑰匙」的聲音（SOUND）效果缺少必要欄位「url」。請修正這個動作後再發佈"
  );
  assert.equal(
    describeTemplateFailure("DecodingFailure at .metadata.name: Missing required field", template, actions),
    "劇本設定的「name」缺少必要欄位「name」。請修正劇本設定後再發佈"
  );
});

test("a node outside the template falls back to the raw path", () => {
  assert.equal(
    describeTemplateFailure("DecodingFailure at .[7].name: Missing required field", template, actions),
    "劇本資料的 .[7].name 缺少必要欄位「name」"
  );
});

test("a parsing failure and an unknown template complaint are passed on", () => {
  assert.equal(
    describeTemplateFailure("ParsingFailure: expected json value got 'x' (line 1, column 1)", template, actions),
    "伺服器讀不懂送出的劇本資料（expected json value got 'x' (line 1, column 1)）"
  );
  assert.equal(describeTemplateFailure("something else", template, actions), "伺服器無法接受這個劇本：something else");
});

test("the server's capitalisation does not matter", async () => {
  assert.equal(
    await describe(500, "Invalid scenario: Invalid template: DecodingFailure at .[1].performances[1].action.content.task.title: Missing required field"),
    "動作「找到鑰匙」的地圖標記（MARKER）效果缺少必要欄位「title」。請修正這個動作後再發佈"
  );
});

test("other server replies get their own sentences", async () => {
  assert.equal(await describe(500, "no such scenario"), "伺服器上找不到這個劇本，可能尚未發佈或已被解除發佈");
  assert.equal(await describe(500, ""), "伺服器發生錯誤（500），沒有說明原因；詳細紀錄在瀏覽器主控台（Console）");
  assert.equal(await describe(500, "There was an internal server error."), "伺服器發生錯誤（500）：There was an internal server error.");
  assert.equal(await describe(403, JSON.stringify({ error: "not an owner" }), context), "伺服器拒絕了這個操作，請確認你有權限（not an owner）");
  assert.equal(await describe(404, ""), "伺服器上找不到這個劇本");
  assert.equal(
    await describe(404, "", { request: "publish categories", method: "PUT" }),
    "伺服器上沒有這個功能的位址（404），請確認伺服器網址"
  );
  assert.equal(await describe(502, "<!DOCTYPE html><html><body>Bad Gateway</body></html>", "text/html"), "伺服器發生錯誤（502），沒有說明原因；詳細紀錄在瀏覽器主控台（Console）");
});

test("a JSON reply's empty fields do not hide the message", async () => {
  assert.equal(
    await describe(500, JSON.stringify({ message: "", errors: [], detail: {}, reason: invalid("DecodingFailure at .[1].performances[1].action.content.task.title: Missing required field") })),
    "動作「找到鑰匙」的地圖標記（MARKER）效果缺少必要欄位「title」。請修正這個動作後再發佈"
  );
});

test("the console record carries the request, the status and the raw body, not the template", async () => {
  logged = [];
  await describe(500, invalid("DecodingFailure at .[1].name: Missing required field"));
  const [label, record] = logged[0];
  assert.match(label, /server request failed/);
  assert.equal(record.request, "publish");
  assert.equal(record.scenarioId, "s1");
  assert.equal(record.status, 500);
  assert.equal(record.nodes, 2);
  assert.equal(record.template, undefined);
  assert.equal(record.actions, undefined);
  assert.ok(record.body.startsWith("invalid scenario"));
});

test("a Firestore complaint about an empty field names the field", () => {
  const firestore = new Error(
    "Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field description in document ghostspeak_editor/test/variables/v1)"
  );
  assert.equal(describeError(firestore), "「description」欄位是空的，請把資料填完整後再試");
  const nested = new Error(
    "Function setDoc() called with invalid data. Unsupported field value: undefined (found in field prevs.0.userReply in document x)"
  );
  assert.equal(describeError(nested), "「prevs.0.userReply」欄位是空的，請把資料填完整後再試");
  assert.equal(
    describeError(new Error("Unsupported field value: undefined")),
    "有欄位是空的，請把資料填完整後再試"
  );
});
