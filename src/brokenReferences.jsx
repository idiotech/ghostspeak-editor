import * as React from "react";
import {
  useRecordContext,
  useResourceContext,
  useListContext,
  ListContextProvider,
  useCreatePath,
  Link,
} from "react-admin";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
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

// the problems of every record in a list, keyed by id, computed once per
// list rather than once per row
export function useBrokenReferences(records, data) {
  const loaded = data.loaded;
  return React.useMemo(() => {
    const problems = new Map();
    if (!loaded) return problems;
    Object.values(records || {}).forEach((r) => {
      const p = findBrokenReferences(r, data);
      if (p.length > 0) problems.set(r.id, p);
    });
    return problems;
    // the maps inside data change identity only when they reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, loaded, ...Object.values(data)]);
}

// the map from useBrokenReferences, for the rows of the list
export const ProblemsContext = React.createContext(new Map());

// the record's name, followed by a warning when something it refers to has
// been deleted; the warning opens the record so it can be fixed
export const NameWithWarning = ({ source = "name" }) => {
  const record = useRecordContext();
  const resource = useResourceContext();
  const createPath = useCreatePath();
  const problems = React.useContext(ProblemsContext).get(record?.id);
  if (!record) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {record[source]}
      {problems && (
        <Tooltip title={problems.join("、")}>
          <Link
            to={createPath({ resource, type: "edit", id: record.id })}
            style={{ display: "inline-flex" }}
          >
            <WarningIcon color="error" fontSize="small" />
          </Link>
        </Tooltip>
      )}
    </span>
  );
};

// Above a list: the records that refer to deleted items, each linked so it
// can be fixed, and a switch that narrows the list to them. Nothing when all
// is well.
export const ProblemsSummary = ({
  problems,
  records,
  label,
  hint,
  onlyProblems,
  onToggle,
}) => {
  const resource = useResourceContext();
  const createPath = useCreatePath();
  if (problems.size === 0) return null;
  return (
    <Alert
      severity="warning"
      sx={{ m: 1, alignItems: "center" }}
      action={
        <FormControlLabel
          sx={{ mr: 0, whiteSpace: "nowrap" }}
          control={
            <Switch
              checked={onlyProblems}
              onChange={(e) => onToggle(e.target.checked)}
            />
          }
          label="只看有問題的"
        />
      }
    >
      {problems.size} 個{label}參照了已刪除的項目，{hint}：
      <ul style={{ margin: "4px 0 0", paddingLeft: "1.5em" }}>
        {[...problems].map(([id, p]) => (
          <li key={id}>
            <Link to={createPath({ resource, type: "edit", id })}>
              {records[id]?.name || id}
            </Link>
            ：{p.join("、")}
          </li>
        ))}
      </ul>
    </Alert>
  );
};

// While the switch is on, the list shows only the flagged records, taken from
// the whole scenario rather than the current page or search.
export const OnlyProblems = ({ enabled, problems, records, children }) => {
  const list = useListContext();
  if (!enabled) return children;
  const data = Object.values(records || {}).filter((r) => problems.has(r.id));
  return (
    <ListContextProvider value={{ ...list, data, total: data.length }}>
      {children}
    </ListContextProvider>
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
