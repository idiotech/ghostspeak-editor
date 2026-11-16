// The action list numbers actions in tree order, and publishing walks the same
// tree, so the order of branches has to be the same on every run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getActionTree } from "./actionTree.js";

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
