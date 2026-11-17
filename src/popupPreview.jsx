import * as React from "react";
import { logoBox, markerSize } from "./phoneStyles";

// Previews of the three popup screens, drawn the way the Android app lays
// them out (ghostspeak-client: popup/res/layout/activity_single_popup.xml,
// activity_script_detail.xml, dialog_text.xml, dialog_reply.xml,
// intro/res/layout/fragment_intro_script.xml and activity_intro.xml) on a
// 360dp-wide phone. One px here stands for one dp there; the colours, sizes
// and fonts are the app's resources, named in the comments. The colours and
// pictures a story sets itself (the BUTTON_STYLE, POPUP_STYLE and
// INTRO_IMAGE actions) come in as `look`; without them the previews show the
// app's own.

const phoneWidth = 360;
const phoneHeight = 740;
// Roboto and Noto Sans CJK, as on Android
const fontFamily =
  "Roboto, 'Noto Sans TC', 'Noto Sans CJK TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
const fontsHref =
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;900&family=Noto+Sans+TC:wght@400;500;900&display=swap";
const textPrimary = "#F2F2F7"; // text_primary
const textSecondary = "rgba(242, 242, 247, 0.7)"; // text_secondary
const textHint = "#636366"; // text_hint
const textBlack = "#20221B"; // text_black: BigButtonStyle and SmallButtonStyle
const introStartText = "#4B3E20"; // intro_start_text: dialog and intro choices
const hairline = "rgba(255, 255, 255, 0.3)"; // transparent_white_30
const buttonBackground = "rgba(104, 227, 220, 0.8)"; // button_background
const statusBarScrim = "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0))"; // status_bar_scrim

// the fonts are only for the previews, so the page loads them when one shows
function useAppFonts() {
  React.useEffect(() => {
    if (document.querySelector(`link[href="${fontsHref}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontsHref;
    document.head.appendChild(link);
  }, []);
}

// the phone's screen, edge to edge under a transparent status bar; `scale`
// shrinks the whole screen for the smaller previews
export function Phone({ background, children, scale = 1 }) {
  useAppFonts();
  const screen = (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: phoneWidth,
        height: phoneHeight,
        borderRadius: 28,
        overflow: "hidden",
        background: "#000",
        fontFamily,
        fontWeight: 400,
        color: textPrimary,
        textAlign: "left",
      }}
    >
      {background}
      {statusBar}
      {children}
    </div>
  );
  if (scale === 1) return screen;
  return (
    <div
      style={{
        flex: "0 0 auto",
        width: phoneWidth * scale,
        height: phoneHeight * scale,
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {screen}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 24,
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        color: "white",
        textShadow: "0 0 2px rgba(0, 0, 0, 0.5)",
      }}
    >
      <span>12:00</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span
          style={{
            width: 14,
            height: 10,
            background: "white",
            clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
          }}
        />
        <span
          style={{
            boxSizing: "border-box",
            width: 20,
            height: 10,
            border: "1px solid white",
            borderRadius: 2,
            background:
              "linear-gradient(to right, white 0 70%, transparent 70%) no-repeat",
            backgroundOrigin: "content-box",
            padding: 1,
          }}
        />
      </span>
    </div>
  );
}

// the app's own map: style_json_dark.json's colours
export const darkMapColors = {
  land: "#2b1803",
  park: "#042f1a",
  water: "#0c1422",
  local: "#50493f", // road.local
  arterial: "#343e18", // road.arterial
  highway: "#746855",
  highwayEdge: "#1f2835",
  label: "#9ca5b3", // road labels.text.fill
};

// a made-up aerial view for the satellite map
const satelliteColors = {
  land: "#46503a",
  park: "#2f4524",
  water: "#1b2a33",
  local: "#7d7a70",
  arterial: "#8c887c",
  highway: "#9a9585",
  label: null,
};

// the map screen the popups open over, in the app's colours unless a map
// style gives others (null hides a feature), with Google's blue location dot
export function MapBackground({ colors = darkMapColors, satellite = false }) {
  const c = satellite ? satelliteColors : colors;
  const local = { stroke: c.local, strokeWidth: 3 };
  const arterial = { stroke: c.arterial, strokeWidth: 6 };
  const label = {
    fill: c.label,
    fontSize: 9,
    fontFamily,
  };
  return (
    <>
      <svg
        width={phoneWidth}
        height={phoneHeight}
        viewBox={`0 0 ${phoneWidth} ${phoneHeight}`}
        style={{ position: "absolute", top: 0, left: 0, display: "block" }}
      >
        <rect width="100%" height="100%" fill={c.land || "#f1f3f4"} />
        <g transform="rotate(-14 180 370)">
          {c.park && (
            <>
              <rect x="-60" y="60" width="190" height="130" fill={c.park} />
              <rect x="220" y="480" width="240" height="170" fill={c.park} />
            </>
          )}
          {c.water && (
            <path
              d="M 300 -120 C 345 100, 320 260, 410 420 L 560 420 L 560 -120 Z"
              fill={c.water}
            />
          )}
          {c.local && (
            <g {...local}>
              <line x1="-120" y1="130" x2="520" y2="130" />
              <line x1="-120" y1="250" x2="520" y2="250" />
              <line x1="-120" y1="330" x2="520" y2="330" />
              <line x1="-120" y1="560" x2="520" y2="560" />
              <line x1="-120" y1="650" x2="520" y2="650" />
              <line x1="20" y1="-120" x2="20" y2="860" />
              <line x1="100" y1="-120" x2="100" y2="860" />
              <line x1="260" y1="-120" x2="260" y2="860" />
            </g>
          )}
          {c.arterial && (
            <g {...arterial}>
              <line x1="-120" y1="450" x2="520" y2="450" />
              <line x1="180" y1="-120" x2="180" y2="860" />
            </g>
          )}
          {c.highway && c.highwayEdge && (
            <line
              x1="-120"
              y1="620"
              x2="520"
              y2="40"
              stroke={c.highwayEdge}
              strokeWidth="12"
            />
          )}
          {c.highway && (
            <line
              x1="-120"
              y1="620"
              x2="520"
              y2="40"
              stroke={c.highway}
              strokeWidth="8"
            />
          )}
          {c.label && (
            <>
              <text x="36" y="126" {...label}>
                中山路
              </text>
              <text x="192" y="300" {...label}>
                民生街
              </text>
              <text x="-30" y="446" {...label}>
                大橋頭路
              </text>
            </>
          )}
        </g>
        <circle cx={dotX} cy={dotY} r="30" fill="#4285F4" opacity="0.2" />
        <circle
          cx={dotX}
          cy={dotY}
          r="7"
          fill="#4285F4"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      {/* the scrim under the status bar: activity_map.xml's 96dp view */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 96,
          background: statusBarScrim,
        }}
      />
    </>
  );
}

// where the player stands on the preview map
const dotX = 180;
const dotY = 430;

// the intro screen behind the script: activity_intro.xml's background picture
// and logo (the app's own, unless the story sets its own), and the top bar's
// scrim and settings button (setting/res/layout/top_bar.xml)
function IntroBackground({ backgroundSrc, logoSrc, noLogo, logoPlacement }) {
  // the app's logo is 139×79, centred above the 59% guideline; a story's
  // own goes where logoBox puts it; with 不使用首頁Logo the editor publishes
  // a transparent picture, so there is none
  const logo = noLogo
    ? null
    : logoSrc
    ? { src: logoSrc, ...logoBox(logoPlacement || {}, phoneHeight) }
    : {
        src: "/preview/intro_logo.png",
        width: 139,
        height: 79,
        top: (phoneHeight * 0.59 - 79) / 2,
      };
  return (
    <>
      <img
        src={backgroundSrc || "/preview/intro_background.jpg"}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {logo && (
        <img
          src={logo.src}
          alt=""
          style={{
            position: "absolute",
            width: logo.width,
            height: logo.height,
            objectFit: "contain",
            left: (phoneWidth - logo.width) / 2,
            top: logo.top,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 93,
          background: statusBarScrim,
        }}
      />
      <svg
        width="40"
        height="40"
        viewBox="-20 -20 40 40"
        style={{ position: "absolute", top: 53, right: 16 }}
      >
        <circle r="20" fill="rgba(0, 0, 0, 0.45)" />
        <g stroke="white" strokeWidth="2" fill="none">
          <circle r="4" />
          <circle r="7.5" strokeDasharray="2.9 3" strokeWidth="4" />
        </g>
      </svg>
    </>
  );
}

// the static parts of the screens, built once so that typing in the form
// only re-renders the panels
const statusBar = <StatusBar />;
const mapBackground = <MapBackground />;
const introBackground = <IntroBackground />;

// the map, in the story's map style when an earlier MAP_STYLE set one
const mapBackgroundFor = (look) =>
  look.mapColors || look.mapSatellite ? (
    <MapBackground
      colors={look.mapColors || undefined}
      satellite={look.mapSatellite}
    />
  ) : (
    mapBackground
  );

// the intro screen, with the story's own picture and logo when it sets them
const introBackgroundFor = (look) =>
  look.introBackgroundSrc || look.introLogoSrc || look.introNoLogo ? (
    <IntroBackground
      backgroundSrc={look.introBackgroundSrc}
      logoSrc={look.introLogoSrc}
      noLogo={look.introNoLogo}
      logoPlacement={look.introLogoPlacement}
    />
  ) : (
    introBackground
  );

// the popup panel, tinted with the story's panel colour (POPUP_STYLE's
// panelColor replaces BlurView's overlay colour)
const panelFor = (look) =>
  look.panel ? { ...panelStyle, background: look.panel } : panelStyle;

// a button in the story's colours (BUTTON_STYLE): BasePopupFragment and
// MainFragment replace the background's colour and the text's
const styled = (style, look) => ({
  ...style,
  ...(look.buttonBackground ? { background: look.buttonBackground } : {}),
  ...(look.buttonText ? { color: look.buttonText } : {}),
});

// A ScrollView: shows the start of its content, or the end when `bottom` is
// set (the dialog scrolls to its newest message), and marks the clipped edge
// when there is more than fits, since the phone scrolls where this cannot.
function ScrollArea({ bottom, style, innerStyle, children }) {
  const ref = React.useRef(null);
  const [clipped, setClipped] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      if (bottom) el.scrollTop = el.scrollHeight;
      setClipped(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    // pictures change the height once they load
    const pictures = Array.from(el.querySelectorAll("img"));
    pictures.forEach((p) => p.addEventListener("load", measure));
    return () =>
      pictures.forEach((p) => p.removeEventListener("load", measure));
  });
  return (
    <div style={{ position: "relative", minHeight: 0, ...style }}>
      <div
        ref={ref}
        style={{
          boxSizing: "border-box",
          height: "100%",
          overflow: "hidden",
          ...innerStyle,
        }}
      >
        {children}
      </div>
      {clipped && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            [bottom ? "top" : "bottom"]: 0,
            height: 48,
            display: "flex",
            alignItems: bottom ? "flex-start" : "flex-end",
            justifyContent: "center",
            paddingBottom: bottom ? 0 : 6,
            paddingTop: bottom ? 6 : 0,
            background: `linear-gradient(${
              bottom ? "" : "to top, "
            }rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0))`,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 10,
              background: "rgba(0, 0, 0, 0.6)",
              color: "white",
              fontSize: 11,
              lineHeight: "16px",
              letterSpacing: "0.05em",
            }}
          >
            {bottom ? "▲ 手機上可往上捲動" : "▼ 手機上可往下捲動"}
          </span>
        </div>
      )}
    </div>
  );
}

// BlurView with dialog_background and blur_overlay_color
const panelStyle = {
  boxSizing: "border-box",
  background: "rgba(128, 128, 128, 0.33)",
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
  border: `1px solid ${hairline}`,
  borderRadius: 30,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

// Buttons on drawable/button: Material's 48dp minimum height and 2dp shadow
const buttonBase = {
  boxSizing: "border-box",
  minHeight: 48,
  padding: "8px 10px",
  background: buttonBackground,
  borderRadius: 12,
  boxShadow: "0 1px 1px rgba(0, 0, 0, 0.24), 0 1px 3px rgba(0, 0, 0, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  overflowWrap: "anywhere",
};
// BigButtonStyle's type: 16sp sans-serif-black, spaced out, as written
const bigType = {
  fontSize: 16,
  lineHeight: "19px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};
// SmallButtonStyle's and dialog_choice_button's: Material's 14sp medium capitals
const smallType = {
  fontSize: 14,
  lineHeight: "16px",
  fontWeight: 500,
  textTransform: "uppercase",
};
const bigButton = { ...buttonBase, ...bigType, color: textBlack };
const smallButton = { ...buttonBase, ...smallType, color: textBlack };

// the horizontal row of choice buttons, each with layout_weight 1 and 8dp
// of padding (alert_choice_button.xml, dialog_choice_button.xml)
function ButtonRow({ choices, big, color, style, look = {} }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: big ? "flex-start" : "stretch",
        ...style,
      }}
    >
      {choices.map((c, i) => (
        <div
          key={"choice" + i}
          style={styled(
            {
              ...(big ? bigButton : smallButton),
              padding: 8,
              color,
              flex: "1 1 0",
              minWidth: 0,
              margin: "0 8px",
            },
            look
          )}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

// the typed-reply row: an EditText in the button style on drawable/text_input
// at 16sp, then the send button 16dp to its right
function TextReply({
  big,
  label = "送出",
  color = textBlack,
  style,
  itemStyle,
  look = {},
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", ...style }}>
      <div
        style={{
          ...(big ? bigType : smallType),
          fontSize: 16,
          lineHeight: "19px",
          flex: "1 1 0",
          minWidth: 0,
          boxSizing: "border-box",
          minHeight: 48,
          padding: "8px 10px",
          background: "#1C1C1E",
          border: `1px solid ${textHint}`,
          borderRadius: 13,
          color: textHint,
          display: "flex",
          alignItems: "center",
          ...itemStyle,
        }}
      >
        您的回答
      </div>
      <div
        style={styled(
          {
            ...(big ? bigButton : smallButton),
            minWidth: 88,
            marginLeft: 16,
            color,
            ...itemStyle,
          },
          look
        )}
      >
        {label}
      </div>
    </div>
  );
}

// 提示視窗: activity_single_popup.xml, centred over the map; the panel grows
// with its content up to the screen's margins, then scrolls
export function AlertPreview({
  text,
  choices,
  allowTextReply,
  imageSrc,
  look = {},
  scale,
}) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <Phone background={mapBackgroundFor(look)} scale={scale}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...panelFor(look),
            margin: "24px 28px",
            maxHeight: phoneHeight - 48,
          }}
        >
          <ScrollArea style={{ flex: "0 1 auto" }}>
            {imageSrc && (
              <img
                src={imageSrc}
                alt=""
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  boxSizing: "border-box",
                  padding: 1,
                  borderRadius: "30px 30px 0 0",
                }}
              />
            )}
            {(text || hasInput) && (
              <div style={{ paddingTop: 8, paddingBottom: 32 }}>
                {text && (
                  <div
                    style={{
                      margin: "24px 16px 0",
                      padding: "0 20px",
                      fontSize: 17,
                      lineHeight: "24px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      // POPUP_STYLE's alertTextColor (AlertFragment)
                      ...(look.alertText ? { color: look.alertText } : {}),
                    }}
                  >
                    {text}
                  </div>
                )}
                {hasInput && (
                  <div style={{ marginTop: 16 }}>
                    {choices.length > 0 && (
                      <ButtonRow
                        choices={choices}
                        big
                        color={textBlack}
                        style={{ margin: "0 16px" }}
                        look={look}
                      />
                    )}
                    {allowTextReply && (
                      <TextReply
                        big
                        look={look}
                        style={{
                          margin: choices.length > 0 ? "16px 16px 0" : "0 16px",
                          padding: "0 8px",
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </Phone>
  );
}

// one chat bubble: dialog_text.xml (a character, on the left) or
// dialog_reply.xml (the player, on the right), at most 75% of the row
function Bubble({ self, text, imageSrc, sender }) {
  const named = !self && sender;
  const portraitSrc = named && sender.portraitSrc;
  // a picture on its own shows without a bubble (DialogFragment)
  const bare = !text && imageSrc;
  const bubble = self
    ? {
        background:
          "linear-gradient(to left, rgba(143, 242, 224, 0.15), rgba(143, 242, 224, 0.35))",
        borderRadius: "18px 4px 18px 18px",
      }
    : {
        background:
          "linear-gradient(to left, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.4))",
        borderRadius: "4px 18px 18px 18px",
      };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: self ? "flex-end" : "flex-start",
        marginTop: 16,
      }}
    >
      {portraitSrc && (
        <img
          src={portraitSrc}
          alt=""
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            objectFit: "cover",
            flex: "0 0 auto",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: self ? "flex-end" : "flex-start",
          marginLeft: portraitSrc ? 8 : 0,
          maxWidth: portraitSrc ? "calc(75% - 44px)" : "75%",
          minWidth: 0,
        }}
      >
        {named && (
          <div
            style={{
              maxWidth: "100%",
              fontSize: 12,
              lineHeight: "16px",
              color: textSecondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sender.name}
          </div>
        )}
        <div
          style={{
            boxSizing: "border-box",
            maxWidth: "100%",
            marginTop: named ? 4 : 0,
            ...(bare
              ? {}
              : {
                  ...bubble,
                  padding: "10px 14px",
                  border: `0.5px solid ${hairline}`,
                }),
            fontSize: 15,
            lineHeight: "22px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: 320,
                marginTop: text ? 8 : 0,
                borderRadius: 12,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 對話視窗: activity_script_detail.xml, 85.5% of the width and 84% of the
// height, with the conversation so far above the new message
export function DialogPreview({
  text,
  choices,
  allowTextReply,
  imageSrc,
  sender,
  look = {},
  scale,
}) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <Phone background={mapBackgroundFor(look)} scale={scale}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...panelFor(look),
            width: phoneWidth * 0.855,
            height: phoneHeight * 0.84,
          }}
        >
          <ScrollArea
            bottom
            style={{ flex: "1 1 0" }}
            innerStyle={{ padding: "0 24px 24px" }}
          >
            <Bubble self text="……" />
            {(text || imageSrc) && (
              <Bubble text={text} imageSrc={imageSrc} sender={sender} />
            )}
          </ScrollArea>
          {hasInput && (
            <div
              style={{
                flex: "0 0 auto",
                borderTop: `0.5px solid ${hairline}`,
                padding: "8px 16px 32px",
              }}
            >
              {choices.length > 0 && (
                <ButtonRow
                  choices={choices}
                  color={introStartText}
                  style={{ marginTop: 16 }}
                  look={look}
                />
              )}
              {allowTextReply && (
                <TextReply
                  look={look}
                  style={{ marginTop: 16, padding: "0 8px" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Phone>
  );
}

// 前情提要: fragment_intro_script.xml, straight on the intro screen without a
// panel; the text starts 40% of the way down and the buttons stack at the
// bottom
export function IntroPreview({
  text,
  choices,
  allowTextReply,
  scenarioName,
  look = {},
  scale,
}) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <Phone background={introBackgroundFor(look)} scale={scale}>
      <div
        style={{
          position: "absolute",
          top: 24,
          bottom: 24,
          left: 28,
          right: 28,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScrollArea style={{ flex: "1 1 0" }}>
          <div style={{ paddingBottom: 16 }}>
            <div style={{ height: phoneHeight * 0.4 }} />
            <div style={{ paddingBottom: 16 }}>
              <div
                style={{
                  marginTop: 32,
                  fontSize: 20,
                  lineHeight: "26px",
                  textAlign: "center",
                  color: "white",
                }}
              >
                {scenarioName}
              </div>
              <div
                style={{
                  margin: "16px 24px 0",
                  fontSize: 16,
                  lineHeight: "25px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  // INTRO_IMAGE's textColor (MainFragment)
                  ...(look.introText ? { color: look.introText } : {}),
                }}
              >
                {text}
              </div>
            </div>
          </div>
        </ScrollArea>
        {hasInput && (
          <div style={{ flex: "0 0 auto", paddingTop: 16, marginBottom: 16 }}>
            {choices.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {choices.map((c, i) => (
                  <div
                    key={"choice" + i}
                    style={styled(
                      {
                        ...bigButton,
                        color: introStartText,
                        margin: "16px 16px 0",
                      },
                      look
                    )}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
            {allowTextReply && (
              <TextReply
                big
                look={look}
                label="回答"
                color="white"
                style={{ margin: "0 16px 16px" }}
                itemStyle={{ marginTop: 8 }}
              />
            )}
          </div>
        )}
      </div>
    </Phone>
  );
}

// A marker as Google Maps draws it: the story's picture at a quarter of its
// pixels (AbstractMapActivity.scaleImage), its bottom centre on the place,
// with the info window that shows the title once the player taps it
function MapMarker({ src, title }) {
  return (
    <div
      style={{
        position: "absolute",
        left: dotX,
        top: dotY - 70,
        transform: "translate(-50%, -100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {title && (
        <div
          style={{
            marginBottom: 6,
            padding: "8px 12px",
            maxWidth: 220,
            background: "white",
            color: "#202124",
            borderRadius: 8,
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: "18px",
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </div>
      )}
      {/* a new picture starts over, so it never shows at the old one's size */}
      {src && <MarkerIcon key={src} src={src} />}
    </div>
  );
}

// the picture, hidden until its size is known, and for good if it fails
function MarkerIcon({ src }) {
  const [size, setSize] = React.useState(null);
  return (
    <img
      src={src}
      alt=""
      onLoad={(e) =>
        setSize(
          markerSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
        )
      }
      onError={() => setSize(null)}
      style={{
        display: "block",
        visibility: size ? "visible" : "hidden",
        width: size?.width,
        height: size?.height,
      }}
    />
  );
}

// The map screen (activity_map.xml): the story's map logo top left
// (drama_logo, 62×100 from the top left), the settings button top right,
// the guide picture's card along the bottom (image_card), and a marker.
export function MapPreview({
  colors,
  satellite,
  guideImageSrc,
  marker,
  look = {},
  mapLogoSrc = look.mapLogoSrc,
  scale,
  children,
}) {
  // a map style of its own, else the one the story has set by now
  const background =
    colors || satellite ? (
      <MapBackground colors={colors} satellite={satellite} />
    ) : (
      mapBackgroundFor(look)
    );
  return (
    <Phone background={background} scale={scale}>
      {mapLogoSrc && (
        <img
          src={mapLogoSrc}
          alt=""
          style={{
            position: "absolute",
            left: 16,
            top: 60,
            width: 62,
            height: 100,
            objectFit: "contain",
            objectPosition: "left top",
          }}
        />
      )}
      {/* btn_settings_map, 60dp from the top */}
      <svg
        width="40"
        height="40"
        viewBox="-20 -20 40 40"
        style={{ position: "absolute", top: 60, right: 16 }}
      >
        <circle r="20" fill="rgba(0, 0, 0, 0.45)" />
        <g stroke="white" strokeWidth="2" fill="none">
          <circle r="4" />
          <circle r="7.5" strokeDasharray="2.9 3" strokeWidth="4" />
        </g>
      </svg>
      {marker && <MapMarker src={marker.src} title={marker.title} />}
      {guideImageSrc && (
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 34,
            height: 160,
            boxSizing: "border-box",
            padding: 7.5,
            background: "#3A3A3C", // guide_image.xml
            border: `1px solid ${textHint}`,
            borderRadius: 18,
          }}
        >
          <img
            src={guideImageSrc}
            alt=""
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      )}
      {children}
    </Phone>
  );
}

const callStatusText = {
  CONNECTING: "撥打中...",
  CONNECTED: "通話中...",
  DISCONNECTED: "結束通話",
};

// 來電: activity_incoming_call.xml, a blurred card 27.5dp from the sides,
// 520:320 tall, over the map; the portrait is the app's avatar until the
// story's picture loads. The timer runs from 00:00 once the call connects.
export function CallPreview({
  caller,
  portraitSrc,
  status = "CONNECTING",
  look = {},
  scale,
}) {
  const cardWidth = phoneWidth - 55;
  return (
    <Phone background={mapBackgroundFor(look)} scale={scale}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            ...panelStyle,
            background: "rgba(112, 112, 112, 0.15)", // blur_overlay_color_light
            width: cardWidth,
            height: (cardWidth * 520) / 320,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={portraitSrc || "/preview/avatar.png"}
            alt=""
            style={{
              width: 116,
              height: 116,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <div style={{ marginTop: 40, fontSize: 16, color: "#69CD67" }}>
            {callStatusText[status] || callStatusText.CONNECTING}
          </div>
          <div
            style={{
              marginTop: 2,
              padding: "0 16px",
              fontSize: 24,
              lineHeight: "30px",
              fontWeight: 700,
              color: "#F2F2F7",
              textAlign: "center",
              overflowWrap: "anywhere",
            }}
          >
            {caller}
          </div>
          {status !== "CONNECTING" && (
            <div style={{ marginTop: 2, fontSize: 24.44, color: "#8E8E93" }}>
              00:00
            </div>
          )}
        </div>
      </div>
    </Phone>
  );
}

// 通知列: Android's conversation notification (Portal.kt's MessagingStyle)
// pulled down over the map: the sender's name and picture (the story's
// person, else "Urban Baker"), the text, the first picture, and a button
// per choice plus 回覆 for a typed reply.
export function NotificationPreview({
  text,
  choices,
  allowTextReply,
  imageSrc,
  sender,
  look = {},
  scale,
}) {
  const name = sender?.name || "Urban Baker";
  const actions = [...choices, ...(allowTextReply ? ["回覆"] : [])];
  return (
    <Phone background={mapBackgroundFor(look)} scale={scale}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.55)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 8,
          right: 8,
          padding: "14px 16px 10px",
          borderRadius: 24,
          background: "#2b2930",
          color: "#e6e1e5",
          fontSize: 14,
          lineHeight: "20px",
        }}
      >
        <div style={{ fontSize: 12, color: "#cac4d0", marginBottom: 8 }}>
          Urban Baker · 現在
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {sender?.portraitSrc ? (
            <img
              src={sender.portraitSrc}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                flex: "0 0 auto",
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                flex: "0 0 auto",
                background: "#4f378b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {name.slice(0, 1)}
            </div>
          )}
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <div style={{ fontWeight: 500 }}>{name}</div>
            {imageSrc && (
              <img
                src={imageSrc}
                alt=""
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: 160,
                  marginTop: 6,
                  borderRadius: 12,
                }}
              />
            )}
            {text && (
              <div
                style={{
                  marginTop: imageSrc ? 6 : 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  display: "-webkit-box",
                  WebkitLineClamp: 7,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {text}
              </div>
            )}
          </div>
        </div>
        {actions.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 20px",
              marginTop: 10,
              paddingLeft: 52,
              color: "#d0bcff",
              fontWeight: 500,
            }}
          >
            {actions.slice(0, 3).map((a, i) => (
              <span key={i}>{a}</span>
            ))}
          </div>
        )}
      </div>
    </Phone>
  );
}
