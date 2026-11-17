// The home page's colours, as the phone app works them out
// (ghostspeak-client intro: IntroTheme.resolve and MainFragment). Kept free
// of React so it can be tested with node --test.
import { cssColor } from "./phoneStyles.js";

const appText = "#F2F2F7"; // text_primary
const lightText = "#1C1C1E"; // the design's text on the light paper
const lightWordmark = "#1E3A2E"; // the design's dark green wordmark
const appButtonText = "#4B3E20"; // intro_start_text

// `theme`, `textColor` and `accentColor` are the story's INTRO_IMAGE
// fields; `buttonBackground` and `buttonText` its BUTTON_STYLE, all as the
// story wrote them.
export function introColors({
  theme,
  textColor,
  accentColor,
  buttonBackground,
  buttonText,
}) {
  const light = String(theme || "").toLowerCase() === "light";
  const storyText = cssColor(textColor);
  const text = storyText || (light ? lightText : appText);
  // a button style's own background wins over the accent
  const styleFill = cssColor(buttonBackground);
  const accent = styleFill ? null : cssColor(accentColor);
  return {
    lightBars: light,
    text,
    // the title stays white on the app's own look
    title: light || storyText ? text : "#FFFFFF",
    // the app's own wordmark, when the story has no logo; white when null
    wordmarkTint: light ? storyText || lightWordmark : null,
    buttonFill: styleFill || accent,
    // the label follows the fill: the button style's, white on the accent,
    // else the layout's own
    buttonText: cssColor(buttonText) || (accent ? "#FFFFFF" : appButtonText),
  };
}
