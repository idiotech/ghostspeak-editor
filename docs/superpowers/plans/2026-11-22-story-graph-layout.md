# Story graph layout by rejoining paths — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the 流程圖 out so the storyline runs along one row with loops packed beneath it, size column gaps to their labels, route returns below the loops, and tint the opening and ending actions.

**Architecture:** `storyLayout.js` keeps its return shape but places actions by longest path over the graph without its back lines, rows packed greedily with the rejoining line straight on. `storyGeometry.js` gains `drawStory(layout, describe)`, which owns all pixel positions (variable column gaps, node boxes, routes, size); `storyGraph.jsx` draws from it.

**Tech Stack:** React 18 + MUI + react-admin, plain ES modules tested with `node --test`, built in the `node:22-bookworm-slim` container (no local node).

**Spec:** `docs/superpowers/specs/2026-11-22-story-graph-layout-design.md`

## Global Constraints

- Return shape of `layoutStory` unchanged: `{ hasStart, nodes: {id, action, number, column, row}, edges: {from, to, entries, kind}, unreachable, columns, rows }`; rows are now always integers.
- `number` stays the depth-first order of `getActionTree` (the action list's numbering).
- Edge kinds stay `next` / `also` / `back`.
- Column gap: label width + 16px, clamped to [60, 170]. Node size, row gap, margin unchanged.
- Test fixtures carry story shape only (links, trigger types, reply lengths): no names or text from a real story.
- All commands run as `docker run --rm -v "$PWD":/app -w /app -e HOME=/tmp node:22-bookworm-slim sh -c "<cmd>"` from the project root.

## Review Focus

1. A story whose loops all point back (every extra line is `back`): must still finish and keep the storyline on row 0. → Task 1 test "keeps the storyline straight through a retry loop".
2. Lines into an action from several columns: the line from the far column must not run through boxes in between. → Task 1 test "reserves the row a long line runs along".
3. A back line spanning columns whose lowest row is deep: it must pass below every box it crosses. → Task 2 test "a return passes below every action it crosses".
4. A column gap with no labelled line into it: gap shrinks to 60, labels elsewhere stay readable. → Task 2 test "labels stay readable in the large story".
5. Empty story / no start: page still shows the existing alert (no `drawStory` call with an empty layout crashing). → Task 2 test "draws nothing for a story without a start".

---

### Task 1: Layout by rejoining paths

**Files:**
- Create: `src/storyLayout.fixture.js` (shape of the large real story)
- Modify: `src/storyLayout.js` (rewrite `layoutStory` body)
- Test: `src/storyLayout.test.js`

**Interfaces:**
- Produces: `layoutStory(actions)` as in Global Constraints; `largeStory` (array of 200 action records `{id, firstAction?, endgame?, prevs}`) exported from `src/storyLayout.fixture.js`.

- [ ] **Step 1: Add the fixture.** `largeStory` decodes two strings copied from `.harness/enc.txt` and `.harness/order.txt` (the format and decoder are in `.harness/story.mjs`): ids `a000`…`a199` by list rank, `name` omitted, `userReply` as `"字".repeat(n)`.

- [ ] **Step 2: Update tests.** Replace the two tree-shaped tests ("gives each branch its own row and centers the step they leave", "keeps a longer branch's steps on that branch's row") and add:

```js
test("keeps the first of parallel branches straight on and the rest below", () => {
  const layout = layoutStory([start, step("x", "start"), step("y", "start")]);
  assert.deepEqual(place(layout, "start"), [0, 0]);
  assert.deepEqual([place(layout, "x"), place(layout, "y")].sort(), [[1, 0], [1, 1]]);
  assert.equal(layout.rows, 2);
});

test("puts an action reached two ways after both", () => {
  const layout = layoutStory([start, step("a", "start"), step("b", "a"), step("end", "b", "start")]);
  assert.deepEqual(place(layout, "end"), [3, 0]);
});

test("keeps the storyline straight through a retry loop", () => {
  // ask → wrong → retry → (wrong again → wrong) ; ask/retry → right → next
  const layout = layoutStory([
    start, step("ask", "start"), step("wrong", "ask", "retry"),
    step("retry", "wrong"), step("right", "ask", "retry"), step("next", "right"),
  ]);
  for (const id of ["start", "ask", "right", "next"]) assert.equal(place(layout, id)[1], 0);
  assert.equal(place(layout, "wrong")[1], 1);
  assert.equal(edge(layout, "retry", "wrong").kind, "back");
});

test("reserves the row a long line runs along", () => {
  const layout = layoutStory([start, step("a", "start"), step("b", "a"), step("end", "b", "start"), step("side", "start")]);
  // start→end goes straight on along row 0 over columns 1–2, so a, b and side keep off row 0
  assert.equal(place(layout, "end")[1], 0);
  for (const id of ["a", "b", "side"]) assert.notEqual(place(layout, id)[1], 0);
  const cells = new Set(layout.nodes.map((n) => `${n.column},${n.row}`));
  assert.equal(cells.size, layout.nodes.length);
});

test("lays the large story out on few rows with the storyline on the first", () => {
  const layout = layoutStory(inListOrder(largeStory));
  assert.equal(layout.nodes.length, 200);
  assert.ok(layout.rows <= 12, `rows ${layout.rows}`);
  const startNode = layout.nodes.find((n) => n.action.firstAction);
  assert.deepEqual([startNode.column, startNode.row], [0, 0]);
  assert.ok(layout.nodes.filter((n) => n.row === 0).length >= 90);
});
```

Keep every other existing test unchanged; "numbers actions in the order the action list shows them" must still pass.

- [ ] **Step 3: Run tests, expect the new ones to fail.** `node --test src/storyLayout.test.js`

- [ ] **Step 4: Rewrite `layoutStory`.** Keep: `getActionTree` for `hasStart` and `number` (number = pre-order index of the tree walk, children in tree order), edge collection from `prevs` (skip the initial action's prevs, dedupe by from/to, skip deleted prevs), `unreachable`. New placement:

```
out[v]   = targets of v's lines, in edge order, excluding v itself
back     = lines found by DFS from start whose target is on the DFS stack
forward  = all other lines (acyclic)
column   = longest path from start over forward lines (Kahn order)
reach(v) = 1 + max reach over forward children (memoised)
rows: queue = [start], start at row 0 reserving column 0
  for v in queue: for each unplaced forward child w,
      sorted by column desc, then reach desc, then edge order:
    pick nearest row to row(v) (d = 0, +1, -1, +2, -2 …, never < 0)
    where cells (column(v)+1 … column(w), r) are all free; reserve them;
    row(w) = r; append w
kind: back if in back set; else "next" if from is the action w was placed from; else "also"
```

`rows = max row + 1`, `columns = max column + 1`.

- [ ] **Step 5: Run all tests, expect pass.** `node --test` (storyGeometry tests may fail on layout assumptions; they're fixed in Task 2 — note which.)

- [ ] **Step 6: Commit** `src/storyLayout.js src/storyLayout.fixture.js src/storyLayout.test.js` — "Lay the story graph out by rejoining paths".

### Task 2: Pixel geometry from the layout

**Files:**
- Modify: `src/storyGeometry.js`
- Test: `src/storyGeometry.test.js`

**Interfaces:**
- Consumes: `layoutStory` from Task 1.
- Produces: `drawStory(layout, describe) → { routes, boxes: Map<id, {left, right, top, bottom}>, width, height }`; `routes` items as today `{ edge, path, points, label }`. `routeEdges(layout, describe)` stays as `drawStory(...).routes`. `left`, `top`, `middle`, `nodeBox` stop being exported (positions now depend on the whole layout). Constants `nodeWidth, nodeHeight, rowGap, margin` stay exported; `columnGap` becomes `maxColumnGap = 170`, plus `minColumnGap = 60`.

- [ ] **Step 1: Update tests.** In the test helper use `const drawn = drawStory(layout, text)` and `drawn.boxes.get(n.id)` instead of `nodeBox(n)`. Drop "the label of a line within a column stops before the next column" (forward lines now always cross a column). Add:

```js
test("a return passes below every action it crosses", () => {
  const layout = layoutStory([start, step("a", "start", "c"), step("side", "a"), step("b", "a"), step("c", "b")]);
  const drawn = drawStory(layout, () => "");
  const back = drawn.routes.find((r) => r.edge.kind === "back");
  const lowest = Math.max(...[...drawn.boxes.values()].map((b) => b.bottom));
  assert.ok(back.points[1][1] > lowest);
});

test("a column gap with no label is narrow", () => {
  const layout = layoutStory([start, step("a", "start"), step("b", "a")]);
  const drawn = drawStory(layout, () => "");
  assert.equal(drawn.boxes.get("a").left - drawn.boxes.get("start").right, 60);
});

test("a column gap fits its longest label", () => {
  const layout = layoutStory([start, step("a", "start")]);
  const drawn = drawStory(layout, () => "回答「好」"); // 5 full-width chars = 60px
  assert.equal(drawn.boxes.get("a").left - drawn.boxes.get("start").right, 76);
});

test("labels stay readable in the large story", () => {
  assertLabelsReadable(drawStory(layoutStory(inListOrder(largeStory)), text));
});

test("draws nothing for a story without a start", () => {
  const drawn = drawStory(layoutStory([step("a")]), text);
  assert.deepEqual(drawn.routes, []);
});
```

(`text` in the large-story test: a `describe` giving `回答「${"字".repeat(entry reply length)}」` from the first entry, so real label lengths are exercised.)

- [ ] **Step 2: Run, expect failures.** `node --test src/storyGeometry.test.js`

- [ ] **Step 3: Implement `drawStory`.** Gap after column c = clamp(16 + widest `shorten(text, 13)` among non-back lines whose `to.column === c + 1`, 60, 170). Column lefts accumulate from `margin`. Label spots for forward lines use `gapCenter` of the gaps crossed, as today. Back lines dip to `lowest box bottom among columns to.column…from.column + rowGap/2 + 9`. `width = last column right + margin`; `height = (max box bottom, max back dip) + rowGap + 18 + margin`. Same-column shape and self loop stay.

- [ ] **Step 4: Run all tests, expect pass.** `node --test`

- [ ] **Step 5: Commit** — "Size story graph gaps to their labels and route returns below the loops".

### Task 3: Page draws from `drawStory`, with tints

**Files:**
- Modify: `src/storyGraph.jsx`

**Interfaces:**
- Consumes: `drawStory` from Task 2.

- [ ] **Step 1: Switch the page.** In the `useMemo`, call `drawStory(layout, describeEdge)`; `ActionNode` takes its `box` from `drawn.boxes`; `width`/`height` from `drawn`; opening-view scroll uses the start node's box (`box.top + nodeHeight/2`). Remove the page's own width/height formulas.

- [ ] **Step 2: Tints.** Opening action: `bgcolor: alpha(primary.main, 0.08)`, left border `primary.main` (as now). Ending action (`action.endgame`): `bgcolor: alpha(success.main, 0.08)`, left border `success.main`. Problems still win the border colour. Legend gains two small swatches: 開頭, 結束. `alpha` from `@mui/material/styles`.

- [ ] **Step 3: Build.** `npm run build` — expect success.

- [ ] **Step 4: Look at it.** With the large-story fixture, mount `StoryGraph` in a `.harness/` page (fake dataProvider returning `largeStory` with names `動作N`; `localStorage.scenario` set), build with vite per the project's harness recipe, screenshot with headless Chrome at 80% and 40%. Check: storyline on the top row, loops directly beneath, no line through a box, returns below the loops, tints visible. Delete `.harness/` afterwards.

- [ ] **Step 5: Commit** — "Draw the story graph from its measured layout, and tint the opening and endings".
