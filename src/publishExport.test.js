import { test } from "node:test";
import assert from "node:assert/strict";
import { getActionTree } from "./actionTree.js";
import {
  buildCondition,
  getActions,
  getCondition,
  getTriggers,
  buildTemplate,
  hasConflictingConditions,
} from "./publishExport.js";

const park = { id: "park", name: "公園", lat: 25.05, lon: 121.52 };
const temple = { id: "temple", name: "廟", lat: 25.06, lon: 121.51 };

function emptyData(extra = {}) {
  return {
    actions: {},
    sounds: {},
    locations: { park, temple },
    images: {},
    mapStyles: {},
    variables: {},
    beacons: { b1: { id: "b1", beaconId: "beacon-uuid" } },
    people: {},
    ...extra,
  };
}

// a small story: a start that asks a question, one answer per branch, a
// place the player walks to, and a delayed ending
function story() {
  const start = {
    id: "start",
    name: "開場",
    firstAction: true,
    hasPopup: true,
    text: "要出發嗎？",
    destinations: ["INTRO"],
    choices: [{ choice: "出發" }, { choice: "再等等" }],
  };
  const go = {
    id: "go",
    name: "出發",
    prevs: [{ prev: "start", conditionType: "TEXT", userReply: "出發" }],
    hasSound: true,
    soundId: "s1",
    hasVariableUpdate: true,
    variableUpdates: [{ variable: "v1", operation: "+", value: 1 }],
  };
  const wait = {
    id: "wait",
    name: "再等等",
    prevs: [{ prev: "start", conditionType: "TEXT", fallback: true }],
    hasPopup: true,
    text: "好，慢慢來",
    destinations: ["APP"],
    allowNoReply: true,
    choices: [{ choice: "不會出現" }],
  };
  const arrive = {
    id: "arrive",
    name: "到公園",
    prevs: [
      {
        prev: "go",
        conditionType: "GEOFENCE",
        geofenceCenter: "park",
        geofenceRadius: 40,
        geofenceMode: "SIGHT",
      },
    ],
    hasPopup: true,
    text: "到了",
    destinations: ["ALERT"],
    preconditions: [{ variable: "v1", comparison: ">=", value: 1 }],
    exclusiveWith: ["wait", null],
  };
  const end = {
    id: "end",
    name: "結束",
    prevs: [{ prev: "arrive", conditionType: "ALWAYS" }],
    endgame: true,
    endgameDelaySecond: 5,
    endgameRandomSecond: 2,
  };
  const actions = { start, go, wait, arrive, end };
  const data = emptyData({
    actions,
    sounds: { s1: { id: "s1", sound: { src: "https://files/s1.mp3" } } },
    variables: { v1: { id: "v1", name: "勇氣", value: 0 } },
  });
  return { actions, data };
}

function publish(actions, data) {
  let n = 0;
  return buildTemplate(getActionTree(Object.values(actions)), data, () => {
    n += 1;
    return "id" + n;
  });
}

function nodeNamed(template, name) {
  return template.find((n) => n.name === name);
}

function tasks(node) {
  return node.performances.map((p) => p.action.content.task);
}

test("no condition type means the action always runs", () => {
  assert.deepEqual(buildCondition({}, emptyData()), { type: "ALWAYS" });
  assert.deepEqual(buildCondition({ conditionType: "ALWAYS" }, emptyData()), {
    type: "ALWAYS",
  });
});

test("a geofence carries its center, radius and mode", () => {
  const condition = buildCondition(
    {
      conditionType: "GEOFENCE",
      geofenceCenter: "park",
      geofenceRadius: 40,
      geofenceMode: "SIGHT",
    },
    emptyData()
  );
  assert.equal(condition.type, "GEOFENCE");
  assert.deepEqual(condition.location, park);
  assert.equal(condition.radius, 40);
  assert.equal(condition.mode, "SIGHT");
});

test("a fence saved without radius or mode keeps the old 14 m arrive fence", () => {
  const condition = buildCondition(
    { conditionType: "GEOFENCE", geofenceCenter: "park" },
    emptyData()
  );
  assert.equal(condition.radius, 14);
  assert.equal(condition.mode, "ARRIVE");
});

test("a beacon condition carries the beacon's own id, threshold and direction", () => {
  const condition = buildCondition(
    {
      conditionType: "BEACON",
      beacon: "b1",
      beaconThreshold: -70,
      beaconType: "ENTER",
    },
    emptyData()
  );
  assert.equal(condition.beaconId, "beacon-uuid");
  assert.equal(condition.threshold, -70);
  assert.equal(condition.mode, "ENTER");
});

test("the initial action is triggered by the player joining", () => {
  const triggers = getTriggers({ firstAction: true }, []);
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].payload.type, "JOIN");
});

test("a text reply triggers on the previous popup with the reply text", () => {
  const { actions } = story();
  const [trigger] = getTriggers(actions.go, [actions.start]);
  assert.equal(trigger.actionId, "start-popup");
  assert.equal(trigger.payload.type, "TEXT");
  assert.equal(trigger.payload.text, "出發");
});

test("the fallback reply is published as fallback:", () => {
  const { actions } = story();
  const [trigger] = getTriggers(actions.wait, [actions.start]);
  assert.equal(trigger.payload.text, "fallback:");
});

test("a location step triggers when the previous action's main content ends", () => {
  const { actions } = story();
  const [trigger] = getTriggers(actions.arrive, [actions.go]);
  assert.equal(trigger.actionId, "go-sound");
  assert.equal(trigger.payload.type, "END");
});

test("two identical ways in from the same action give one trigger", () => {
  const { actions } = story();
  const twice = {
    id: "twice",
    prevs: [
      { prev: "go", conditionType: "ALWAYS" },
      { prev: "go", conditionType: "ALWAYS" },
    ],
  };
  assert.equal(getTriggers(twice, [actions.go, actions.go]).length, 1);
});

test("a text reply is a trigger, not a condition", () => {
  const { actions, data } = story();
  assert.deepEqual(getCondition(actions.go, data), { type: "ALWAYS" });
});

test("the initial action ignores leftover previous steps", () => {
  const first = {
    firstAction: true,
    prevs: [{ prev: "x", conditionType: "GEOFENCE", geofenceCenter: "park" }],
  };
  assert.deepEqual(getCondition(first, emptyData()), { type: "ALWAYS" });
});

test("the first location entry is the condition of every performance", () => {
  const { actions, data } = story();
  assert.equal(getCondition(actions.arrive, data).type, "GEOFENCE");
});

test("the sound is published with its file and the node's condition", () => {
  const { actions, data } = story();
  const condition = { type: "ALWAYS" };
  const [sound] = getActions(actions.go, data, condition);
  assert.equal(sound.id, "go-sound");
  assert.equal(sound.content.task.type, "SOUND");
  assert.equal(sound.content.task.url, "https://files/s1.mp3");
  assert.equal(sound.content.task.mode, "MAIN");
  assert.equal(sound.content.task.volumeSetting.type, "STATIC_VOLUME");
  assert.equal(sound.content.condition, condition);
  assert.deepEqual(sound.session, { scenario: "", chapter: "" });
});

test("a variable update is published under the variable's name", () => {
  const { actions, data } = story();
  const update = getActions(actions.go, data, {}).find(
    (a) => a.id === "go-variable-update"
  );
  assert.deepEqual(update.content.task.updates, [
    { name: "勇氣", operation: "+", value: 1 },
  ]);
});

test("a popup that needs no reply publishes no choices", () => {
  const { actions, data } = story();
  const [popup] = getActions(actions.wait, data, {});
  assert.deepEqual(popup.content.task.choices, []);
  assert.equal(popup.content.task.allowTextReply, false);
  assert.equal(popup.content.task.closeAlertAfterReply, true);
});

test("a delay and a random range are published in milliseconds", () => {
  const { actions, data } = story();
  const [endgame] = getActions(actions.end, data, {});
  assert.equal(endgame.content.task.type, "END_GAME");
  assert.deepEqual(endgame.time, { target: null, minAfter: 5000, range: 2000 });
});

test("a clock time is published with seconds", () => {
  const action = { id: "a", endgame: true, endgameTime: "18:30" };
  const [endgame] = getActions(action, emptyData(), {});
  assert.equal(endgame.time.target, "18:30:00");
});

test("a missing sound stops the export with the action's name", () => {
  const action = { id: "a", name: "壞掉", hasSound: true, soundId: "gone" };
  assert.throws(() => getActions(action, emptyData(), {}), /聲音不存在: 壞掉/);
});

test("the template starts with the initial node and holds every reachable action", () => {
  const { actions, data } = story();
  const template = publish(actions, data);
  assert.equal(template[0].name, "initial");
  assert.deepEqual(template.map((n) => n.name).sort(), [
    "arrive",
    "end",
    "go",
    "initial",
    "wait",
  ]);
});

test("an action nothing leads to is left out", () => {
  const { actions, data } = story();
  actions.orphan = { id: "orphan", name: "孤兒", endgame: true, prevs: [] };
  const template = publish(actions, data);
  assert.equal(nodeNamed(template, "orphan"), undefined);
});

test("the initial node sets every variable to its starting value", () => {
  const { actions, data } = story();
  const initial = publish(actions, data)[0];
  const defaults = tasks(initial).find((t) => t.type === "VARIABLE_UPDATES");
  assert.deepEqual(defaults.updates, [
    { name: "勇氣", operation: "=", value: 0 },
  ]);
});

test("the initial node introduces every person as a friend", () => {
  const { actions, data } = story();
  data.people = { p1: { id: "p1", name: "阿嬤", userPortrait: "img1" } };
  data.images = { img1: { id: "img1", image: { src: "https://files/a.jpg" } } };
  const initial = publish(actions, data)[0];
  const friend = initial.performances.find(
    (p) => p.action.content.task.type === "FRIEND"
  );
  assert.equal(friend.action.id, "id1-friend");
  assert.deepEqual(friend.action.content.task, {
    type: "FRIEND",
    id: "p1",
    icon: "https://files/a.jpg",
    name: "阿嬤",
  });
});

test("an initial action with nothing for the home page gets an empty one", () => {
  const start = { id: "start", name: "開場", firstAction: true };
  const template = publish({ start }, emptyData({ actions: { start } }));
  const shadow = template[0].performances.find(
    (p) => p.action.id === "shadow-intro"
  );
  assert.deepEqual(shadow.action.content.task.destinations, ["INTRO"]);
});

test("an initial action that already shows the home page gets nothing extra", () => {
  const { actions, data } = story();
  const initial = publish(actions, data)[0];
  assert.equal(
    initial.performances.some((p) => p.action.id === "shadow-intro"),
    false
  );
});

test("a node carries its followers, exclusions and preconditions", () => {
  const { actions, data } = story();
  const arrive = nodeNamed(publish(actions, data), "arrive");
  assert.deepEqual(arrive.children, ["end"]);
  assert.deepEqual(arrive.exclusiveWith, ["wait"]);
  assert.deepEqual(arrive.preconditions, [
    { name: "勇氣", comparison: ">=", value: 1 },
  ]);
});

test("every performance has a delay, zero when none is set", () => {
  const { actions, data } = story();
  const template = publish(actions, data);
  template.forEach((node) =>
    node.performances.forEach((p) => assert.equal(typeof p.delay, "number"))
  );
});

test("the condition of a location step is on each of its performances", () => {
  const { actions, data } = story();
  const arrive = nodeNamed(publish(actions, data), "arrive");
  arrive.performances.forEach((p) =>
    assert.equal(p.action.content.condition.type, "GEOFENCE")
  );
});

test("one location condition is no conflict", () => {
  const { actions } = story();
  assert.equal(hasConflictingConditions(actions.arrive), false);
});

test("the same fence from two previous steps is no conflict", () => {
  const fence = { conditionType: "GEOFENCE", geofenceCenter: "park" };
  const action = {
    prevs: [
      { prev: "a", ...fence },
      { prev: "b", ...fence },
    ],
  };
  assert.equal(hasConflictingConditions(action), false);
});

test("two different fences conflict", () => {
  const action = {
    prevs: [
      { prev: "a", conditionType: "GEOFENCE", geofenceCenter: "park" },
      { prev: "b", conditionType: "GEOFENCE", geofenceCenter: "temple" },
    ],
  };
  assert.equal(hasConflictingConditions(action), true);
});

test("the same fence with another radius conflicts", () => {
  const fence = { conditionType: "GEOFENCE", geofenceCenter: "park" };
  const action = {
    prevs: [
      { prev: "a", ...fence, geofenceRadius: 30 },
      { prev: "b", ...fence, geofenceRadius: 60 },
    ],
  };
  assert.equal(hasConflictingConditions(action), true);
});

test("a fence beside a plain next step conflicts", () => {
  const action = {
    prevs: [
      { prev: "a", conditionType: "ALWAYS" },
      { prev: "b", conditionType: "GEOFENCE", geofenceCenter: "park" },
    ],
  };
  assert.equal(hasConflictingConditions(action), true);
});

test("a fence and a beacon conflict", () => {
  const action = {
    prevs: [
      { prev: "a", conditionType: "BEACON", beacon: "b1" },
      { prev: "b", conditionType: "GEOFENCE", geofenceCenter: "park" },
    ],
  };
  assert.equal(hasConflictingConditions(action), true);
});

test("text replies beside one fence are no conflict", () => {
  const action = {
    prevs: [
      { prev: "a", conditionType: "TEXT", userReply: "好" },
      { prev: "b", conditionType: "GEOFENCE", geofenceCenter: "park" },
      null,
    ],
  };
  assert.equal(hasConflictingConditions(action), false);
});

test("the initial action never conflicts", () => {
  const action = {
    firstAction: true,
    prevs: [
      { prev: "a", conditionType: "ALWAYS" },
      { prev: "b", conditionType: "GEOFENCE", geofenceCenter: "park" },
    ],
  };
  assert.equal(hasConflictingConditions(action), false);
});
