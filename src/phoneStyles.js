// What the phone previews borrow from the story. Kept free of React so it
// can be tested with node --test.
import { getActionTree } from "./actionTree.js";

// A colour as the app reads it (Android's Color.parseColor), as CSS, or null
// when the app would ignore it. Android writes the alpha first (#AARRGGBB),
// CSS last.
export function cssColor(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  const argb = /^#([0-9a-f]{2})([0-9a-f]{6})$/i.exec(text);
  if (argb) return `#${argb[2]}${argb[1]}`;
  return null;
}

// The app shrinks a marker's picture as if it were drawn for a 640 dpi
// screen, so a picture shows at a quarter of its pixels, in dp.
export function markerSize(width, height) {
  return { width: width / 4, height: height / 4 };
}

function buttonStyleOf(action) {
  if (!action.hasButtonStyle) return null;
  return {
    backgroundColor: action.backgroundColor,
    textColor: action.textColor,
  };
}

function popupStyleOf(action) {
  if (!action.hasPopupStyle) return null;
  return {
    alertTextColor: action.alertTextColor,
    panelColor: action.panelColor,
  };
}

function introOf(action) {
  if (!action.hasIntroImage) return null;
  return {
    background: action.introBackground || null,
    logo: action.noIntroLogo ? null : action.introLogo || null,
    textColor: action.introTextColor || null,
    mapLogo: action.mapLogo || null,
  };
}

// the actions from the initial one down to `id`, along the tree the action
// list and publishing use; empty when no path leads there
function pathTo(id, actions) {
  const tree = getActionTree(Object.values(actions).map((a) => ({ ...a })));
  if (!tree) return [];
  function find(branch, path) {
    const here = [...path, branch.node];
    if (branch.node.id === id) return here;
    for (const child of branch.children) {
      const found = find(child, here);
      if (found) return found;
    }
    return null;
  }
  return (find(tree, []) || []).map((node) => actions[node.id]);
}

// The story's own styles in force when `action` runs: for each kind, the
// nearest one set on the way from the initial action, the action's own
// included. `action` is the form's values, so unsaved changes count; a new
// action is placed after its first previous step. null means the app's own.
export function stylesAt(action, actions) {
  let before = [];
  if (action.id && actions[action.id]) {
    before = pathTo(action.id, actions).slice(0, -1);
  }
  if (before.length === 0 && !action.firstAction) {
    const prev = (action.prevs || []).find((p) => p && actions[p?.prev]);
    if (prev) before = pathTo(prev.prev, actions);
  }
  const chain = [...before, action];
  const nearest = (pick) =>
    chain.reduce((found, a) => pick(a) || found, null);
  return {
    button: nearest(buttonStyleOf),
    popup: nearest(popupStyleOf),
    intro: nearest(introOf),
  };
}

// Google's own map colours, for what a story's map style leaves out
export const defaultMapColors = {
  land: "#f1f3f4",
  water: "#9cc0f9",
  park: "#c3ecb2",
  local: "#ffffff",
  arterial: "#ffffff",
  highway: "#fde293",
  label: "#5f6368",
};

// each colour of the preview's map: the feature it is, and whether it is a
// shape or the road names
const features = {
  land: ["landscape", "geometry"],
  water: ["water", "geometry"],
  park: ["poi.park", "geometry"],
  local: ["road.local", "geometry"],
  arterial: ["road.arterial", "geometry"],
  highway: ["road.highway", "geometry"],
  label: ["road", "labels"],
};

function ruleCovers(rule, feature, element) {
  const type = rule.featureType;
  const coversFeature =
    !type ||
    type === "all" ||
    feature === type ||
    feature.startsWith(type + ".");
  const kind = rule.elementType;
  const coversElement =
    !kind ||
    kind === "all" ||
    // a shape's fill, or the text's fill for the names
    (element === "geometry"
      ? ["geometry", "geometry.fill"].includes(kind)
      : ["labels", "labels.text", "labels.text.fill"].includes(kind));
  return coversFeature && coversElement;
}

// The preview map's colours under a Google Maps style (the JSON a map style
// record holds): its rules in order, later ones winning, with Google's own
// colours where it says nothing. null means the feature is hidden.
export function mapColors(style) {
  const colors = { ...defaultMapColors };
  if (!Array.isArray(style)) return colors;
  for (const rule of style) {
    if (!rule || !Array.isArray(rule.stylers)) continue;
    for (const [name, [feature, element]] of Object.entries(features)) {
      if (!ruleCovers(rule, feature, element)) continue;
      for (const styler of rule.stylers) {
        if (styler?.visibility === "off") colors[name] = null;
        else if (styler?.visibility === "on" && colors[name] === null)
          colors[name] = defaultMapColors[name];
        const color = cssColor(styler?.color);
        if (color) colors[name] = color;
      }
    }
  }
  return colors;
}
