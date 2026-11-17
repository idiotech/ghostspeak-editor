// The home page's colours, worked out as the phone app's IntroTheme.resolve
// and MainFragment do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { introColors } from "./introTheme.js";

const appText = "#F2F2F7";

test("the app's own dark look", () => {
  assert.deepEqual(introColors({}), {
    lightBars: false,
    text: appText,
    title: "#FFFFFF",
    wordmarkTint: null,
    buttonFill: null,
    buttonText: "#4B3E20",
  });
});

test("the light theme darkens the bars, the text, the title and the wordmark", () => {
  const c = introColors({ theme: "light" });
  assert.equal(c.lightBars, true);
  assert.equal(c.text, "#1C1C1E");
  assert.equal(c.title, "#1C1C1E");
  assert.equal(c.wordmarkTint, "#1E3A2E");
});

test("the theme is read whatever its case", () => {
  assert.equal(introColors({ theme: "Light" }).lightBars, true);
});

test("the story's text colour colours the text and title in either theme", () => {
  assert.equal(introColors({ textColor: "#ff0000" }).title, "#ff0000");
  assert.equal(introColors({ textColor: "#ff0000" }).text, "#ff0000");
  const light = introColors({ theme: "light", textColor: "#ff0000" });
  assert.equal(light.text, "#ff0000");
  assert.equal(light.wordmarkTint, "#ff0000");
});

test("the story's text colour leaves the wordmark white on the dark look", () => {
  assert.equal(introColors({ textColor: "#ff0000" }).wordmarkTint, null);
});

test("an accent fills the buttons with white labels", () => {
  const c = introColors({ accentColor: "#42928D" });
  assert.equal(c.buttonFill, "#42928D");
  assert.equal(c.buttonText, "#FFFFFF");
});

test("a button style wins over the accent", () => {
  const c = introColors({
    accentColor: "#42928D",
    buttonBackground: "#c62828",
    buttonText: "#000000",
  });
  assert.equal(c.buttonFill, "#c62828");
  assert.equal(c.buttonText, "#000000");
});

test("a button style's text colour is kept on the accent", () => {
  assert.equal(
    introColors({ accentColor: "#42928D", buttonText: "#000000" }).buttonText,
    "#000000"
  );
});

test("colours are read as the app reads them", () => {
  assert.equal(introColors({ accentColor: "#8042928D" }).buttonFill, "#42928D80");
  assert.equal(introColors({ accentColor: "teal" }).buttonFill, "#008080");
  assert.equal(introColors({ accentColor: "nonsense" }).buttonFill, null);
});
