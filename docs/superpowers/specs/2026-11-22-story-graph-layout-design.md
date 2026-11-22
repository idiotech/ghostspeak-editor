# Story graph: lay out by rejoining paths

## Why

In 自新 (200 actions) the 流程圖 spreads over 98 columns × 54 rows and the
branches look far apart. The story is mostly one line with many small question
loops (ask → wrong answer → try again → continue): 97 lines rejoin an action
reached another way. `layoutStory` treats the story as a tree, so at each rejoin
the rest of the story hangs off one path only, the storyline is chopped into
pieces across the page, and the opening action sits midway down.

## Goals

- The main storyline reads along one row; loops and side branches sit close
  beneath it.
- 自新 fits in roughly 11 rows (prototype: 131 columns × 11 rows, about a
  quarter of today's area).
- Opening and ending actions stand out.

Non-goals: minimising line crossings in general; changing how actions are
numbered (numbers stay the action list's tree order); new interactions.

Anti-goals: lines or labels running through boxes; a layout that is tidier on
paper but where the storyline is harder to follow than today.

## Approaches

1. **Columns from rejoining paths, storyline straight (chosen).** Own code in
   `storyLayout.js`, keeps the drawing and label code.
2. A layout library such as ELK: a large download for one page, and it would
   take over line routing and label placement.
3. Keep the tree, pack rows tighter: smallest change but the storyline stays
   broken at every rejoin.

## Design

**Layout (`storyLayout.js`)**, same return shape as today:

- Lines are the previous-step links, as now. A depth-first walk from the
  opening action marks a line *back* when it reaches an action still on the
  walk's path; the rest form a graph without cycles.
- An action's column is one past the furthest of its earlier steps (longest
  path), so an action reached two ways sits after both.
- Rows: walk from the opening action; at each action, the next step furthest
  to the right continues straight on (that is where the loops rejoin), then
  longer continuations. Each action takes the nearest free row to its
  predecessor's, preferring below, and also reserves the cells its incoming
  straight line crosses so no line runs through a box.
- Edge kinds: `next` for the line an action was placed from, `back` as above,
  `also` for the rest.
- `number` keeps coming from `getActionTree` order; `unreachable`, `hasStart`
  unchanged.

**Drawing (`storyGeometry.js`, `storyGraph.jsx`)**

- Each column gap is sized to the longest label crossing it (min ~60px, max
  today's 170px) instead of a fixed 170px.
- Lines back to an earlier action run below the lowest row they pass over,
  not just under their two boxes.
- Opening action tinted with the primary colour, ending actions with a
  second tint; legend updated.

**Tests**: rewrite the layout tests whose expectations encoded the tree
(centred parent, one row per leaf); add a test from the shape of 自新 (ids and
links only, no names or text) asserting the storyline stays on row 0 and the
row count stays small.

## Left to the builder

Exact gap minimum, tint colours, and the tie-break order among equal
continuations.
