// Builds a timed walking route (GPX) from a scenario's action tree, for
// replaying with a mock-location app while testing a story.
//
// The output is a single track of densely spaced points with a <time> on
// every point. GPX Mock Location (su.mya.mocklock) sleeps for the gap between
// consecutive points and pushes each point as-is, with no interpolation; it
// also replays <wpt> elements as if they were track points, so stops are not
// exported as waypoints.
//
// The timing model follows the client: a geofence fires once a fix is inside
// its radius, and the next steps become active when the current step's main
// performance ends (its sound finishes, its popup is shown, ...). So the
// route walks to each geofence center at walking speed and stays there for
// the step's delay plus its length, then walks on.

import { buildGPX, BaseBuilder } from "gpx-builder";
import { getActions } from "./serverCommon";
import { getPrevId, getMainType } from "./actionCommon";

const { Point, Track, Segment } = BaseBuilder.MODELS;

// the client's own walking-speed assumption (Controller.detectGeofences)
export const WALK_SPEED_MPS = 1.4;
// spacing of exported points; the client wants fixes every few seconds near
// a fence and drops fixes older than two minutes
export const POINT_INTERVAL_MS = 2000;
// extra time at each stop for the fix cadence and the client's trigger delay
export const STOP_MARGIN_MS = 5000;
// how long the tester gets to answer a popup that waits for a reply
export const REPLY_WAIT_MS = 10000;
// used when a sound file's length cannot be read
export const DEFAULT_SOUND_MS = 60000;
const AUDIO_TIMEOUT_MS = 15000;

// --- paths through the action tree -------------------------------------

// every root-to-leaf path of the tree returned by getActionTree, as arrays of
// action records; `choices` are the children picked where the path branched
export function getPaths(tree) {
  const paths = [];
  function walk(subtree, nodes, choices) {
    const nextNodes = [...nodes, subtree.node];
    if (subtree.children.length === 0) {
      paths.push({ nodes: nextNodes, choices });
    } else if (subtree.children.length === 1) {
      walk(subtree.children[0], nextNodes, choices);
    } else {
      subtree.children.forEach((c) =>
        walk(c, nextNodes, [...choices, c.node.name || c.node.id])
      );
    }
  }
  walk(tree, [], []);
  return paths;
}

export function describePath(path) {
  const stops = path.nodes.filter((n) => getGeofence(n)).length;
  const branches =
    path.choices.length > 0 ? path.choices.join(" → ") : "唯一路線";
  return `${branches}（${stops} 個GPS點）`;
}

// --- the timeline of one path --------------------------------------------

// the first non-text condition of a step, like getCondition in scenarios.jsx
function getActiveCondition(node) {
  if (node.firstAction || !node.prevs) return null;
  return node.prevs.find((p) => p.conditionType && p.conditionType != "TEXT");
}

function getGeofence(node) {
  const active = getActiveCondition(node);
  return active && active.conditionType === "GEOFENCE" ? active : null;
}

// the performance whose end lets the next steps start
function getMainPerformance(node, data) {
  const active = getActiveCondition(node);
  const condition = active
    ? { type: active.conditionType }
    : { type: "ALWAYS" };
  const mainId = getPrevId(node);
  return getActions(node, data, condition).find((a) => a.id === mainId);
}

// how long a step takes from its trigger to its end, in milliseconds, and the
// reasons the figure may be off
async function getStepLength(node, data, audioLength) {
  const warnings = [];
  let performance;
  try {
    performance = getMainPerformance(node, data);
  } catch (e) {
    // a missing sound or image; the route can still be drawn
    warnings.push(`${e}`.replace(/\n/g, "").trim());
  }
  if (!performance) {
    return { length: 0, warnings };
  }
  const time = performance.time || {};
  let length =
    (Number(performance.delay) || 0) +
    (Number(time.minAfter) || 0) +
    (Number(time.range) || 0);
  if (time.target) {
    warnings.push(
      `「${node.name}」在固定時刻 ${time.target} 發送，路線檔無法模擬`
    );
  }
  const mainType = getMainType(node);
  if (mainType === "sound") {
    const url = performance.content.task.url;
    const measured = url ? await audioLength(url) : null;
    if (measured != null) {
      length += measured;
    } else if (node.speechLength) {
      length +=
        (Number(node.speechLength) + (Number(node.fadeOutSeconds) || 5)) * 1000;
      warnings.push(`「${node.name}」讀不到音檔長度，改用正文秒數加淡出秒數`);
    } else {
      length += DEFAULT_SOUND_MS;
      warnings.push(
        `「${node.name}」讀不到音檔長度，假設 ${DEFAULT_SOUND_MS / 1000} 秒`
      );
    }
  } else if (mainType === "dialog") {
    length += REPLY_WAIT_MS;
    warnings.push(
      `「${node.name}」等待回覆，路線在原地停留 ${
        REPLY_WAIT_MS / 1000
      } 秒；請在這段時間內回覆`
    );
  }
  return { length, warnings };
}

// the stops of a path: where to stand and for how long (ms). Steps before the
// first geofence are waited out at the first stop; steps after a stop that
// need no movement lengthen that stop.
export async function buildTimeline(path, data, audioLength) {
  const stops = [];
  const warnings = [];
  let pending = 0;
  for (const node of path.nodes) {
    const active = getActiveCondition(node);
    if (active && active.conditionType === "BEACON") {
      warnings.push(`「${node.name}」由藍牙信標觸發，路線檔無法模擬`);
    }
    const fence = getGeofence(node);
    if (fence) {
      const location = data.locations[fence.geofenceCenter];
      if (!location) {
        warnings.push(`「${node.name}」的GPS觸發地點不存在，略過`);
      } else {
        stops.push({
          name: node.name,
          lat: Number(location.lat),
          lon: Number(location.lon),
          radius: Number(fence.geofenceRadius) || 14,
          wait: STOP_MARGIN_MS + pending,
        });
        pending = 0;
      }
    }
    const step = await getStepLength(node, data, audioLength);
    warnings.push(...step.warnings);
    if (stops.length === 0) {
      pending += step.length;
    } else {
      stops[stops.length - 1].wait += step.length;
    }
  }
  return { stops, warnings };
}

// --- geometry --------------------------------------------------------------

const EARTH_RADIUS_M = 6371008.8;

export function distanceMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// the timed points of the route: walking between stops in a straight line at
// WALK_SPEED_MPS, standing still at each stop, one point every
// POINT_INTERVAL_MS. Each point is {lat, lon, time (ms), name?}.
export function buildPoints(
  stops,
  startTime = Date.now(),
  { speed = WALK_SPEED_MPS, interval = POINT_INTERVAL_MS } = {}
) {
  const points = [];
  let time = startTime;
  let position = null;
  for (const stop of stops) {
    if (position) {
      const distance = distanceMeters(position, stop);
      const steps = Math.ceil(distance / speed / (interval / 1000));
      for (let i = 1; i < steps; i++) {
        const f = i / steps;
        time += interval;
        points.push({
          lat: position.lat + (stop.lat - position.lat) * f,
          lon: position.lon + (stop.lon - position.lon) * f,
          time,
        });
      }
      if (steps > 0) time += interval;
    }
    position = { lat: stop.lat, lon: stop.lon };
    const arrival = time;
    points.push({ ...position, time, name: stop.name });
    const holds = Math.ceil(stop.wait / interval);
    for (let i = 1; i <= holds; i++) {
      points.push({ ...position, time: arrival + i * interval });
    }
    time = arrival + holds * interval;
  }
  return points;
}

export function toGpx(points, name) {
  const gpxPoints = points.map(
    (p) =>
      new Point(round(p.lat), round(p.lon), {
        time: new Date(p.time),
        ...(p.name ? { name: p.name } : {}),
      })
  );
  const builder = new BaseBuilder();
  builder.setTracks([
    new Track([new Segment(gpxPoints)], {
      name,
      desc: `步行 ${WALK_SPEED_MPS} m/s，每 ${
        POINT_INTERVAL_MS / 1000
      } 秒一點；依時間戳播放`,
    }),
  ]);
  return buildGPX(builder.toObject());
}

function round(coordinate) {
  return Math.round(coordinate * 1e7) / 1e7;
}

export function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes} 分 ${seconds} 秒`;
}

// --- audio lengths ---------------------------------------------------------

// reads a sound file's length (ms) through a media element; null when it
// cannot be read in time. Results are cached per URL for one export.
export function makeAudioLengthReader() {
  const cache = new Map();
  return (url) => {
    if (!cache.has(url)) cache.set(url, readAudioLength(url));
    return cache.get(url);
  };
}

function readAudioLength(url) {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.removeAttribute("src");
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), AUDIO_TIMEOUT_MS);
    audio.onloadedmetadata = () =>
      finish(
        Number.isFinite(audio.duration)
          ? Math.round(audio.duration * 1000)
          : null
      );
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}
