import * as React from "react";
import { Title, useRefresh } from "react-admin";
// react-router's Link takes a ref, which Tooltip and Chip need
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import FlagIcon from "@mui/icons-material/Flag";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import WarningIcon from "@mui/icons-material/Warning";

import { useAllData } from "./serverCommon";
import { useCurrentScenario, getCurrentScenarioName } from "./currentScenario";
import { useBrokenReferences } from "./brokenReferences";
import { findContentProblems } from "./actionChecks";
import { inListOrder } from "./actionTree";
import { describeError } from "./errors";
import { EmptyPage } from "./dummy";
import {
  nodeWidth,
  nodeHeight,
  columnGap,
  rowGap,
  margin,
  left,
  top,
  routeEdges,
  scrollForZoom,
} from "./storyGeometry";
import { getContentIcon } from "./actionCommon";
import { describeTrigger } from "./flow";
import { layoutStory } from "./storyLayout";

const zoomSteps = [0.4, 0.6, 0.8, 1];
const readableZoom = 0.8;

// the triggers of one line, e.g. 回答「好」／回答「當然」
function describeEdge(edge, from) {
  const texts = edge.entries.map((entry) => describeTrigger(entry, from.action));
  return [...new Set(texts.filter(Boolean))].join("／");
}

const EdgeLine = ({ route, colors }) => (
  <path
    d={route.path}
    fill="none"
    stroke={colors[route.edge.kind]}
    strokeWidth={1.5}
    strokeDasharray={route.edge.kind === "next" ? undefined : "6 4"}
    markerEnd={`url(#arrow-${route.edge.kind})`}
  />
);

const EdgeLabel = ({ label, colors }) => (
  <text
    x={label.x}
    y={label.y}
    textAnchor={label.anchor}
    fontSize={12}
    fill={colors.label}
    stroke={colors.background}
    strokeWidth={4}
    paintOrder="stroke"
    style={{ pointerEvents: "auto" }}
  >
    <title>{label.full}</title>
    {label.text}
  </text>
);

function ActionNode({ node, problems }) {
  const { action } = node;
  const box = (
    <Box
      component={Link}
      to={`/actions/${action.id}`}
      sx={{
        position: "absolute",
        left: left(node),
        top: top(node),
        width: nodeWidth,
        height: nodeHeight,
        boxSizing: "border-box",
        padding: "6px 10px",
        borderRadius: 1,
        border: "1px solid",
        borderColor: problems ? "error.main" : "divider",
        borderLeftWidth: 4,
        borderLeftColor: problems
          ? "error.main"
          : action.firstAction
          ? "primary.main"
          : "divider",
        bgcolor: "background.paper",
        color: "text.primary",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        "&:hover": { boxShadow: 3 },
        "& svg": { fontSize: 16 },
      }}
    >
      <Box
        sx={{
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <Box component="span" sx={{ color: "text.secondary", mr: 0.75 }}>
          {node.number}
        </Box>
        {action.name || "（未命名）"}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          color: "text.secondary",
          height: 18,
        }}
      >
        {action.firstAction && <FlagIcon color="primary" titleAccess="開頭" />}
        {getContentIcon(action)}
        {action.endgame && <SportsScoreIcon titleAccess="結束活動" />}
        {problems && (
          <WarningIcon color="error" sx={{ marginLeft: "auto" }} />
        )}
      </Box>
    </Box>
  );
  const tip = [action.name, problems && `需要修正：${problems.join("、")}`]
    .filter(Boolean)
    .join("　");
  return <Tooltip title={tip}>{box}</Tooltip>;
}

const Legend = ({ colors }) => {
  const line = (color, dashed) => (
    <svg width="34" height="10" style={{ verticalAlign: "middle" }}>
      <line
        x1="0"
        y1="5"
        x2="34"
        y2="5"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "6 4" : undefined}
      />
    </svg>
  );
  return (
    <Box sx={{ fontSize: 13, color: "text.secondary", display: "flex", gap: 2, flexWrap: "wrap" }}>
      <span>{line(colors.next)} 下一步</span>
      <span>{line(colors.also, true)} 另一條通往同一動作的路</span>
      <span>{line(colors.back, true)} 回到先前的動作</span>
      <span>點動作可以編輯</span>
    </Box>
  );
};

// the whole scenario as a graph: actions as boxes, triggers as labelled lines
const ScenarioStoryGraph = () => {
  const theme = useTheme();
  const data = useAllData();
  const brokenReferences = useBrokenReferences(data.actions, data);
  const [zoom, setZoom] = React.useState(1);
  const viewport = React.useRef(null);

  const refresh = useRefresh();
  // set once the author zooms or scrolls, so the view is theirs from then on
  const moved = React.useRef(false);

  const { layout, routes, problems } = React.useMemo(() => {
    const all = Object.values(data.actions);
    // the order the action list numbers them in
    const layout = layoutStory(inListOrder(all));
    const problems = new Map(brokenReferences);
    const add = (action, text) =>
      problems.set(action.id, [...(problems.get(action.id) || []), text]);
    const content = findContentProblems(all);
    content.noContent.forEach((a) => add(a, "沒有任何內容"));
    content.noReply.forEach((a) => add(a, "圖文視窗沒有回應方式"));
    return { layout, routes: routeEdges(layout, describeEdge), problems };
  }, [data.actions, brokenReferences]);

  const colors = {
    next: theme.palette.text.secondary,
    also: theme.palette.info.main,
    back: theme.palette.warning.main,
    label: theme.palette.text.primary,
    background: theme.palette.background.default,
  };

  const width =
    2 * margin + layout.columns * nodeWidth + (layout.columns - 1) * columnGap;
  // room under the last row for lines that return to an earlier step
  const height =
    2 * margin + layout.rows * (nodeHeight + rowGap) + rowGap + 18;

  // Until the author moves the view, show as much of the story as stays
  // readable, with the initial action in view: in a wide story it sits far
  // down the page. Runs again when the story changes size, as it does when
  // fresh records replace cached ones.
  const startRow = layout.nodes[0]?.row;
  React.useLayoutEffect(() => {
    const view = viewport.current;
    if (!view || startRow === undefined || moved.current) return;
    // never start smaller than the names stay readable at; a long story
    // scrolls sideways instead
    const fit =
      [...zoomSteps]
        .reverse()
        .find((z) => z >= readableZoom && width * z <= view.clientWidth) ||
      readableZoom;
    setZoom(fit);
    view.scrollLeft = 0;
    view.scrollTop =
      (margin + startRow * (nodeHeight + rowGap) + nodeHeight / 2) * fit -
      view.clientHeight / 2;
  }, [data.actionsLoaded, startRow, width, height]);

  // after the author zooms, scroll so the middle of the view stays put
  const pendingScroll = React.useRef(null);
  React.useLayoutEffect(() => {
    const view = viewport.current;
    if (!view || !pendingScroll.current) return;
    view.scrollLeft = pendingScroll.current.scrollLeft;
    view.scrollTop = pendingScroll.current.scrollTop;
    pendingScroll.current = null;
  }, [zoom]);

  const retry = (
    <Button color="inherit" size="small" onClick={refresh}>
      重試
    </Button>
  );
  if (!data.actionsLoaded) {
    if (data.error)
      return (
        <Alert severity="error" sx={{ m: 2 }} action={retry}>
          讀不到這個劇本的動作：{describeError(data.error)}
        </Alert>
      );
    return <Box sx={{ p: 3 }}>載入中…</Box>;
  }

  const changeZoom = (step) => {
    moved.current = true;
    const at = zoomSteps.indexOf(zoom) + step;
    const next = zoomSteps[Math.max(0, Math.min(zoomSteps.length - 1, at))];
    if (viewport.current)
      pendingScroll.current = scrollForZoom(viewport.current, zoom, next);
    setZoom(next);
  };
  const markMoved = () => {
    moved.current = true;
  };

  const flagged = layout.nodes.filter((n) => problems.has(n.id)).length;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <span>
          共 {Object.keys(data.actions).length} 個動作
          {flagged > 0 && `，${flagged} 個需要修正`}
          {layout.unreachable.length > 0 &&
            `，${layout.unreachable.length} 個從開頭到不了`}
        </span>
        <ButtonGroup size="small" sx={{ marginLeft: "auto" }}>
          <Button onClick={() => changeZoom(-1)} disabled={zoom === zoomSteps[0]}>
            縮小
          </Button>
          <Button disabled>{Math.round(zoom * 100)}%</Button>
          <Button onClick={() => changeZoom(1)} disabled={zoom === 1}>
            放大
          </Button>
        </ButtonGroup>
      </Box>

      {data.error && (
        <Alert severity="warning" action={retry}>
          部分資料讀不到（{describeError(data.error)}
          ），所以無法檢查動作參照的聲音、圖片或地點是否還在。
        </Alert>
      )}

      {!layout.hasStart ? (
        <Alert severity="warning">
          這個劇本還沒有開頭動作，所以畫不出流程。請到
          <Link to="/actions">動作列表</Link>
          ，在第一個動作上按「設為開頭」。
        </Alert>
      ) : (
        <>
          <Legend colors={colors} />
          <Box
            ref={viewport}
            onWheel={markMoved}
            onPointerDown={markMoved}
            onKeyDown={markMoved}
            sx={{
              overflow: "auto",
              maxHeight: "calc(100vh - 230px)",
              // its width comes from the page, never from the graph inside:
              // otherwise a big story widens the whole page, which then
              // scrolls sideways instead of the graph
              contain: "inline-size",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "background.default",
            }}
          >
            <div style={{ width: width * zoom, height: height * zoom }}>
              <div
                style={{
                  position: "relative",
                  width,
                  height,
                  transform: `scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <svg
                  width={width}
                  height={height}
                  style={{ position: "absolute", left: 0, top: 0 }}
                >
                  <defs>
                    {["next", "also", "back"].map((kind) => (
                      <marker
                        key={kind}
                        id={`arrow-${kind}`}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={colors[kind]} />
                      </marker>
                    ))}
                  </defs>
                  {routes.map((route) => (
                    <EdgeLine
                      key={`${route.edge.from}\n${route.edge.to}`}
                      route={route}
                      colors={colors}
                    />
                  ))}
                </svg>
                {layout.nodes.map((node) => (
                  <ActionNode
                    key={node.id}
                    node={node}
                    problems={problems.get(node.id)}
                  />
                ))}
                {/* over the actions, so no label is ever hidden by one */}
                <svg
                  width={width}
                  height={height}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    pointerEvents: "none",
                  }}
                >
                  {routes.map(
                    (route) =>
                      route.label && (
                        <EdgeLabel
                          key={`${route.edge.from}\n${route.edge.to}`}
                          label={route.label}
                          colors={colors}
                        />
                      )
                  )}
                </svg>
              </div>
            </div>
          </Box>
        </>
      )}

      {layout.unreachable.length > 0 && (
        <Box>
          <Box sx={{ mb: 0.5 }}>
            從開頭到不了的動作（玩家不會遇到）：
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {layout.unreachable.map((action) => (
              <Chip
                key={action.id}
                component={Link}
                to={`/actions/${action.id}`}
                clickable
                variant="outlined"
                color="error"
                label={action.name || "（未命名）"}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export const StoryGraph = () => {
  const scenario = useCurrentScenario();
  return (
    <>
      <Title
        title={
          scenario ? `《${getCurrentScenarioName()}》流程圖` : "流程圖"
        }
      />
      {scenario ? (
        <ScenarioStoryGraph />
      ) : (
        <EmptyPage shows="流程" />
      )}
    </>
  );
};
