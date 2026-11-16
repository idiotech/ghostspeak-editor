// The story as a tree rooted at the initial action. Kept free of React so it
// can be tested with node --test.
export function getActionTree(actions) {
  const initial = actions.find((a) => a.firstAction);
  const nodesSet = new Set();
  const parentMap = actions.reduce(function (m, a) {
    // the initial action's previous steps are hidden in the form and may be stale
    if (a.prevs && !a.firstAction) {
      a.prevs.forEach((p) => {
        const orig = m.get(p.prev) || [];
        m.set(p.prev, [...orig, a]);
      });
      return m;
    } else {
      return m;
    }
  }, new Map());

  function createTree(root) {
    const children = parentMap.get(root.id) || [];
    const childNodes = children.map((c) => {
      if (nodesSet.has(c.id)) {
        return null;
      } else {
        nodesSet.add(c.id);
        return c;
      }
    });
    root.children = children.map((c) => c.id);
    const treeChildren = childNodes.filter((c) => c).map((c) => createTree(c));
    // branches with fewer next steps come first; the sort is stable, so equal
    // branches keep their order
    treeChildren.sort((a, b) => a.children.length - b.children.length);
    return {
      node: root,
      children: treeChildren,
    };
  }
  if (initial) return createTree(initial);
  else return null;
}
