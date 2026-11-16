import { test } from "node:test";
import assert from "node:assert/strict";
import { checkActions, findContentProblems } from "./actionChecks.js";
import { layoutStory } from "./storyLayout.js";

const ids = (actions) => actions.map((a) => a.id).sort();
const byId = (actions) => Object.fromEntries(actions.map((a) => [a.id, a]));

test("an action no path leads to is unreachable", () => {
  const checks = checkActions(
    byId([
      { id: "start", firstAction: true, endgame: true },
      { id: "a", prevs: [{ prev: "start" }], endgame: true },
      { id: "lost", prevs: [], endgame: true },
    ])
  );
  assert.equal(checks.total, 3);
  assert.deepEqual(ids(checks.unreachable), ["lost"]);
});

test("the leftover previous steps of an initial action lead nowhere", () => {
  // the form hides them, and neither the action list nor publishing follows them
  const actions = [
    { id: "start", firstAction: true },
    { id: "a", prevs: [{ prev: "start" }] },
    { id: "second", firstAction: true, prevs: [{ prev: "a" }] },
  ];
  assert.deepEqual(ids(checkActions(byId(actions)).unreachable), ["second"]);
  assert.deepEqual(ids(layoutStory(actions).unreachable), ["second"]);
});

test("an empty previous-step entry is skipped", () => {
  const checks = checkActions(
    byId([
      { id: "start", firstAction: true },
      { id: "a", prevs: [null, { prev: "start" }] },
    ])
  );
  assert.deepEqual(checks.unreachable, []);
});

test("an action with nothing switched on has no content", () => {
  const problems = findContentProblems([
    { id: "empty" },
    { id: "sound", hasSound: true },
    { id: "end", endgame: true },
  ]);
  assert.deepEqual(ids(problems.noContent), ["empty"]);
});

test("a blocking popup needs a way to answer", () => {
  const popup = { hasPopup: true, destinations: ["ALERT"] };
  const problems = findContentProblems([
    { id: "stuck", ...popup },
    { id: "choices", ...popup, choices: [{ choice: "好" }] },
    { id: "typed", ...popup, allowTextReply: true },
    { id: "none-needed", ...popup, allowNoReply: true },
    { id: "chat", hasPopup: true, destinations: ["APP"] },
  ]);
  assert.deepEqual(ids(problems.noReply), ["stuck"]);
});

test("checkActions reports the content problems too", () => {
  const checks = checkActions(byId([{ id: "start", firstAction: true }]));
  assert.deepEqual(ids(checks.noContent), ["start"]);
  assert.deepEqual(checks.noReply, []);
});
