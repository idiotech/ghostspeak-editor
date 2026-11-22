// Where each action goes in the story graph. Kept free of React so it can be
// tested with node --test.
import { getActionTree } from "./actionTree.js";

// Places every action the player can reach on a grid, left to right from the
// initial action. An action's column is one past the furthest of the steps
// that lead to it, so an action reached two ways sits after both. The line
// that skips furthest ahead from each action goes straight on along its row,
// as that is where a question's detours rejoin the story; the detours take
// the nearest free rows beside it. Returns
//   nodes: { id, action, number, column, row }, in the action list's order
//   edges: { from, to, entries, kind } for each pair of actions joined by one
//          or more previous-step entries; kind is "back" for a return to a
//          step the player has already passed, "next" for the line an action
//          was placed from, and "also" for another way into an action
//   unreachable: the actions no path from the initial action leads to
export function layoutStory(actions) {
  const byId = new Map(actions.map((a) => [a.id, a]));
  // getActionTree notes each action's next steps on the record it is given
  const tree = getActionTree(actions.map((a) => ({ ...a })));
  if (!tree)
    return {
      hasStart: false,
      nodes: [],
      edges: [],
      unreachable: actions,
      columns: 0,
      rows: 0,
    };

  // numbered in the order the action list shows them
  const nodes = [];
  const placed = new Map();
  (function number(branch) {
    const node = {
      id: branch.node.id,
      action: byId.get(branch.node.id),
      number: nodes.length + 1,
      column: 0,
      row: 0,
    };
    nodes.push(node);
    placed.set(node.id, node);
    branch.children.forEach(number);
  })(tree);

  const edges = new Map();
  const after = new Map(nodes.map((n) => [n.id, []]));
  for (const { id, action } of nodes) {
    // the initial action's previous steps are hidden in the form and may be stale
    if (action.firstAction) continue;
    for (const entry of action.prevs || []) {
      const from = entry && placed.get(entry.prev);
      if (!from) continue;
      const key = `${from.id}\n${id}`;
      if (!edges.has(key)) {
        edges.set(key, { from: from.id, to: id, entries: [], kind: "also" });
        if (from.id !== id) after.get(from.id).push(id);
      }
      edges.get(key).entries.push(entry);
    }
  }

  // a line into an action still on the walk's path returns to it; without
  // those the lines run one way only
  const start = nodes[0].id;
  const ahead = new Map(nodes.map((n) => [n.id, []]));
  const walking = new Set();
  const walked = new Set();
  (function walk(id) {
    walking.add(id);
    walked.add(id);
    for (const next of after.get(id)) {
      if (walking.has(next)) edges.get(`${id}\n${next}`).kind = "back";
      else {
        ahead.get(id).push(next);
        if (!walked.has(next)) walk(next);
      }
    }
    walking.delete(id);
  })(start);
  for (const edge of edges.values()) if (edge.from === edge.to) edge.kind = "back";

  // columns: the longest way from the initial action
  const waiting = new Map(nodes.map((n) => [n.id, 0]));
  for (const nexts of ahead.values())
    for (const next of nexts) waiting.set(next, waiting.get(next) + 1);
  const ready = [start];
  while (ready.length) {
    const id = ready.shift();
    for (const next of ahead.get(id)) {
      const node = placed.get(next);
      node.column = Math.max(node.column, placed.get(id).column + 1);
      waiting.set(next, waiting.get(next) - 1);
      if (waiting.get(next) === 0) ready.push(next);
    }
  }

  // how many steps the story goes on for after each action
  const length = new Map();
  const lengthFrom = (id) => {
    if (!length.has(id))
      length.set(id, 1 + Math.max(0, ...ahead.get(id).map(lengthFrom)));
    return length.get(id);
  };

  // rows: each action takes the free row nearest the one it was reached
  // from, keeping clear the cells its line runs along
  const taken = new Set();
  const free = (from, to, row) => {
    for (let c = from; c <= to; c++) if (taken.has(`${c},${row}`)) return false;
    return true;
  };
  const take = (from, to, row) => {
    for (let c = from; c <= to; c++) taken.add(`${c},${row}`);
  };
  take(0, 0, 0);
  const rowOf = new Map([[start, 0]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    const { column } = placed.get(id);
    const row = rowOf.get(id);
    const nexts = ahead
      .get(id)
      .filter((next) => !rowOf.has(next))
      .map((next, order) => ({ next, order }))
      .sort(
        (a, b) =>
          placed.get(b.next).column - placed.get(a.next).column ||
          lengthFrom(b.next) - lengthFrom(a.next) ||
          a.order - b.order
      );
    for (const { next } of nexts) {
      const to = placed.get(next).column;
      for (let d = 0; !rowOf.has(next); d++)
        for (const r of d ? [row + d, row - d] : [row])
          if (r >= 0 && !rowOf.has(next) && free(column + 1, to, r)) {
            take(column + 1, to, r);
            rowOf.set(next, r);
            edges.get(`${id}\n${next}`).kind = "next";
          }
      queue.push(next);
    }
  }
  for (const node of nodes) node.row = rowOf.get(node.id);

  return {
    hasStart: true,
    nodes,
    edges: [...edges.values()],
    unreachable: actions.filter((a) => !placed.has(a.id)),
    columns: 1 + Math.max(...nodes.map((n) => n.column)),
    rows: 1 + Math.max(...nodes.map((n) => n.row)),
  };
}
