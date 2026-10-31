import * as React from "react";
import {
  useRecordContext,
  useGetList,
  useDataProvider,
  useNotify,
  useRedirect,
  Link,
} from "react-admin";
import { useWatch, useFormState } from "react-hook-form";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import { getPrevDesc } from "./actionCommon";
import { describeError } from "./errors";

const allActions = {
  pagination: { page: 1, perPage: 1000 },
  sort: { field: "lastupdate", order: "DESC" },
};

// how a step follows its previous action, from the step's prev entry
function describeTrigger(entry, prevAction) {
  switch (entry.conditionType) {
    case "TEXT":
      return entry.fallback || entry.userReply === "fallback:"
        ? "任意回答"
        : `回答「${entry.userReply}」`;
    case "GEOFENCE":
      return "GPS觸發";
    case "BEACON":
      return "Beacon觸發";
    default:
      return prevAction ? getPrevDesc(prevAction) + "之後" : "";
  }
}

const Arrow = () => <span style={{ color: "#888" }}>➜</span>;

const column = { display: "flex", flexDirection: "column", gap: 6 };

// the action's place in the story: its previous steps, itself, and the
// steps that follow it, each a link to that action's editor
export const FlowStrip = () => {
  const record = useRecordContext();
  const { data: actions } = useGetList("actions", allActions, {
    enabled: !!record?.id,
  });
  if (!record?.id || !actions) return null;
  const byId = Object.fromEntries(actions.map((a) => [a.id, a]));
  const prevs = (record.firstAction ? [] : record.prevs || []).filter(
    (p) => p && p.prev && byId[p.prev]
  );
  const followers = actions.flatMap((a) =>
    (a.prevs || [])
      .filter((p) => p && p.prev === record.id)
      .map((p) => ({ action: a, via: describeTrigger(p, record) }))
  );
  const chip = (action, via, key) => (
    <Chip
      key={key}
      component={Link}
      to={`/actions/${action.id}`}
      clickable
      label={via ? `${action.name} · ${via}` : action.name}
    />
  );
  return (
    <div style={{ margin: "8px 0 16px" }}>
      <h3 style={{ margin: "0 0 8px" }}>流程位置</h3>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={column}>
          {record.firstAction ? (
            <Chip variant="outlined" label="開頭" />
          ) : prevs.length === 0 ? (
            <Chip variant="outlined" color="error" label="沒有前一步" />
          ) : (
            prevs.map((p, i) =>
              chip(byId[p.prev], describeTrigger(p, byId[p.prev]), i)
            )
          )}
        </div>
        <Arrow />
        <Chip color="primary" label={record.name || "（這個動作）"} />
        <Arrow />
        <div style={column}>
          {followers.map((f, i) => chip(f.action, f.via, i))}
          <Chip
            component={Link}
            to="/actions/create"
            state={{
              record: {
                prevs: [{ prev: record.id, conditionType: "ALWAYS" }],
              },
            }}
            clickable
            variant="outlined"
            label="＋ 建下一步"
          />
        </div>
      </div>
    </div>
  );
};

// One new action per reply button, triggered by that reply, so a dialog's
// branches are set up in one go; buttons that already have one are listed.
export const BranchCreator = () => {
  const record = useRecordContext();
  const choices = useWatch({ name: "choices" }) || [];
  const destinations = useWatch({ name: "destinations" }) || [];
  const allowNoReply = useWatch({ name: "allowNoReply" });
  const { isDirty } = useFormState();
  const { data: actions, refetch } = useGetList("actions", allActions, {
    enabled: !!record?.id,
  });
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const [names, setNames] = React.useState({});
  const [picked, setPicked] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  const texts = [
    ...new Set(choices.map((c) => c && c.choice).filter((c) => c)),
  ];
  if (
    !record?.id ||
    allowNoReply ||
    destinations.includes("DIALER") ||
    texts.length === 0
  )
    return null;

  const rows = texts.map((text) => ({
    text,
    existing: (actions || []).filter((a) =>
      (a.prevs || []).some(
        (p) =>
          p &&
          p.prev === record.id &&
          p.conditionType === "TEXT" &&
          p.userReply === text
      )
    ),
    name: names[text] ?? `${text}之後`,
    picked: picked[text] ?? true,
  }));
  const toCreate = rows.filter(
    (r) => r.existing.length === 0 && r.picked && r.name.trim()
  );

  async function create(openFirst) {
    setBusy(true);
    try {
      const created = [];
      for (const r of toCreate) {
        const { data } = await dataProvider.create("actions", {
          data: {
            name: r.name.trim(),
            firstAction: false,
            prevs: [{ prev: record.id, conditionType: "TEXT", userReply: r.text }],
          },
        });
        created.push(data);
      }
      notify(`已建立 ${created.length} 個下一步`, { type: "success" });
      await refetch();
      if (openFirst && created[0]) redirect("edit", "actions", created[0].id);
    } catch (e) {
      console.error("failed to create the branches", e);
      notify("建立失敗：" + describeError(e), { type: "error" });
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isDirty || toCreate.length === 0;
  return (
    <div style={{ margin: "8px 0 16px" }}>
      <h4 style={{ margin: "0 0 4px" }}>
        <u>為每個按鈕建立下一步</u>
      </h4>
      <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>
        每個按鈕一個新動作，觸發條件自動設為「文字回應」＝按鈕文字。已經有下一步的按鈕會列出來，不會重複建立。
      </div>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "#666", fontSize: 12 }}>
            <th></th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>按鈕</th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>新動作名稱</th>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>目前的下一步</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.text}>
              <td>
                <Checkbox
                  size="small"
                  checked={r.existing.length === 0 && r.picked}
                  disabled={r.existing.length > 0}
                  onChange={(e) =>
                    setPicked({ ...picked, [r.text]: e.target.checked })
                  }
                />
              </td>
              <td style={{ padding: "4px 8px" }}>{r.text}</td>
              <td style={{ padding: "4px 8px" }}>
                {r.existing.length === 0 ? (
                  <TextField
                    size="small"
                    value={r.name}
                    onChange={(e) =>
                      setNames({ ...names, [r.text]: e.target.value })
                    }
                  />
                ) : (
                  <span style={{ color: "#888" }}>—</span>
                )}
              </td>
              <td style={{ padding: "4px 8px" }}>
                {r.existing.length === 0 ? (
                  <span style={{ color: "#888" }}>尚未建立</span>
                ) : (
                  r.existing.map((a) => (
                    <Chip
                      key={a.id}
                      component={Link}
                      to={`/actions/${a.id}`}
                      clickable
                      size="small"
                      label={a.name}
                      sx={{ mr: 0.5 }}
                    />
                  ))
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: 10,
        }}
      >
        <Button
          variant="contained"
          disabled={disabled}
          onClick={() => create(false)}
        >
          建立 {toCreate.length} 個下一步
        </Button>
        <Button disabled={disabled} onClick={() => create(true)}>
          建立並開始編輯第一個
        </Button>
        {isDirty && (
          <span style={{ color: "#666", fontSize: 13 }}>
            先儲存這個動作，再建立。
          </span>
        )}
      </div>
    </div>
  );
};
