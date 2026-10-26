import * as React from "react";
import { useRecordContext } from "react-admin";
import Tooltip from "@mui/material/Tooltip";
import WarningIcon from "@mui/icons-material/Warning";

// Lists the records an action or broadcast refers to that no longer exist,
// following the lookups publishing and sending make, so every problem shows
// up at once instead of failing on the first one.
// `data` is the result of useAllData.
export function findBrokenReferences(action, data) {
  const {
    actions,
    sounds,
    locations,
    images,
    mapStyles,
    variables,
    beacons,
    people,
  } = data;
  const problems = [];
  // publish needs these records
  function required(records, id, label) {
    if (!id || !records[id]) problems.push(`${label}不存在`);
  }
  // these may be left empty, but must exist when set
  function optional(records, id, label) {
    if (id && !records[id]) problems.push(`${label}不存在`);
  }

  if (!action.firstAction) {
    (action.prevs || []).forEach((p) => {
      if (!p) return;
      required(actions, p.prev, "前一步");
      if (p.conditionType === "BEACON") optional(beacons, p.beacon, "Beacon");
      if (p.conditionType === "GEOFENCE")
        optional(locations, p.geofenceCenter, "Geofence地點");
    });
  }
  // a broadcast's own trigger, read for any condition other than 立刻
  if (action.conditionType && action.conditionType !== "ALWAYS") {
    optional(beacons, action.beacon, "Beacon");
    optional(locations, action.geofenceCenter, "Geofence地點");
  }
  // published even when the advanced sections are switched off
  (action.exclusiveWith || []).forEach((id) =>
    optional(actions, id, "互斥動作")
  );
  (action.preconditions || []).forEach((p) =>
    optional(variables, p?.variable, "附加條件變數")
  );
  optional(people, action.sender, "發送者");
  if (action.hasSound) {
    required(sounds, action.soundId, "聲音");
    optional(locations, action.soundCenterId, "聲音中心點");
    optional(beacons, action.beaconForSound, "聲音Beacon");
  }
  if (action.hasPopup) {
    (action.pictures || []).forEach((p) => {
      if (!images[p?.pictureId]?.image?.src) problems.push("圖片不存在");
    });
  }
  if (action.hasIncomingCall || action.hasHangUp)
    required(images, action.portrait, "頭像");
  if (action.hasMarker) {
    required(images, action.markerIcon, "圖釘");
    required(locations, action.locationId, "地點");
  }
  if (action.hasMapStyle && !action.satellite)
    optional(mapStyles, action.mapStyle, "地圖樣式");
  if (action.hasIntroImage) {
    optional(images, action.introBackground, "首頁背景");
    if (!action.noIntroLogo) optional(images, action.introLogo, "Logo");
    optional(images, action.mapLogo, "地圖Logo");
  }
  if (action.hasGuideImage) required(images, action.guideImage, "指引圖片");
  if (action.hasSilence) required(actions, action.silencedSound, "停止的聲音");
  if (action.hasVariableUpdate) {
    (action.variableUpdates || []).forEach((v) =>
      optional(variables, v?.variable, "變數")
    );
  }
  return [...new Set(problems)];
}

// useAllData for the list, shared by every row's BrokenReferencesField
export const AllDataContext = React.createContext(null);

// warns about records this row refers to that have been deleted
export const BrokenReferencesField = () => {
  const record = useRecordContext();
  const data = React.useContext(AllDataContext);
  if (!record || !data?.loaded) return null;
  const problems = findBrokenReferences(record, data);
  if (problems.length === 0) return null;
  return (
    <Tooltip title={problems.join("、")}>
      <WarningIcon color="error" />
    </Tooltip>
  );
};

// the list of problems for a notification
export function BrokenReferencesMessage({ title, problems }) {
  return (
    <div>
      {title}
      <ul style={{ margin: 0, paddingLeft: "1.5em" }}>
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

// problems of the given actions, as 「name」：problem, problem
export function describeBrokenReferences(actions, data) {
  return actions
    .map((a) => [a, findBrokenReferences(a, data)])
    .filter(([, problems]) => problems.length > 0)
    .map(([a, problems]) => `「${a.name}」：${problems.join("、")}`);
}
