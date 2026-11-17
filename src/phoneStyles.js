// What the phone previews borrow from the story. Kept free of React so it
// can be tested with node --test.
import { getActionTree, inListOrder } from "./actionTree.js";

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

// What one INTRO_IMAGE action publishes. A field it leaves blank is
// published as null, and the phone then keeps the earlier one, so those are
// left undefined here. The switch 不使用首頁Logo publishes an empty picture,
// which does replace an earlier logo.
function introOf(action) {
  if (!action.hasIntroImage) return null;
  const given = (v) => (v !== "" && v != null ? v : undefined);
  const number = (v) => (given(v) === undefined ? undefined : Number(v));
  return {
    background: given(action.introBackground),
    logo: action.noIntroLogo ? null : given(action.introLogo),
    noLogo: action.noIntroLogo
      ? true
      : given(action.introLogo) !== undefined
      ? false
      : undefined,
    // published whenever they are filled in, even after 向下相容模式 is
    // switched off and hides them
    logoMarginTop: number(action.introLogoMarginTop),
    logoWidth: number(action.introLogoWidth),
    textColor: given(action.introTextColor),
    theme: given(action.introTheme),
    accentColor: given(action.introAccentColor),
    mapLogo: given(action.mapLogo),
  };
}

const introFields = [
  "background",
  "logo",
  "noLogo",
  "logoMarginTop",
  "logoWidth",
  "textColor",
  "theme",
  "accentColor",
  "mapLogo",
];

// the home page after the given INTRO_IMAGE actions, field by field; null
// when none ran
function mergeIntros(intros) {
  if (intros.length === 0) return null;
  const merged = Object.fromEntries(introFields.map((f) => [f, null]));
  merged.noLogo = false;
  for (const intro of intros)
    for (const f of introFields) if (intro[f] !== undefined) merged[f] = intro[f];
  return merged;
}

function mapStyleOf(action) {
  if (!action.hasMapStyle || !(action.satellite || action.mapStyle))
    return null;
  return {
    satellite: !!action.satellite,
    mapStyle: action.satellite ? null : action.mapStyle,
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
  const tree = getActionTree(
    inListOrder(Object.values(actions)).map((a) => ({ ...a }))
  );
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
// own. With `own: false` the action's own styles are left out: publishing
// sends its popup before its own style changes, so the popup shows in the
// styles it starts under.
export function stylesAt(
  action,
  actions,
  index = storyIndex(actions),
  { own = true } = {}
) {
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
  const chain = own ? [...before, action] : before;
  const nearest = (pick) =>
    chain.reduce((found, a) => pick(a) || found, null);
  return {
    button: nearest(buttonStyleOf),
    popup: nearest(popupStyleOf),
    intro: mergeIntros(chain.map(introOf).filter(Boolean)),
    map: nearest(mapStyleOf),
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
