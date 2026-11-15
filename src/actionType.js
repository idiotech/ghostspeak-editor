// What an action mainly does, and how its followers refer to it. Kept free of
// React so the publish logic can be tested with node --test.

export function getMainType(action) {
  function isDialog() {
    const dests = action.destinations || [];
    return (
      action.hasPopup &&
      (dests.includes("DIALER") ||
        // a typed reply only counts while the form still offers it
        (action.allowTextReply && !action.allowNoReply) ||
        (action.choices && action.choices.length > 0))
    );
  }
  return isDialog()
    ? "dialog"
    : action.hasSound && (action.soundType == "MAIN" || !action.soundType)
    ? "sound"
    : action.hasPopup
    ? "popup"
    : action.hasIncomingCall
    ? "incoming-call"
    : action.hasHangUp
    ? "hang-up"
    : action.hasMarker
    ? "marker"
    : action.hasMarkerRemoval
    ? "marker-removal"
    : action.hasMapStyle
    ? "map-style"
    : action.hasGuideImage
    ? "guide-image"
    : action.hasPopupDismissal
    ? "popup-dismissal"
    : action.hasIntroImage
    ? "intro-image"
    : action.hasGuideImageRemoval
    ? "guide-image-removal"
    : action.hasSound && action.soundType == "BACKGROUND"
    ? "sound"
    : action.hasButtonStyle
    ? "button-style"
    : // the remaining content types must match the action ids in getActions,
    // otherwise the next step waits for an action that is never sent
    action.hasPopupStyle
    ? "popup-style"
    : action.hasSilence
    ? "silence"
    : action.hasVariableUpdate
    ? "variable-update"
    : action.endgame
    ? "endgame"
    : action.hasSound
    ? "sound"
    : "button-style";
}

// the reply buttons the app shows for a popup: none when the popup is off
// or needs no reply; empty entries are skipped
export function getButtons(action) {
  if (!action || !action.hasPopup || action.allowNoReply) return [];
  return (action.choices || []).map((c) => c && c.choice).filter((c) => c);
}

export function getPrevDesc(action) {
  switch (getMainType(action)) {
    case "dialog":
      return "訊息出現";
    case "sound":
      return "聲音播完";
    case "popup":
      return "顯示完畢";
    case "incoming-call":
      return "電話接通";
    case "hang-up":
      return "電話掛斷";
    case "marker":
      return "圖釘出現";
    case "marker-removal":
      return "圖釘移除";
    case "map-style":
      return "地圖樣式改變";
    case "guide-image":
      return "指示圖出現";
    case "guide-image-removal":
      return "指示圖消失";
    case "popup-dismissal":
      return "圖文訊息關閉";
    case "intro-image":
      return "背景圖出現";
    case "sound-background":
      return "背景聲音播完";
    case "button-style":
      return "按鈕樣式改變";
    case "popup-style":
      return "圖文樣式改變";
    case "silence":
      return "聲音停止";
    case "variable-update":
      return "變數更新";
    case "endgame":
      return "活動結束";
    default:
      return "動作執行完畢";
  }
}

export function getPrevId(action) {
  const mainType = getMainType(action);
  switch (mainType) {
    case "dialog":
      return `${action.id}-popup`;
    case "sound-background":
      return `${action.id}-sound`;
    default:
      return `${action.id}-${mainType}`;
  }
}

// each content type's switch and the prefix of its delay fields, as the
// action form saves them and getActions publishes them
const delayedContents = [
  ["hasSound", "sound"],
  ["hasPopup", "popup"],
  ["hasPopupDismissal", "dismissal"],
  ["hasMarker", "marker"],
  ["hasMarkerRemoval", "markerRemoval"],
  ["hasIncomingCall", "incomingCall"],
  ["hasHangUp", "hangUp"],
  ["hasMapStyle", "mapStyle"],
  ["hasIntroImage", "introImage"],
  ["hasButtonStyle", "buttonStyle"],
  ["hasPopupStyle", "popupStyle"],
  ["hasGuideImage", "guideImage"],
  ["hasGuideImageRemoval", "guideImageRemoval"],
  ["hasSilence", "silence"],
  ["endgame", "endgame"],
];

// the plain delay, then the fields of 進階時間控制
const delayFields = [
  "Delay",
  "DelayHour",
  "DelayMinute",
  "DelaySecond",
  "DelayMilli",
  "Time",
  "RandomHour",
  "RandomMinute",
  "RandomSecond",
  "RandomMilli",
];

// whether any content the action has switched on is sent later than its trigger
export function hasDelay(action) {
  return delayedContents.some(
    ([flag, prefix]) =>
      !!action[flag] && delayFields.some((field) => !!action[prefix + field])
  );
}
