// Where the story graph draws each line and its label. Labels must stay
// readable: clear of the action boxes and of each other.
import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutStory } from "./storyLayout.js";
import { inListOrder } from "./actionTree.js";
import { largeStory } from "./storyLayout.fixture.js";
import { drawStory, labelBox, scrollForZoom } from "./storyGeometry.js";

const start = { id: "start", firstAction: true };
const step = (id, ...prevs) => ({ id, prevs: prevs.map((prev) => ({ prev })) });

const overlaps = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

function route(actions, text = () => "回答「好，我們出發吧」") {
  const layout = layoutStory(actions);
  return { layout, ...drawStory(layout, text) };
}
const routeOf = (routes, from, to) =>
  routes.find((r) => r.edge.from === from && r.edge.to === to);

function assertLabelsReadable({ routes, boxes }) {
  const labels = routes.filter((r) => r.label).map((r) => labelBox(r.label));
  labels.forEach((a, i) => {
    labels.slice(i + 1).forEach((b) => assert.equal(overlaps(a, b), false));
    boxes.forEach((box) => assert.equal(overlaps(a, box), false));
  });
}

test("two lines into the same action have labels apart from each other", () => {
  const drawn = route([
    start,
    step("a", "start"),
    step("b", "start"),
    step("end", "a", "b"),
  ]);
  const one = labelBox(routeOf(drawn.routes, "a", "end").label);
  const other = labelBox(routeOf(drawn.routes, "b", "end").label);
  assert.equal(overlaps(one, other), false);
});

test("lines into one action from different columns have labels apart", () => {
  const drawn = route([
    start,
    step("a", "start"),
    step("b", "a"),
    step("end", "b", "start"),
  ]);
  assertLabelsReadable(drawn);
});

test("the label of a line back to an earlier step is not under an action", () => {
  const drawn = route([
    start,
    step("a", "start", "c"),
    step("b", "a"),
    step("c", "b"),
    step("side", "a"),
    step("side-1", "side"),
    step("side-2", "side-1"),
  ]);
  assert.equal(routeOf(drawn.routes, "c", "a").edge.kind, "back");
  assertLabelsReadable(drawn);
});

test("labels stay readable in a tangled story", () => {
  assertLabelsReadable(
    route([
      start,
      step("a", "start"),
      step("b", "start"),
      step("c", "a", "b"),
      step("d", "a", "b", "c"),
      step("e", "c", "d", "start"),
      step("f", "e", "a"),
    ])
  );
});

test("an action that leads back to itself is drawn as a loop", () => {
  const { routes } = route([start, step("a", "start", "a")]);
  const loop = routeOf(routes, "a", "a");
  const [from, , , to] = loop.points;
  assert.notEqual(from[1], to[1]);
  assert.ok(loop.label);
});

test("a long trigger is cut short and keeps its full text", () => {
  const long = "回答「好，我們現在就一起出發吧」";
  const { routes } = route([start, step("a", "start")], () => long);
  assert.equal(routes[0].label.text, "回答「好，我們現在就一起…");
  assert.equal(routes[0].label.text.length, 13);
  assert.equal(routes[0].label.full, long);
});

test("a short trigger is shown whole", () => {
  const { routes } = route([start, step("a", "start")], () => "GPS觸發");
  assert.equal(routes[0].label.text, "GPS觸發");
});

test("a line without a trigger text has no label", () => {
  const { routes } = route([start, step("a", "start")], () => "");
  assert.equal(routes[0].label, null);
});

test("a return passes below every action it crosses", () => {
  const { routes, boxes } = route(
    [
      start,
      step("a", "start", "c"),
      step("side", "a"),
      step("b", "a"),
      step("c", "b"),
    ],
    () => ""
  );
  const back = routeOf(routes, "c", "a");
  assert.equal(back.edge.kind, "back");
  const lowest = Math.max(...[...boxes.values()].map((b) => b.bottom));
  assert.ok(Math.max(...back.points.map(([, y]) => y)) > lowest);
});

test("a column gap with no label is narrow", () => {
  const { boxes } = route([start, step("a", "start"), step("b", "a")], () => "");
  assert.equal(boxes.get("a").left - boxes.get("start").right, 60);
});

test("a column gap fits its longest label", () => {
  // five full-width characters, 60px
  const { boxes } = route([start, step("a", "start")], () => "回答「好」");
  assert.equal(boxes.get("a").left - boxes.get("start").right, 76);
});

test("labels stay readable in the large story", () => {
  const reply = (edge) =>
    `回答「${edge.entries[0].userReply || ""}」`;
  assertLabelsReadable(route(inListOrder(largeStory), reply));
});

// points along a line: the cubic for four points, else the corners joined
function along(points) {
  if (points.length === 4)
    return Array.from({ length: 200 }, (_, i) => {
      const t = i / 199;
      const u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      return [0, 1].map((axis) =>
        points.reduce((sum, p, k) => sum + p[axis] * w[k], 0)
      );
    });
  return points.slice(1).flatMap((q, i) => {
    const p = points[i];
    return Array.from({ length: 50 }, (_, k) => [
      p[0] + ((q[0] - p[0]) * k) / 49,
      p[1] + ((q[1] - p[1]) * k) / 49,
    ]);
  });
}

test("no line in the large story runs through an action", () => {
  const { routes, boxes } = route(inListOrder(largeStory));
  const through = routes.filter((r) =>
    [...boxes].some(
      ([id, b]) =>
        id !== r.edge.from &&
        id !== r.edge.to &&
        along(r.points).some(
          ([x, y]) =>
            x > b.left + 1 && x < b.right - 1 && y > b.top + 1 && y < b.bottom - 1
        )
    )
  );
  assert.deepEqual(
    through.map((r) => `${r.edge.from}→${r.edge.to}`),
    []
  );
});

test("draws nothing for a story without a start", () => {
  const drawn = route([step("a")]);
  assert.deepEqual(drawn.routes, []);
  assert.equal(drawn.boxes.size, 0);
});

test("zooming keeps the point in the middle of the view in the middle", () => {
  const view = { scrollLeft: 1000, scrollTop: 1000, clientWidth: 800, clientHeight: 600 };
  // the middle of the view is at (1400, 1300) in the graph at 100%
  const next = scrollForZoom(view, 1, 0.4);
  assert.equal(next.scrollLeft, 1400 * 0.4 - 400);
  assert.equal(next.scrollTop, 1300 * 0.4 - 300);
  // and back again
  const back = scrollForZoom({ ...view, ...next }, 0.4, 1);
  assert.equal(Math.round(back.scrollLeft), 1000);
  assert.equal(Math.round(back.scrollTop), 1000);
});

test("zooming never scrolls before the start of the graph", () => {
  const view = { scrollLeft: 0, scrollTop: 0, clientWidth: 800, clientHeight: 600 };
  assert.deepEqual(scrollForZoom(view, 1, 0.4), { scrollLeft: 0, scrollTop: 0 });
});
