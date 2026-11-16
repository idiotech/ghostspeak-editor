// Where each action goes in the story graph. Kept free of React so it can be
// tested with node --test.
import { getActionTree } from "./actionTree.js";

// Places every action the player can reach on a grid: columns run left to
// right from the initial action, and each branch gets its own row. Returns
//   nodes: { id, action, number, column, row }, in the action list's order;
//          a step that branches sits midway between its branches, so its row
//          may be a fraction
//   edges: { from, to, entries, kind } for each pair of actions joined by one
//          or more previous-step entries; kind is "next" for the line the
//          layout follows, "also" for another way into an action, and "back"
//          for a return to a step the player has already passed
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

  const nodes = [];
  const placed = new Map();
  const parentOf = new Map();
  let nextRow = 0;
  let columns = 0;
  function place(branch, column) {
    const node = {
      id: branch.node.id,
      action: byId.get(branch.node.id),
      number: nodes.length + 1,
      column,
      row: 0,
    };
    nodes.push(node);
    placed.set(node.id, node);
    columns = Math.max(columns, column + 1);
    const children = branch.children.map((child) => {
      parentOf.set(child.node.id, node.id);
      return place(child, column + 1);
    });
    node.row =
      children.length === 0
        ? nextRow++
        : (children[0].row + children[children.length - 1].row) / 2;
    return node;
  }
  place(tree, 0);

  // whether the layout's own lines lead from `ancestor` down to `id`
  function leadsTo(ancestor, id) {
    for (let at = id; at !== undefined; at = parentOf.get(at))
      if (at === ancestor) return true;
    return false;
  }

  const edges = new Map();
  for (const { id, action } of nodes) {
    // the initial action's previous steps are hidden in the form and may be stale
    if (action.firstAction) continue;
    for (const entry of action.prevs || []) {
      const from = entry && placed.get(entry.prev);
      if (!from) continue;
      const key = `${from.id}\n${id}`;
      if (!edges.has(key))
        edges.set(key, {
          from: from.id,
          to: id,
          entries: [],
          kind:
            parentOf.get(id) === from.id
              ? "next"
              : leadsTo(id, from.id)
              ? "back"
              : "also",
        });
      edges.get(key).entries.push(entry);
    }
  }

  return {
    hasStart: true,
    nodes,
    edges: [...edges.values()],
    unreachable: actions.filter((a) => !placed.has(a.id)),
    columns,
    rows: nextRow,
  };
}
