// The story graph places every action the player can reach, left to right
// from the initial action, and draws how each one is triggered.
import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutStory } from "./storyLayout.js";

const start = { id: "start", firstAction: true };
const step = (id, ...prevs) => ({
  id,
  prevs: prevs.map((p) => (typeof p === "string" ? { prev: p } : p)),
});
const place = (layout, id) => {
  const n = layout.nodes.find((n) => n.id === id);
  return n && [n.column, n.row];
};
const edge = (layout, from, to) =>
  layout.edges.find((e) => e.from === from && e.to === to);

test("lays a straight story out in one row, one column per step", () => {
  const layout = layoutStory([start, step("a", "start"), step("b", "a")]);
  assert.deepEqual(place(layout, "start"), [0, 0]);
  assert.deepEqual(place(layout, "a"), [1, 0]);
  assert.deepEqual(place(layout, "b"), [2, 0]);
  assert.equal(layout.columns, 3);
  assert.equal(layout.rows, 1);
});

test("gives each branch its own row and centers the step they leave", () => {
  const layout = layoutStory([start, step("x", "start"), step("y", "start")]);
  assert.deepEqual(place(layout, "x"), [1, 0]);
  assert.deepEqual(place(layout, "y"), [1, 1]);
  assert.deepEqual(place(layout, "start"), [0, 0.5]);
  assert.equal(layout.rows, 2);
});

test("keeps a longer branch's steps on that branch's row", () => {
  const layout = layoutStory([
    start,
    step("short", "start"),
    step("long", "start"),
    step("long-1", "long"),
  ]);
  assert.deepEqual(place(layout, "short"), [1, 0]);
  assert.deepEqual(place(layout, "long"), [1, 1]);
  assert.deepEqual(place(layout, "long-1"), [2, 1]);
});

test("numbers actions in the order the action list shows them", () => {
  const layout = layoutStory([
    start,
    step("long", "start"),
    step("long-1", "long"),
    step("short", "start"),
  ]);
  const numbers = Object.fromEntries(layout.nodes.map((n) => [n.id, n.number]));
  assert.deepEqual(numbers, { start: 1, short: 2, long: 3, "long-1": 4 });
});

test("draws an action once when two branches lead to it, with a line from each", () => {
  const layout = layoutStory([
    start,
    step("a", "start"),
    step("b", "start"),
    step("end", "a", "b"),
  ]);
  assert.equal(layout.nodes.filter((n) => n.id === "end").length, 1);
  const kinds = [edge(layout, "a", "end").kind, edge(layout, "b", "end").kind].sort();
  assert.deepEqual(kinds, ["also", "next"]);
});

test("marks a line that returns to an earlier step, and still finishes", () => {
  const layout = layoutStory([
    start,
    step("a", "start", "b"),
    step("b", "a"),
  ]);
  assert.equal(edge(layout, "a", "b").kind, "next");
  assert.equal(edge(layout, "b", "a").kind, "back");
  assert.equal(layout.nodes.length, 3);
});

test("draws one line for two ways from the same step to the same action", () => {
  const yes = { prev: "start", conditionType: "TEXT", userReply: "好" };
  const sure = { prev: "start", conditionType: "TEXT", userReply: "當然" };
  const layout = layoutStory([start, step("a", yes, sure)]);
  assert.equal(layout.edges.length, 1);
  assert.deepEqual(edge(layout, "start", "a").entries, [yes, sure]);
});

test("sets aside actions the player can never reach", () => {
  const layout = layoutStory([start, step("a", "start"), step("lost"), step("lost-2", "lost")]);
  assert.deepEqual(layout.unreachable.map((a) => a.id), ["lost", "lost-2"]);
  assert.equal(place(layout, "lost"), undefined);
  assert.equal(edge(layout, "lost", "lost-2"), undefined);
});

test("ignores a previous step that has been deleted", () => {
  const layout = layoutStory([start, step("a", "start", "gone")]);
  assert.equal(layout.edges.length, 1);
});

test("ignores the initial action's leftover previous steps", () => {
  const stale = { id: "start", firstAction: true, prevs: [{ prev: "a" }] };
  const layout = layoutStory([stale, step("a", "start")]);
  assert.equal(edge(layout, "a", "start"), undefined);
});

test("has nothing to draw without an initial action", () => {
  const layout = layoutStory([step("a"), step("b", "a")]);
  assert.equal(layout.hasStart, false);
  assert.deepEqual(layout.nodes, []);
  assert.deepEqual(layout.unreachable.map((a) => a.id), ["a", "b"]);
});

test("leaves the records it was given untouched", () => {
  const actions = [start, step("a", "start")];
  const before = JSON.stringify(actions);
  layoutStory(actions);
  assert.equal(JSON.stringify(actions), before);
});

// a side branch that rejoins the main line further left is a second way in,
// not a loop: the player never passes the same action twice
test("does not take a rejoining side branch for a return", () => {
  const layout = layoutStory([
    start,
    step("main", "start", "side-2"),
    step("side", "start"),
    step("side-2", "side"),
  ]);
  assert.equal(edge(layout, "side-2", "main").kind, "also");
});
