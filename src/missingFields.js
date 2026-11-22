// The fields the server cannot do without. Publishing a scenario or sending a
// broadcast with one of them empty is refused by the server with a decoding
// error, or reaches players as an action that does nothing, so the editor
// checks them first and names them. The forms require these fields, but
// records saved before they did may still have them empty.
// Kept free of React so it can be tested with node --test.

const empty = (value) => value === undefined || value === null || value === "";

// the fields a trigger needs, for a previous-step entry or a broadcast
function conditionFields(condition, label, missing) {
  if (condition.conditionType === "TEXT") {
    if (!condition.fallback) missing(condition.userReply, label("回應文字"));
  } else if (condition.conditionType === "GEOFENCE") {
    missing(condition.geofenceCenter, label("地點"));
  } else if (condition.conditionType === "BEACON") {
    missing(condition.beacon, label("Beacon"));
    missing(condition.beaconThreshold, label("Beacon門檻"));
    missing(condition.beaconType, label("Beacon進出"));
  }
}

// The names of the empty fields of an action or a broadcast that publishing
// or sending would pass on to the server, in the order the form shows them.
// A broadcast is published with its own trigger; an action with the
// conditions of its previous steps.
export function findMissingFields(record, { broadcast = false } = {}) {
  const problems = [];
  const missing = (value, name) => {
    if (empty(value)) problems.push(name);
  };
  const nth = (i, what) => (name) => `第${i + 1}個${what}的${name}`;

  // the initial action's previous steps are hidden in the form and not published
  if (!record.firstAction)
    (record.prevs || []).forEach((entry, i) => {
      if (entry) conditionFields(entry, nth(i, "前一步"), missing);
    });
  if (broadcast) conditionFields(record, (name) => name, missing);

  (record.preconditions || []).forEach((p, i) => {
    const label = nth(i, "附加條件");
    missing(p?.variable, label("變數"));
    missing(p?.comparison, label("比較"));
    missing(p?.value, label("數值"));
  });

  if (record.hasSound) {
    if (record.mode === "DYNAMIC_VOLUME") {
      missing(record.soundCenterId, "聲音中心點");
      missing(record.minVolume, "最小音量");
    } else if (record.mode === "BEACON_VOLUME") {
      missing(record.beaconForSound, "Beacon");
      missing(record.beaconMinValue, "Beacon最小值");
      missing(record.beaconMaxValue, "Beacon最大值");
      missing(record.beaconMinVolume, "Beacon最小音量");
    }
  }
  if (record.hasIncomingCall) {
    missing(record.caller, "來電人");
    missing(record.callStatus, "來電狀態");
  }
  if (record.hasHangUp && !record.hasIncomingCall) missing(record.caller, "來電人");
  if (record.hasMarker) missing(record.title, "圖釘標題");
  if (record.hasMarkerRemoval) missing(record.markerId, "要移除的圖釘");
  if (record.hasButtonStyle) {
    missing(record.backgroundColor, "按鈕背景顏色");
    missing(record.textColor, "按鈕文字顏色");
  }
  if (record.hasPopupStyle) missing(record.alertTextColor, "提示文字顏色");
  if (record.hasVariableUpdate)
    (record.variableUpdates || []).forEach((u, i) => {
      const label = nth(i, "變數更新");
      missing(u?.variable, label("變數"));
      missing(u?.operation, label("運算"));
      missing(u?.value, label("數值"));
    });
  if (record.hasSilence) {
    missing(record.silencedSound, "停止的聲音");
    missing(record.forceFadeOutSeconds, "淡出秒數");
  }
  return problems;
}

// the initial action sets every variable to its starting value
export function findMissingVariableFields(variable) {
  const problems = [];
  if (empty(variable.name)) problems.push("名稱");
  if (empty(variable.value)) problems.push("初始值");
  return problems;
}

// the records with empty fields, as 「name」：field、field
export function describeMissingFields(records, find) {
  return records
    .map((r) => [r, find(r)])
    .filter(([, fields]) => fields.length > 0)
    .map(([r, fields]) => `「${r.name || r.id}」：${fields.join("、")}`);
}
