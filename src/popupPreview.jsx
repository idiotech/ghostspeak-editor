import * as React from "react";

// Previews of the three popup screens, laid out like the Android app
// (ghostspeak-client: popup/res/layout/activity_single_popup.xml,
// activity_script_detail.xml, dialog_text.xml, dialog_reply.xml and
// intro/res/layout/fragment_intro_script.xml). One px here stands for one dp
// there, on a 360dp-wide phone; colours are the app's resources.

const phoneWidth = 360;
const fontFamily = "Roboto, 'Noto Sans TC', sans-serif";
const textPrimary = "#F2F2F7"; // text_primary
const textSecondary = "rgba(242, 242, 247, 0.7)"; // text_secondary
const textHint = "#636366"; // text_hint
const hairline = "rgba(255, 255, 255, 0.3)"; // transparent_white_30
const buttonBackground = "rgba(104, 227, 220, 0.8)"; // button_background
const alertButtonText = "#20221B"; // text_black (BigButtonStyle)
const choiceButtonText = "#4B3E20"; // intro_start_text (dialog and intro buttons)

// the map behind the popup, dimmed by the translucent window background
const phoneStyle = {
  width: phoneWidth,
  boxSizing: "border-box",
  background:
    "linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), linear-gradient(135deg, #7a8a6c 0%, #566273 55%, #8a7a62 100%)",
  fontFamily,
  color: textPrimary,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

// BlurView with dialog_background and blur_overlay_color
const panelStyle = {
  boxSizing: "border-box",
  background: "rgba(128, 128, 128, 0.33)",
  backdropFilter: "blur(25px)",
  border: `1px solid ${hairline}`,
  borderRadius: 30,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

// BigButtonStyle (alert, intro) and SmallButtonStyle (dialog) on drawable/button
function buttonStyle(big, color) {
  return {
    boxSizing: "border-box",
    padding: "8px 10px",
    background: buttonBackground,
    borderRadius: 12,
    color,
    fontSize: big ? 16 : 14,
    letterSpacing: big ? "0.1em" : 0,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

// the horizontal row of choice buttons, each with layout_weight 1
function ButtonRow({ choices, big, color, style }) {
  if (choices.length === 0) return null;
  return (
    <div style={{ display: "flex", ...style }}>
      {choices.map((c, i) => (
        <div
          key={"choice" + i}
          style={{ ...buttonStyle(big, color), flex: "1 1 0", margin: "0 8px" }}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

// the typed-reply row: EditText on drawable/text_input and the 送出 button
function TextReply({ big, color, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", ...style }}>
      <div
        style={{
          flex: "1 1 0",
          boxSizing: "border-box",
          padding: "8px 10px",
          background: "#1C1C1E",
          border: `1px solid ${textHint}`,
          borderRadius: 13,
          color: textHint,
          fontSize: 16,
        }}
      >
        您的回答
      </div>
      <div style={{ ...buttonStyle(big, color), marginLeft: 16 }}>送出</div>
    </div>
  );
}

// 提示視窗: activity_single_popup.xml
export function AlertPreview({ text, choices, allowTextReply, imageSrc }) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <div style={phoneStyle}>
      <div style={{ ...panelStyle, margin: "24px 28px" }}>
        {imageSrc && (
          <img
            src={imageSrc}
            style={{
              display: "block",
              width: "100%",
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
                }}
              >
                {text}
              </div>
            )}
            {hasInput && (
              <div style={{ margin: "16px 16px 0" }}>
                <ButtonRow choices={choices} big color={alertButtonText} />
                {allowTextReply && (
                  <TextReply
                    big
                    color={alertButtonText}
                    style={{
                      marginTop: choices.length > 0 ? 16 : 0,
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
  );
}

// one chat bubble: dialog_text.xml (a character, on the left) or
// dialog_reply.xml (the player, on the right)
function Bubble({ self, text, imageSrc, sender }) {
  const avatar = !self && sender;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: self ? "flex-end" : "flex-start",
        marginTop: 16,
      }}
    >
      {avatar && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            overflow: "hidden",
            flex: "0 0 auto",
            background: sender.portraitSrc ? "none" : hairline,
          }}
        >
          {sender.portraitSrc && (
            <img
              src={sender.portraitSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: self ? "flex-end" : "flex-start",
          marginLeft: avatar ? 8 : 0,
          maxWidth: "75%",
        }}
      >
        {avatar && (
          <div style={{ fontSize: 12, color: textSecondary }}>{sender.name}</div>
        )}
        <div
          style={{
            boxSizing: "border-box",
            marginTop: avatar ? 4 : 0,
            padding: "10px 14px",
            background: self
              ? "linear-gradient(to left, rgba(143, 242, 224, 0.15), rgba(143, 242, 224, 0.35))"
              : "linear-gradient(to left, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.4))",
            border: `0.5px solid ${hairline}`,
            borderRadius: self ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
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
  const phoneHeight = 600;
  return (
    <div style={{ ...phoneStyle, height: phoneHeight, alignItems: "center" }}>
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
              borderTop: `0.5px solid ${hairline}`,
              padding: "8px 16px 32px",
            }}
          >
            <ButtonRow
              choices={choices}
              color={choiceButtonText}
              style={{ marginTop: 16 }}
            />
            {allowTextReply && (
              <TextReply
                color={choiceButtonText}
                style={{ marginTop: 16, padding: "0 8px" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 前情提要: fragment_intro_script.xml, with the buttons stacked
export function IntroPreview({ text, choices, allowTextReply, scenarioName }) {
  const hasInput = choices.length > 0 || allowTextReply;
  return (
    <div style={phoneStyle}>
      <div style={{ ...panelStyle, margin: "24px 28px" }}>
        <div style={{ paddingBottom: 16 }}>
          <div
            style={{
              margin: "32px 0 16px",
              fontSize: 20,
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
        {hasInput && (
          <div style={{ paddingTop: 16, marginBottom: 16 }}>
            {choices.map((c, i) => (
              <div
                key={"choice" + i}
                style={{
                  ...buttonStyle(true, choiceButtonText),
                  margin: "16px 16px 0",
                }}
              >
                {c}
              </div>
            ))}
            {allowTextReply && (
              <TextReply
                big
                color={choiceButtonText}
                style={{ margin: "16px 16px 0" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
