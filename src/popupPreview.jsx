import * as React from "react";

// Previews of the three popup screens, drawn the way the Android app lays
// them out (ghostspeak-client: popup/res/layout/activity_single_popup.xml,
// activity_script_detail.xml, dialog_text.xml, dialog_reply.xml,
// intro/res/layout/fragment_intro_script.xml and activity_intro.xml) on a
// 360dp-wide phone. One px here stands for one dp there; the colours, sizes
// and fonts are the app's resources, named in the comments. The colours a
// story sets itself (the BUTTON_STYLE, POPUP_STYLE and INTRO_IMAGE actions)
// are not applied: the previews show the app's defaults.

const phoneWidth = 360;
const phoneHeight = 740;
// Roboto and Noto Sans CJK, as on Android (index.html loads them)
const fontFamily =
  "Roboto, 'Noto Sans TC', 'Noto Sans CJK TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
const textPrimary = "#F2F2F7"; // text_primary
const textSecondary = "rgba(242, 242, 247, 0.7)"; // text_secondary
const textHint = "#636366"; // text_hint
const textBlack = "#20221B"; // text_black: BigButtonStyle and SmallButtonStyle
const introStartText = "#4B3E20"; // intro_start_text: dialog and intro choices
const hairline = "rgba(255, 255, 255, 0.3)"; // transparent_white_30
const buttonBackground = "rgba(104, 227, 220, 0.8)"; // button_background

// the phone's screen, edge to edge under a transparent status bar
function Phone({ background, children }) {
  return (
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
      <StatusBar />
      {children}
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

// the map screen the popups open over: the app's style_json_dark.json
// colours, with Google's blue location dot
function MapBackground() {
  const local = { stroke: "#50493f", strokeWidth: 3 }; // road.local
  const arterial = { stroke: "#343e18", strokeWidth: 6 }; // road.arterial
  const label = {
    fill: "#9ca5b3", // road labels.text.fill
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
        <rect width="100%" height="100%" fill="#2b1803" />
        <g transform="rotate(-14 180 370)">
          <rect x="-60" y="60" width="190" height="130" fill="#042f1a" />
          <rect x="220" y="480" width="240" height="170" fill="#042f1a" />
          <path
            d="M 300 -120 C 345 100, 320 260, 410 420 L 560 420 L 560 -120 Z"
            fill="#0c1422"
          />
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
          <g {...arterial}>
            <line x1="-120" y1="450" x2="520" y2="450" />
            <line x1="180" y1="-120" x2="180" y2="860" />
          </g>
          <line
            x1="-120"
            y1="620"
            x2="520"
            y2="40"
            stroke="#1f2835"
            strokeWidth="12"
          />
          <line
            x1="-120"
            y1="620"
            x2="520"
            y2="40"
            stroke="#746855"
            strokeWidth="8"
          />
          <text x="36" y="126" {...label}>
            中山路
          </text>
          <text x="192" y="300" {...label}>
            民生街
          </text>
          <text x="-30" y="446" {...label}>
            大橋頭路
          </text>
        </g>
        <circle cx="180" cy="430" r="30" fill="#4285F4" opacity="0.2" />
        <circle
          cx="180"
          cy="430"
          r="7"
          fill="#4285F4"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      {/* the scrim under the status bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 96,
          background: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0))", // status_bar_scrim
        }}
      />
    </>
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
  background: buttonBackground,
  borderRadius: 12,
  boxShadow: "0 1px 1px rgba(0, 0, 0, 0.24), 0 1px 3px rgba(0, 0, 0, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  overflowWrap: "anywhere",
};
// BigButtonStyle: 16sp sans-serif-black, spaced out, as written
const bigButton = {
  ...buttonBase,
  padding: "8px 10px",
  fontSize: 16,
  lineHeight: "19px",
  fontWeight: 900,
  letterSpacing: "0.1em",
  color: textBlack,
};
// SmallButtonStyle and dialog_choice_button: Material's 14sp medium capitals
const smallButton = {
  ...buttonBase,
  padding: "8px 10px",
  fontSize: 14,
  lineHeight: "16px",
  fontWeight: 500,
  textTransform: "uppercase",
  color: textBlack,
};

// the horizontal row of choice buttons, each with layout_weight 1 and 8dp
// of padding (alert_choice_button.xml, dialog_choice_button.xml)
function ButtonRow({ choices, big, color, style }) {
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
          style={{
            ...(big ? bigButton : smallButton),
            padding: 8,
            color,
            flex: "1 1 0",
            minWidth: 0,
            margin: "0 8px",
          }}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

// the typed-reply row: an EditText in the button style on drawable/text_input,
// then the send button 16dp to its right
function TextReply({
  big,
  label = "送出",
  color = textBlack,
  style,
  itemStyle,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", ...style }}>
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          boxSizing: "border-box",
          minHeight: 48,
          padding: "8px 10px",
          background: "#1C1C1E",
          border: `1px solid ${textHint}`,
          borderRadius: 13,
          color: textHint,
          fontSize: 16,
          lineHeight: "19px",
          fontWeight: big ? 900 : 500,
          letterSpacing: big ? "0.1em" : 0,
          display: "flex",
          alignItems: "center",
          ...itemStyle,
        }}
      >
        您的回答
      </div>
      <div
        style={{
          ...(big ? bigButton : smallButton),
          minWidth: 88,
          marginLeft: 16,
          color,
          ...itemStyle,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// 提示視窗: activity_single_popup.xml, centred over the map
export function AlertPreview({ text, choices, allowTextReply, imageSrc }) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <Phone background={<MapBackground />}>
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
            ...panelStyle,
            margin: "24px 28px",
            maxHeight: phoneHeight - 48,
          }}
        >
          {imageSrc && (
            <img
              src={imageSrc}
              alt=""
              style={{
                display: "block",
                width: "100%",
                flex: "0 1 auto",
                minHeight: 0,
                objectFit: "contain",
                boxSizing: "border-box",
                padding: 1,
                borderRadius: "30px 30px 0 0",
              }}
            />
          )}
          {(text || hasInput) && (
            <div style={{ flex: "0 0 auto", paddingTop: 8, paddingBottom: 32 }}>
              {text && (
                <div
                  style={{
                    margin: "24px 16px 0",
                    padding: "0 20px",
                    fontSize: 17,
                    lineHeight: "24px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
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
                    />
                  )}
                  {allowTextReply && (
                    <TextReply
                      big
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
}) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <Phone background={<MapBackground />}>
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
            width: phoneWidth * 0.855,
            height: phoneHeight * 0.84,
          }}
        >
          <div
            style={{
              flex: "1 1 0",
              minHeight: 0,
              overflow: "hidden",
              padding: "0 24px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <Bubble self text="……" />
            {(text || imageSrc) && (
              <Bubble text={text} imageSrc={imageSrc} sender={sender} />
            )}
          </div>
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
                />
              )}
              {allowTextReply && (
                <TextReply style={{ marginTop: 16, padding: "0 8px" }} />
              )}
            </div>
          )}
        </div>
      </div>
    </Phone>
  );
}

// the intro screen behind the script: activity_intro.xml's background picture
// and logo (the app's own, unless the story sets its own)
function IntroBackground() {
  return (
    <>
      <img
        src="/preview/intro_background.jpg"
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
      <img
        src="/preview/intro_logo.png"
        alt=""
        style={{
          position: "absolute",
          width: 139,
          height: 79,
          left: (phoneWidth - 139) / 2,
          top: (phoneHeight * 0.59 - 79) / 2,
        }}
      />
    </>
  );
}

// 前情提要: fragment_intro_script.xml, straight on the intro screen without a
// panel; the text starts 40% of the way down and the buttons stack at the
// bottom
export function IntroPreview({ text, choices, allowTextReply, scenarioName }) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <Phone background={<IntroBackground />}>
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
        <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
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
                }}
              >
                {text}
              </div>
            </div>
          </div>
        </div>
        {hasInput && (
          <div style={{ flex: "0 0 auto", paddingTop: 16, marginBottom: 16 }}>
            {choices.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {choices.map((c, i) => (
                  <div
                    key={"choice" + i}
                    style={{
                      ...bigButton,
                      color: introStartText,
                      margin: "16px 16px 0",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
            {allowTextReply && (
              <TextReply
                big
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
