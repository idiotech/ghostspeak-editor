// Where the story graph draws each action, line and label, in pixels. Kept
// free of React so it can be tested with node --test.

// the grid from layoutStory
export const nodeWidth = 200;
export const nodeHeight = 58;
// a column gap is as wide as the longest label of the lines into the next
// column, within these bounds; 170 fits 回答「好，我們出發」
export const minColumnGap = 60;
export const maxColumnGap = 170;
export const rowGap = 20;
export const margin = 24;
// how far a return line runs below the actions it passes
const returnDrop = rowGap / 2 + 9;

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

// A line with rounded corners through the given points.
function corners(points, radius = 8) {
  let path = `M ${points[0].join(" ")}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const toward = (ax, ay, length) => {
      const d = Math.hypot(ax - x, ay - y) || 1;
      const r = Math.min(radius, length / 2);
      return [x + ((ax - x) / d) * r, y + ((ay - y) / d) * r];
    };
    const before = toward(px, py, Math.hypot(px - x, py - y));
    const after = toward(nx, ny, Math.hypot(nx - x, ny - y));
    path += ` L ${before.join(" ")} Q ${x} ${y} ${after.join(" ")}`;
  }
  return path + ` L ${points[points.length - 1].join(" ")}`;
}

const cubic = (points) => {
  const [a, b, c, d] = points.map((p) => p.join(" "));
  return `M ${a} C ${b}, ${c}, ${d}`;
};

// just above the line where it crosses each gap, then just below
function spotsIn(points, gaps) {
  const crossings = gaps.map((x) => pointAtX(points, x));
  return [
    ...crossings.map(([x, y]) => [x, y - 5]),
    ...crossings.map(([x, y]) => [x, y + 14]),
  ];
}

// Pixel positions for a layout: where each column starts, from the widths
// of the gaps between them.
function measure(layout, texts) {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const widest = Array(Math.max(0, layout.columns - 1)).fill(0);
  for (const edge of layout.edges) {
    const text = texts.get(edge);
    if (edge.kind === "back" || !text) continue;
    const gap = byId.get(edge.to).column - 1;
    if (gap >= 0) widest[gap] = Math.max(widest[gap], textWidth(shorten(text, 13)));
  }
  const gaps = widest.map((w) =>
    Math.min(maxColumnGap, Math.max(minColumnGap, w + 16))
  );
  const columnLeft = [margin];
  gaps.forEach((gap, c) => columnLeft.push(columnLeft[c] + nodeWidth + gap));
  // the lowest box bottom in each column
  const columnBottom = Array(layout.columns).fill(margin);
  const left = (node) => columnLeft[node.column];
  const top = (node) => margin + node.row * (nodeHeight + rowGap);
  for (const node of layout.nodes)
    columnBottom[node.column] = Math.max(
      columnBottom[node.column],
      top(node) + nodeHeight
    );
  const occupied = new Set(layout.nodes.map((n) => `${n.column},${n.row}`));
  return {
    byId,
    // whether an action stands in the columns strictly between two and the
    // rows from one to the other
    blocked: (from, to) => {
      const [low, high] = [from.row, to.row].sort((a, b) => a - b);
      for (let c = from.column + 1; c < to.column; c++)
        for (let r = Math.floor(low); r <= Math.ceil(high); r++)
          if (occupied.has(`${c},${r}`)) return true;
      return false;
    },
    left,
    top,
    middle: (node) => top(node) + nodeHeight / 2,
    // the middle of the gap to the right of a column; past the last column
    // a return line keeps a fixed distance
    gapCenter: (column) =>
      columnLeft[column] + nodeWidth + (gaps[column] ?? minColumnGap) / 2,
    lowestIn: (from, to) => Math.max(...columnBottom.slice(from, to + 1)),
  };
}

// The curve of one line and the places its label may go, best first.
function shape(from, to, at) {
  const { left, top, middle, gapCenter, lowestIn } = at;
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
    return {
      points,
      path: cubic(points),
      anchor: "start",
      length: 9,
      spots: [[x + 46, y + 4]],
    };
  }
  if (to.column <= from.column) {
    // a return: out of the right side, down the gap, back along below every
    // action between the two, up the gap before the earlier one and into it
    const y1 = middle(from);
    const y2 = middle(to) + 10;
    const out = gapCenter(from.column);
    const back = to.column > 0 ? gapCenter(to.column - 1) : left(to) - 12;
    const dip = lowestIn(to.column, from.column) + returnDrop;
    const points = [
      [left(from) + nodeWidth, y1],
      [out, y1],
      [out, dip],
      [back, dip],
      [back, y2],
      [left(to) - 4, y2],
    ];
    const spots = [];
    for (let c = from.column - 1; c >= to.column; c--)
      spots.push([gapCenter(c), dip - 5]);
    for (let c = from.column - 1; c >= to.column; c--)
      spots.push([gapCenter(c), dip + 14]);
    if (!spots.length) spots.push([out, dip + 14]);
    return { points, path: corners(points), anchor: "middle", length: 13, spots };
  }
  if (at.blocked(from, to)) {
    // forwards past other actions: down or up the gap after the first, along
    // the space between rows beside the one it leads to, which no action
    // ever takes, and up or down the gap before it
    const y1 = middle(from);
    const y2 = middle(to);
    const lane =
      from.row > to.row
        ? top(to) + nodeHeight + rowGap / 2
        : top(to) - rowGap / 2;
    const out = gapCenter(from.column);
    const into = gapCenter(to.column - 1);
    const points = [
      [left(from) + nodeWidth, y1],
      [out, y1],
      [out, lane],
      [into, lane],
      [into, y2],
      [left(to) - 4, y2],
    ];
    const spots = [];
    for (let c = to.column - 2; c > from.column; c--)
      spots.push([gapCenter(c), lane - 5], [gapCenter(c), lane + 14]);
    // beside the climbs, the label starts at the line
    spots.push(
      [into + 6, (lane + y2) / 2 + 4, "start"],
      [out + 6, (y1 + lane) / 2 + 4, "start"]
    );
    return {
      points,
      path: corners(points),
      anchor: "middle",
      length: 9,
      spots,
    };
  }
  // forwards: the column gaps the line crosses, nearest the action it leads
  // to first: no action is drawn there, so a label fits
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
  const gaps = [];
  for (let c = to.column - 1; c >= from.column; c--) gaps.push(gapCenter(c));
  return {
    points,
    path: cubic(points),
    anchor: "middle",
    length: 13,
    spots: spotsIn(points, gaps),
  };
}

// Everything the story graph draws, in pixels: a box for each action, each
// line's path and, when the line has a trigger text, a label placed clear of
// the actions and of the labels already placed, and the size of the whole.
// `describe(edge, fromNode)` gives a line's text.
export function drawStory(layout, describe) {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const texts = new Map(
    layout.edges.map((edge) => [edge, describe(edge, byId.get(edge.from))])
  );
  const at = measure(layout, texts);
  const boxes = new Map(
    layout.nodes.map((n) => [
      n.id,
      {
        left: at.left(n),
        right: at.left(n) + nodeWidth,
        top: at.top(n),
        bottom: at.top(n) + nodeHeight,
      },
    ])
  );
  const boxList = [...boxes.values()];
  const taken = [];
  const routes = layout.edges.map((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const { points, path, anchor, length, spots } = shape(from, to, at);
    const full = texts.get(edge);
    if (!full) return { edge, path, points, label: null };

    const text = shorten(full, length);
    // a spot may say how its label lines up; the line's way otherwise
    const place = ([x, y, lineUp]) => ({
      x,
      y,
      anchor: lineUp || anchor,
      text,
      full,
    });
    const clearOfLabels = (label) =>
      !taken.some((box) => overlaps(labelBox(label), box));
    const clear = (label) =>
      clearOfLabels(label) &&
      !boxList.some((box) => overlaps(labelBox(label), box));
    let label = spots.map(place).find(clear);
    if (!label) {
      // nowhere free on the line: below the best spot, at least clear of
      // the other labels
      const [x, y, lineUp] = spots[0];
      for (let down = 0; down <= 150 && !label; down += 15)
        if (clear(place([x, y + down, lineUp])))
          label = place([x, y + down, lineUp]);
      for (let down = 0; down <= 150 && !label; down += 15)
        if (clearOfLabels(place([x, y + down, lineUp])))
          label = place([x, y + down, lineUp]);
      label = label || place(spots[0]);
    }
    taken.push(labelBox(label));
    return { edge, path, points, label };
  });

  const lowest = Math.max(
    margin,
    ...boxList.map((b) => b.bottom),
    ...routes.flatMap((r) => r.points.map((p) => p[1])),
    ...taken.map((b) => b.bottom)
  );
  const rightmost = Math.max(
    margin,
    ...boxList.map((b) => b.right),
    ...routes.flatMap((r) => r.points.map((p) => p[0])),
    ...taken.map((b) => b.right)
  );
  return {
    routes,
    boxes,
    width: rightmost + margin,
    height: lowest + margin,
  };
}

// just the lines, for callers that need no boxes
export const routeEdges = (layout, describe) =>
  drawStory(layout, describe).routes;

// Where to scroll after zooming from `from` to `to` so that the point in the
// middle of the view stays there. Without it the view keeps its scroll
// offset in pixels, which after zooming out lands far past the graph.
export function scrollForZoom(view, from, to) {
  const middleX = (view.scrollLeft + view.clientWidth / 2) / from;
  const middleY = (view.scrollTop + view.clientHeight / 2) / from;
  return {
    scrollLeft: Math.max(0, middleX * to - view.clientWidth / 2),
    scrollTop: Math.max(0, middleY * to - view.clientHeight / 2),
  };
}
