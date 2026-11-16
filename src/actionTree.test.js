// The action list numbers actions in tree order, and publishing walks the same
// tree, so the order of branches has to be the same on every run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getActionTree, inListOrder } from "./actionTree.js";

const step = (id, prev) => ({ id, prevs: [{ prev }] });

test("orders branches from the fewest next steps to the most", () => {
  const actions = [
    { id: "start", firstAction: true },
    step("long", "start"),
    step("long-1", "long"),
    step("long-2", "long"),
    step("short", "start"),
  ];
  const tree = getActionTree(actions);
  assert.deepEqual(
    tree.children.map((c) => c.node.id),
    ["short", "long"]
  );
});

test("keeps branches with equally many next steps in their original order", () => {
  const actions = [
    { id: "start", firstAction: true },
    step("b", "start"),
    step("a", "start"),
  ];
  const tree = getActionTree(actions);
  assert.deepEqual(
    tree.children.map((c) => c.node.id),
    ["b", "a"]
  );
});

test("skips an empty previous-step entry", () => {
  const actions = [
    { id: "start", firstAction: true },
    { id: "a", prevs: [null, { prev: "start" }] },
  ];
  const tree = getActionTree(actions);
  assert.deepEqual(
    tree.children.map((c) => c.node.id),
    ["a"]
  );
});

test("list order is by id, whatever order the records arrive in", () => {
  const b = { id: "b" };
  const a = { id: "A" };
  const c = { id: "c" };
  const given = [c, b, a];
  assert.deepEqual(inListOrder(given), [a, b, c]);
  assert.deepEqual(given, [c, b, a]);
});

test("numbering does not depend on the order the records arrive in", () => {
  const records = () => [
    { id: "start", firstAction: true },
    step("x", "start"),
    step("y", "start"),
  ];
  const order = (actions) =>
    getActionTree(inListOrder(actions)).children.map((c) => c.node.id);
  assert.deepEqual(order(records()), order(records().reverse()));
});
