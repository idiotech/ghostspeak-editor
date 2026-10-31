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
import {
  getPrevDesc,
  getButtons,
  nextStepState,
  conditionTypes,
} from "./actionCommon";
import { describeError } from "./errors";

const allActions = {
  pagination: { page: 1, perPage: 1000 },
  sort: { field: "lastupdate", order: "DESC" },
};

// how a step follows its previous action, from the step's prev entry
function describeTrigger(entry, prevAction) {
  if (entry.conditionType === "TEXT") {
    if (entry.fallback || entry.userReply === "fallback:") return "任意回答";
    return entry.userReply ? `回答「${entry.userReply}」` : "文字回應（未設定）";
  }
  if (entry.conditionType && entry.conditionType !== "ALWAYS")
    return conditionTypes.find((c) => c.id === entry.conditionType)?.name;
  return prevAction ? getPrevDesc(prevAction) + "之後" : "";
}

const Arrow = () => <span style={{ color: "#888" }}>➜</span>;

const column = { display: "flex", flexDirection: "column", gap: 6 };

const actionChip = (action, via, key) => (
  <Chip
    key={key}
    component={Link}
    to={`/actions/${action.id}`}
    clickable
    label={via ? `${action.name} · ${via}` : action.name}
  />
);

// the action's place in the story: its previous steps, itself, and the
// steps that follow it, each a link to that action's editor
export const FlowStrip = () => {
  const record = useRecordContext();
  const { data: actions } = useGetList("actions", allActions, {
    enabled: !!record?.id,
  });
  const { byId, followers } = React.useMemo(() => {
    const byId = Object.fromEntries((actions || []).map((a) => [a.id, a]));
    const followers = (actions || []).flatMap((a) =>
      (a.prevs || [])
        .filter((p) => p && p.prev === record?.id)
        .map((p) => ({ action: a, via: describeTrigger(p, record) }))
    );
    return { byId, followers };
  }, [actions, record]);
  if (!record?.id || !actions) return null;
  const prevs = record.firstAction ? [] : (record.prevs || []).filter((p) => p);
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
              byId[p.prev] ? (
                actionChip(byId[p.prev], describeTrigger(p, byId[p.prev]), i)
              ) : (
                // a previous step that was deleted: still in the record, so
                // still exported; the author has to remove it below
                <Chip
                  key={i}
                  variant="outlined"
                  color="error"
                  label="前一步已被刪除，請移除"
                />
              )
            )
          )}
        </div>
        <Arrow />
        <Chip color="primary" label={record.name || "（這個動作）"} />
        <Arrow />
        <div style={column}>
          {followers.map((f, i) => actionChip(f.action, f.via, i))}
          <Chip
            component={Link}
            to="/actions/create"
            state={nextStepState(record.id)}
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
  // the form's current values, since the author may be editing the buttons
  const form = {
    hasPopup: useWatch({ name: "hasPopup" }),
    allowNoReply: useWatch({ name: "allowNoReply" }),
    choices: useWatch({ name: "choices" }),
  };
  const { isDirty } = useFormState();
  const {
    data: actions,
    isPending,
    error,
    refetch,
  } = useGetList("actions", allActions, { enabled: !!record?.id });
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const [names, setNames] = React.useState({});
  const [picked, setPicked] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  const texts = React.useMemo(
    () => [...new Set(getButtons(form))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.hasPopup, form.allowNoReply, form.choices]
  );
  // the follow-ups each button already has
  const existing = React.useMemo(() => {
    const map = new Map(texts.map((t) => [t, []]));
    (actions || []).forEach((a) =>
      (a.prevs || []).forEach((p) => {
        if (p && p.prev === record?.id && p.conditionType === "TEXT" && map.has(p.userReply))
          map.get(p.userReply).push(a);
      })
    );
    return map;
  }, [actions, record, texts]);

  if (!record?.id || texts.length === 0) return null;

  const rows = texts.map((text) => ({
    text,
    existing: existing.get(text) || [],
    name: names[text] ?? `${text}之後`,
    picked: picked[text] ?? true,
  }));
  const toCreate = rows.filter(
    (r) => r.existing.length === 0 && r.picked && r.name.trim()
  );
  // nothing is created until the list has loaded, or every button would
  // look as if it had no follow-up yet
  const listReady = !isPending && !error && !!actions;

  async function create(openFirst) {
    setBusy(true);
    const created = [];
    try {
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
      if (openFirst && created[0]) redirect("edit", "actions", created[0].id);
    } catch (e) {
      console.error("failed to create the branches", e);
      notify(
        `建立失敗：${describeError(e)}` +
          (created.length > 0 ? `（已建立 ${created.length} 個）` : ""),
        { type: "error" }
      );
    } finally {
      // whatever happened, show the branches that now exist
      await refetch();
      setBusy(false);
    }
  }

  const disabled = busy || isDirty || !listReady || toCreate.length === 0;
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
                {!listReady ? (
                  <span style={{ color: "#888" }}>讀取中…</span>
                ) : r.existing.length === 0 ? (
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
        {error && (
          <span style={{ color: "#d32f2f", fontSize: 13 }}>
            動作列表讀取失敗：{describeError(error)}
          </span>
        )}
      </div>
    </div>
  );
};
