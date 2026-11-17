// What the phone previews borrow from the story: the colours the app is
// given, how big it draws a marker, and the styles in force at an action.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cssColor,
  markerSize,
  stylesAt,
  mapColors,
  defaultMapColors,
  storyIndex,
  logoBox,
} from "./phoneStyles.js";

test("a #RRGGBB colour is used as it is", () => {
  assert.equal(cssColor("#59a0ff"), "#59a0ff");
});

test("Android's #AARRGGBB puts the alpha first; CSS puts it last", () => {
  assert.equal(cssColor("#59202020"), "#20202059");
});

test("a colour the app cannot read is ignored, as the app ignores it", () => {
  assert.equal(cssColor(""), null);
  assert.equal(cssColor(undefined), null);
  assert.equal(cssColor("#12345"), null);
  assert.equal(cssColor("blue-ish"), null);
});

test("the colour names Android knows are read too", () => {
  assert.equal(cssColor("red"), "#ff0000");
  assert.equal(cssColor("DarkGray"), "#444444");
  assert.equal(cssColor("brown"), null);
});

test("spaces around a colour are dropped", () => {
  assert.equal(cssColor(" #FFFFFF "), "#FFFFFF");
});

test("a hidden feature shown again keeps the colour set before", () => {
  const colors = mapColors([
    { featureType: "water", stylers: [{ color: "#000033" }] },
    { featureType: "water", stylers: [{ visibility: "off" }] },
    { featureType: "water", stylers: [{ visibility: "on" }] },
  ]);
  assert.equal(colors.water, "#000033");
});

test("a marker icon is drawn at a quarter of its pixels, in dp", () => {
  assert.deepEqual(markerSize(192, 256), { width: 48, height: 64 });
});

const start = { id: "start", firstAction: true };
const step = (id, prev, extra = {}) => ({
  id,
  prevs: [{ prev }],
  ...extra,
});
const map = (...actions) => Object.fromEntries(actions.map((a) => [a.id, a]));

test("with no style action the app's own styles apply", () => {
  const a = step("a", "start");
  assert.deepEqual(stylesAt(a, map(start, a)), {
    button: null,
    popup: null,
    intro: null,
  });
});

test("a button style set earlier on the way applies", () => {
  const style = step("style", "start", {
    hasButtonStyle: true,
    backgroundColor: "#ff0000",
    textColor: "#ffffff",
  });
  const a = step("a", "style");
  const styles = stylesAt(a, map(start, style, a));
  assert.deepEqual(styles.button, {
    backgroundColor: "#ff0000",
    textColor: "#ffffff",
  });
});

test("the nearest earlier style wins", () => {
  const red = step("red", "start", {
    hasButtonStyle: true,
    backgroundColor: "#ff0000",
  });
  const blue = step("blue", "red", {
    hasButtonStyle: true,
    backgroundColor: "#0000ff",
  });
  const a = step("a", "blue");
  assert.equal(
    stylesAt(a, map(start, red, blue, a)).button.backgroundColor,
    "#0000ff"
  );
});

test("a style on another branch does not apply", () => {
  const branch = step("branch", "start", {
    hasPopupStyle: true,
    alertTextColor: "#ff0000",
  });
  const a = step("a", "start");
  assert.equal(stylesAt(a, map(start, branch, a)).popup, null);
});

test("the action's own style applies to its own popup", () => {
  const a = step("a", "start", {
    hasPopupStyle: true,
    alertTextColor: "#ff0000",
    panelColor: "#59202020",
  });
  assert.deepEqual(stylesAt(a, map(start, a)).popup, {
    alertTextColor: "#ff0000",
    panelColor: "#59202020",
  });
});

test("the form's unsaved values are used, not the saved record", () => {
  const saved = step("a", "start");
  const editing = { ...saved, hasButtonStyle: true, textColor: "#00ff00" };
  assert.equal(
    stylesAt(editing, map(start, saved)).button.textColor,
    "#00ff00"
  );
});

test("a new action follows the action it comes after", () => {
  const style = step("style", "start", {
    hasButtonStyle: true,
    backgroundColor: "#ff0000",
  });
  const fresh = { prevs: [{ prev: "style" }] };
  assert.equal(
    stylesAt(fresh, map(start, style)).button.backgroundColor,
    "#ff0000"
  );
});

test("the home page images and text colour come along", () => {
  const intro = {
    ...start,
    hasIntroImage: true,
    introBackground: "bg",
    introLogo: "logo",
    noIntroLogo: false,
    introTextColor: "#ffeeaa",
    mapLogo: "mapLogo",
  };
  const a = step("a", "start");
  assert.deepEqual(stylesAt(a, map(intro, a)).intro, {
    background: "bg",
    logo: "logo",
    noLogo: false,
    logoMarginTop: null,
    logoWidth: null,
    textColor: "#ffeeaa",
    mapLogo: "mapLogo",
  });
});

test("a home page set to have no logo has none", () => {
  const intro = { ...start, hasIntroImage: true, introLogo: "logo", noIntroLogo: true };
  const styles = stylesAt(intro, map(intro));
  assert.equal(styles.intro.logo, null);
  assert.equal(styles.intro.noLogo, true);
});

test("the old logo placement is used only in its compatibility mode", () => {
  const placed = {
    ...start,
    hasIntroImage: true,
    introLogo: "logo",
    introLogoMarginTop: 40,
    introLogoWidth: 100,
  };
  assert.equal(stylesAt(placed, map(placed)).intro.logoWidth, null);
  const advanced = { ...placed, advancedLogo: true };
  const intro = stylesAt(advanced, map(advanced)).intro;
  assert.equal(intro.logoMarginTop, 40);
  assert.equal(intro.logoWidth, 100);
});

test("a story's logo fits 220×300, centred above the 59% line", () => {
  assert.deepEqual(logoBox({}, 740), {
    width: 220,
    height: 300,
    top: (740 * 0.59 - 300) / 2,
  });
});

test("the old placement sets the logo's top margin and width", () => {
  const box = logoBox({ marginTop: 40, width: 100 }, 740);
  assert.equal(box.width, 100);
  // still centred, between the margin and the line
  assert.equal(box.top, 40 + (740 * 0.59 - 40 - 300) / 2);
});

test("an action that loops back still finds its way from the start", () => {
  const a = { id: "a", prevs: [{ prev: "start" }, { prev: "b" }] };
  const b = step("b", "a", { hasButtonStyle: true, textColor: "#123456" });
  assert.equal(stylesAt(a, map(start, a, b)).button, null);
  assert.equal(stylesAt(b, map(start, a, b)).button.textColor, "#123456");
});

test("an unsaved change of previous step is followed", () => {
  const red = step("red", "start", { hasButtonStyle: true, textColor: "#ff0000" });
  const blue = step("blue", "start", { hasButtonStyle: true, textColor: "#0000ff" });
  const saved = step("a", "red");
  const moved = { ...saved, prevs: [{ prev: "blue" }] };
  assert.equal(
    stylesAt(moved, map(start, red, blue, saved)).button.textColor,
    "#0000ff"
  );
});

test("the index can be built once and reused for every lookup", () => {
  const style = step("style", "start", { hasButtonStyle: true, textColor: "#123456" });
  const a = step("a", "style");
  const actions = map(start, style, a);
  const index = storyIndex(actions);
  assert.equal(stylesAt(a, actions, index).button.textColor, "#123456");
});

test("an action nothing leads to gets only its own styles", () => {
  const lost = { id: "lost", prevs: [], hasButtonStyle: true, textColor: "#000000" };
  assert.equal(stylesAt(lost, map(start, lost)).button.textColor, "#000000");
});

test("a map style recolours the features it names", () => {
  const colors = mapColors([
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000033" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#444444" }] },
  ]);
  assert.equal(colors.water, "#000033");
  assert.equal(colors.local, "#444444");
});

test("a feature the style does not name keeps Google's own colour", () => {
  const colors = mapColors([
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000033" }] },
  ]);
  assert.equal(colors.park, defaultMapColors.park);
});

test("a general rule covers the features under it", () => {
  const colors = mapColors([
    { elementType: "geometry", stylers: [{ color: "#111111" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#555555" }] },
  ]);
  assert.equal(colors.local, "#555555");
  assert.equal(colors.arterial, "#555555");
  assert.equal(colors.land, "#111111");
});

test("a later rule wins over an earlier one, as on Google's maps", () => {
  const colors = mapColors([
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#555555" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#666666" }] },
  ]);
  assert.equal(colors.local, "#666666");
});

test("a hidden feature is not drawn", () => {
  const colors = mapColors([
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", stylers: [{ visibility: "off" }] },
  ]);
  assert.equal(colors.label, null);
  assert.equal(colors.park, null);
});

test("a style that is not a list of rules gives Google's own colours", () => {
  assert.deepEqual(mapColors({ nonsense: true }), defaultMapColors);
  assert.deepEqual(mapColors(null), defaultMapColors);
});
