import * as React from "react";

import { checkActions } from "./actionChecks";

export { checkActions };

const Names = ({ actions }) => {
  const names = actions.map((a) => a.name);
  return (
    <>
      {names.slice(0, 8).join("、")}
      {names.length > 8 ? `…等 ${names.length} 個` : ""}
    </>
  );
};

// the summary shown in the publish confirmation
export const PublishChecks = ({ actions }) => {
  const c = React.useMemo(() => checkActions(actions), [actions]);
  const items = [
    c.unreachable.length > 0 && (
      <li key="unreachable">
        從開頭到不了的動作 {c.unreachable.length} 個（玩家不會遇到）：
        <Names actions={c.unreachable} />
      </li>
    ),
    c.noContent.length > 0 && (
      <li key="noContent">
        沒有任何內容的動作 {c.noContent.length} 個：
        <Names actions={c.noContent} />
      </li>
    ),
    c.noReply.length > 0 && (
      <li key="noReply">
        沒有回應方式的圖文視窗 {c.noReply.length} 個（不會自動關閉）：
        <Names actions={c.noReply} />
      </li>
    ),
  ].filter(Boolean);
  return (
    <div style={{ marginBottom: 12 }}>
      <b>發佈前檢查</b>（共 {c.total} 個動作）
      {items.length === 0 ? (
        <p style={{ margin: "4px 0" }}>每個動作都能從開頭到達，而且都有內容。</p>
      ) : (
        <ul style={{ margin: "4px 0", paddingLeft: "1.5em" }}>{items}</ul>
      )}
    </div>
  );
};
