// What the phone previews borrow from the story. Kept free of React so it
// can be tested with node --test.
import { getActionTree } from "./actionTree.js";

// A colour as the app reads it (Android's Color.parseColor), as CSS, or null
// when the app would ignore it. Android writes the alpha first (#AARRGGBB),
// CSS last.
export function cssColor(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  const named = androidColorNames[text.toLowerCase()];
  if (named) return named;
  const argb = /^#([0-9a-f]{2})([0-9a-f]{6})$/i.exec(text);
  if (argb) return `#${argb[2]}${argb[1]}`;
  return null;
}

// the names Color.parseColor accepts besides #RRGGBB and #AARRGGBB
const androidColorNames = {
  black: "#000000",
  darkgray: "#444444",
  darkgrey: "#444444",
  gray: "#888888",
  grey: "#888888",
  lightgray: "#cccccc",
  lightgrey: "#cccccc",
  white: "#ffffff",
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  aqua: "#00ffff",
  fuchsia: "#ff00ff",
  lime: "#00ff00",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  purple: "#800080",
  silver: "#c0c0c0",
  teal: "#008080",
};

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
  const noLogo = !!action.noIntroLogo;
  // the logo's own placement, published only in the compatibility mode
  const placed = !noLogo && action.advancedLogo;
  const number = (v) => (placed && v !== "" && v != null ? Number(v) : null);
  return {
    background: action.introBackground || null,
    logo: noLogo ? null : action.introLogo || null,
    noLogo,
    logoMarginTop: number(action.introLogoMarginTop),
    logoWidth: number(action.introLogoWidth),
    textColor: action.introTextColor || null,
    mapLogo: action.mapLogo || null,
  };
}

// Where the intro screen draws a story's logo (activity_intro.xml's
// title_logo): 220 wide unless the story sets a width, 300 tall (the app
// ignores a story's height), fitted inside and centred between its top
// margin and the guideline 59% down the screen.
export function logoBox({ marginTop, width } = {}, screenHeight) {
  const height = 300;
  const from = marginTop || 0;
  return {
    width: width || 220,
    height,
    top: from + (screenHeight * 0.59 - from - height) / 2,
  };
}

// The story's tree, the one the action list and publishing use, indexed by
// each action's parent in it. Build it once per set of actions and pass it
// to stylesAt.
export function storyIndex(actions) {
  const parents = new Map();
  const tree = getActionTree(Object.values(actions).map((a) => ({ ...a })));
  function walk(branch) {
    branch.children.forEach((child) => {
      parents.set(child.node.id, branch.node.id);
      walk(child);
    });
  }
  if (tree) {
    parents.set(tree.node.id, null);
    walk(tree);
  }
  return parents;
}

// the actions from the initial one down to `id`; empty when no path leads
// there
function pathTo(id, actions, index) {
  if (!index.has(id)) return [];
  const path = [];
  for (let at = id; at != null; at = index.get(at)) path.unshift(actions[at]);
  return path;
}

// The story's own styles in force when `action` runs: for each kind, the
// nearest one set on the way from the initial action, the action's own
// included. `action` is the form's values, so unsaved changes count,
// including a changed previous step: the way in is the saved one while it
// is still among the previous steps, else the first previous step that the
// story reaches without passing through this action. null means the app's
// own.
export function stylesAt(action, actions, index = storyIndex(actions)) {
  let before = [];
  if (!action.firstAction) {
    const prevIds = (action.prevs || []).map((p) => p?.prev).filter(Boolean);
    const savedParent = action.id ? index.get(action.id) : undefined;
    const candidates = prevIds.includes(savedParent)
      ? [savedParent, ...prevIds]
      : prevIds;
    for (const id of candidates) {
      const path = pathTo(id, actions, index);
      // a step that comes after this action loops back; it is not the way in
      if (path.length > 0 && !path.some((a) => a.id === action.id)) {
        before = path;
        break;
      }
    }
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
  // a hidden feature keeps its colour for when a later rule shows it again
  const hidden = {};
  for (const rule of style) {
    if (!rule || !Array.isArray(rule.stylers)) continue;
    for (const [name, [feature, element]] of Object.entries(features)) {
      if (!ruleCovers(rule, feature, element)) continue;
      for (const styler of rule.stylers) {
        if (styler?.visibility === "off") hidden[name] = true;
        else if (styler?.visibility === "on") hidden[name] = false;
        const color = cssColor(styler?.color);
        if (color) colors[name] = color;
      }
    }
  }
  for (const name of Object.keys(hidden))
    if (hidden[name]) colors[name] = null;
  return colors;
}
