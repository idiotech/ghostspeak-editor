import * as React from "react";
import { useRecordContext } from "react-admin";
import Tooltip from "@mui/material/Tooltip";

// values at a dotted path; arrays along the way are flattened, so
// "prevs.beacon" finds the beacon of every previous step
export function findValues(record, path) {
  return path
    .split(".")
    .reduce(
      (values, field) =>
        values.flatMap((v) => (v && v[field] ? v[field] : [])),
      [record]
    );
}

const kinds = { actions: "動作", broadcasts: "廣播", people: "朋友" };

// Which records use each record of a list: id → [{ kind, name }].
// `references` maps a resource to the paths that may hold the id, as the
// delete buttons describe them; `extra` adds users outside those resources.
export function useUsage(data, references, extra = []) {
  const { loaded, actions, broadcasts, people } = data;
  return React.useMemo(() => {
    const usage = new Map();
    const add = (id, kind, name) => {
      if (!id) return;
      usage.set(id, [...(usage.get(id) || []), { kind, name }]);
    };
    if (loaded) {
      const byResource = { actions, broadcasts, people };
      Object.entries(references).forEach(([resource, paths]) => {
        Object.values(byResource[resource] || {}).forEach((r) => {
          new Set(paths.flatMap((p) => findValues(r, p))).forEach((id) =>
            add(id, kinds[resource], r.name)
          );
        });
      });
    }
    extra.forEach(({ id, kind, name }) => add(id, kind, name));
    return usage;
  }, [loaded, actions, broadcasts, people, references, extra]);
}

// "2 個動作、1 個朋友", with the names on hover; 未使用 when nothing does
export const UsedByField = ({ usage }) => {
  const record = useRecordContext();
  const users = usage.get(record?.id) || [];
  if (users.length === 0) return <span style={{ color: "#999" }}>未使用</span>;
  const counts = {};
  users.forEach((u) => (counts[u.kind] = (counts[u.kind] || 0) + 1));
  const summary = Object.entries(counts)
    .map(([kind, n]) => `${n} 個${kind}`)
    .join("、");
  return (
    <Tooltip title={users.map((u) => `${u.kind}：${u.name}`).join("、")}>
      <span style={{ cursor: "help", textDecoration: "underline dotted" }}>
        {summary}
      </span>
    </Tooltip>
  );
};
