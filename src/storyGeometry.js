// Where the story graph draws each action, line and label, in pixels. Kept
// free of React so it can be tested with node --test.

// the grid from layoutStory
export const nodeWidth = 200;
export const nodeHeight = 58;
// wide enough for a trigger such as 回答「好，我們出發」 between two columns
export const columnGap = 170;
export const rowGap = 20;
export const margin = 24;

export const left = (node) => margin + node.column * (nodeWidth + columnGap);
export const top = (node) => margin + node.row * (nodeHeight + rowGap);
export const middle = (node) => top(node) + nodeHeight / 2;

export const nodeBox = (node) => ({
  left: left(node),
  right: left(node) + nodeWidth,
  top: top(node),
  bottom: top(node) + nodeHeight,
});

const fontSize = 12;
// a full-width character takes the whole font size, others about half
const textWidth = (text) =>
  [...text].reduce(
    (sum, c) => sum + (c.codePointAt(0) > 0x2e7f ? fontSize : fontSize * 0.6),
    0
  );

// the space a label takes; label.y is the text's baseline
export function labelBox(label) {
  const width = textWidth(label.text);
  const start =
    label.anchor === "start"
      ? label.x
      : label.anchor === "end"
      ? label.x - width
      : label.x - width / 2;
  return {
    left: start,
    right: start + width,
    top: label.y - fontSize,
    bottom: label.y + 3,
  };
}

const overlaps = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const shorten = (text, length) =>
  text.length > length ? text.slice(0, length - 1) + "…" : text;

// a point on a cubic curve given as four [x, y] points
function pointAt(points, t) {
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((axis) =>
    points.reduce((sum, p, i) => sum + p[axis] * weights[i], 0)
  );
}

// where a curve that runs steadily left or right passes the given x
function pointAtX(points, x) {
  const rising = points[3][0] > points[0][0];
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const t = (low + high) / 2;
    if (pointAt(points, t)[0] < x === rising) low = t;
    else high = t;
  }
  return pointAt(points, (low + high) / 2);
}

// the middle of the gap to the right of a column
const gapCenter = (column) =>
  margin + column * (nodeWidth + columnGap) + nodeWidth + columnGap / 2;

// The curve of one line and the places its label may go, best first.
function shape(from, to) {
  if (from.id === to.id) {
    // back to itself: a loop on the right side
    const x = left(from) + nodeWidth;
    const y = middle(from);
    const points = [
      [x, y - 12],
      [x + 52, y - 26],
      [x + 52, y + 26],
      [x + 4, y + 12],
    ];
    return { points, anchor: "start", length: 9, spots: [[x + 46, y + 4]] };
  }
  if (to.column === from.column) {
    // within a column: out of the right side and back in, clear of the
    // actions stacked between the two
    const x = left(from) + nodeWidth;
    const y1 = middle(from);
    const y2 = middle(to);
    const bulge = 40 + Math.min(30, Math.abs(y2 - y1) / 8);
    const points = [
      [x, y1],
      [x + bulge, y1],
      [x + bulge, y2],
      [x + 4, y2],
    ];
    const spots = [0.5, 0.35, 0.65, 0.2, 0.8].map((t) => {
      const [px, py] = pointAt(points, t);
      return [px + 6, py + 4];
    });
    return { points, anchor: "start", length: 9, spots };
  }
  // the column gaps the line crosses, nearest the action it leads to first:
  // no action is drawn there, so a label fits
  const gaps = [];
  if (to.column < from.column) {
    // leftwards: under both actions rather than across them
    const x1 = left(from) + nodeWidth / 2;
    const y1 = top(from) + nodeHeight;
    const x2 = left(to) + nodeWidth / 2;
    const y2 = top(to) + nodeHeight;
    const dip = Math.max(y1, y2) + rowGap + 18;
    const points = [
      [x1, y1],
      [x1, dip],
      [x2, dip],
      [x2, y2 + 4],
    ];
    for (let c = to.column; c < from.column; c++) gaps.push(gapCenter(c));
    return { points, anchor: "middle", length: 13, spots: spotsIn(points, gaps) };
  }
  const x1 = left(from) + nodeWidth;
  const y1 = middle(from);
  const x2 = left(to) - 4;
  const y2 = middle(to);
  const bend = Math.max(40, (x2 - x1) / 2);
  const points = [
    [x1, y1],
    [x1 + bend, y1],
    [x2 - bend, y2],
    [x2, y2],
  ];
  for (let c = to.column - 1; c >= from.column; c--) gaps.push(gapCenter(c));
  return { points, anchor: "middle", length: 13, spots: spotsIn(points, gaps) };
}

// just above the line where it crosses each gap, then just below
function spotsIn(points, gaps) {
  const crossings = gaps.map((x) => pointAtX(points, x));
  return [
    ...crossings.map(([x, y]) => [x, y - 5]),
    ...crossings.map(([x, y]) => [x, y + 14]),
  ];
}

// For each line of the layout: its curve as an SVG path and, when the line
// has a trigger text, a label placed clear of the actions and of the labels
// already placed. `describe(edge, fromNode)` gives the text.
export function routeEdges(layout, describe) {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const boxes = layout.nodes.map(nodeBox);
  const taken = [];
  return layout.edges.map((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const { points, anchor, length, spots } = shape(from, to);
    const [a, b, c, d] = points.map((p) => p.join(" "));
    const path = `M ${a} C ${b}, ${c}, ${d}`;
    const full = describe(edge, from);
    if (!full) return { edge, path, points, label: null };

    const text = shorten(full, length);
    const at = ([x, y]) => ({ x, y, anchor, text, full });
    const clearOfLabels = (label) =>
      !taken.some((box) => overlaps(labelBox(label), box));
    const clear = (label) =>
      clearOfLabels(label) &&
      !boxes.some((box) => overlaps(labelBox(label), box));
    let label = spots.map(at).find(clear);
    if (!label) {
      // nowhere free on the line: below the best spot, at least clear of
      // the other labels
      const [x, y] = spots[0];
      for (let down = 0; down <= 150 && !label; down += 15)
        if (clearOfLabels(at([x, y + down]))) label = at([x, y + down]);
      label = label || at(spots[0]);
    }
    taken.push(labelBox(label));
    return { edge, path, points, label };
  });
}
