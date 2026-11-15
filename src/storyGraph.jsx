import * as React from "react";
import { Title } from "react-admin";
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
import { checkActions } from "./scenarioChecks";
import { getContentIcon } from "./actionCommon";
import { describeTrigger } from "./flow";
import { layoutStory } from "./storyLayout";

// the grid from layoutStory, in pixels
const nodeWidth = 200;
const nodeHeight = 58;
// wide enough for a trigger such as 回答「好，我們出發」 between two columns
const columnGap = 170;
const rowGap = 20;
const margin = 24;

const left = (node) => margin + node.column * (nodeWidth + columnGap);
const top = (node) => margin + node.row * (nodeHeight + rowGap);
const middle = (node) => top(node) + nodeHeight / 2;

const zoomSteps = [0.4, 0.6, 0.8, 1];
const readableZoom = 0.8;

// the triggers of one line, e.g. 回答「好」／回答「當然」
function describeEdge(edge, from) {
  const texts = edge.entries.map((entry) => describeTrigger(entry, from.action));
  return [...new Set(texts.filter(Boolean))].join("／");
}

const shorten = (text, length) =>
  text.length > length ? text.slice(0, length - 1) + "…" : text;

function EdgeLine({ edge, from, to, colors }) {
  const label = describeEdge(edge, from);
  let path;
  let labelAt;
  let anchor = "end";
  if (to.column === from.column) {
    // within a column: out of the right side and back in, clear of the
    // actions stacked between the two
    const x = left(from) + nodeWidth;
    const y1 = middle(from);
    const y2 = middle(to);
    const bulge = 46 + Math.min(40, Math.abs(y2 - y1) / 8);
    path = `M ${x} ${y1} C ${x + bulge} ${y1}, ${x + bulge} ${y2}, ${x + 4} ${y2}`;
    labelAt = [x + bulge * 0.75 + 6, (y1 + y2) / 2 + 4];
    anchor = "start";
  } else if (to.column < from.column) {
    // leftwards: under both actions rather than across them
    const x1 = left(from) + nodeWidth / 2;
    const y1 = top(from) + nodeHeight;
    const x2 = left(to) + nodeWidth / 2;
    const y2 = top(to) + nodeHeight;
    const dip = Math.max(y1, y2) + rowGap + 18;
    path = `M ${x1} ${y1} C ${x1} ${dip}, ${x2} ${dip}, ${x2} ${y2 + 4}`;
    labelAt = [(x1 + x2) / 2, dip - 8];
    anchor = "middle";
  } else {
    const x1 = left(from) + nodeWidth;
    const y1 = middle(from);
    const x2 = left(to) - 4;
    const y2 = middle(to);
    const bend = Math.max(40, (x2 - x1) / 2);
    path = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
    // beside the action it leads to, where lines from one step have fanned out
    labelAt = [x2 - 8, y2 - 6];
  }
  const color = colors[edge.kind];
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={edge.kind === "next" ? undefined : "6 4"}
        markerEnd={`url(#arrow-${edge.kind})`}
      />
      {label && (
        <text
          x={labelAt[0]}
          y={labelAt[1]}
          textAnchor={anchor}
          fontSize={12}
          fill={colors.label}
          stroke={colors.background}
          strokeWidth={4}
          paintOrder="stroke"
        >
          <title>{label}</title>
          {shorten(label, 13)}
        </text>
      )}
    </g>
  );
}

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

  const { layout, problems } = React.useMemo(() => {
    // the order the action list reads them in, so the numbers match
    const actions = Object.values(data.actions).sort((a, b) =>
      String(a.id).toLowerCase() < String(b.id).toLowerCase() ? -1 : 1
    );
    const checks = checkActions(data.actions);
    const problems = new Map(brokenReferences);
    const add = (action, text) =>
      problems.set(action.id, [...(problems.get(action.id) || []), text]);
    checks.noContent.forEach((a) => add(a, "沒有任何內容"));
    checks.noReply.forEach((a) => add(a, "圖文視窗沒有回應方式"));
    return { layout: layoutStory(actions), problems };
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

  // When the story first appears, show as much of it as stays readable, with
  // the initial action in view: in a wide story it sits far down the page.
  const startRow = layout.nodes[0]?.row;
  React.useLayoutEffect(() => {
    const view = viewport.current;
    if (!data.loaded || !view || startRow === undefined) return;
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
    // only when a story loads, not on every edit or zoom
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.loaded, layout.hasStart]);

  if (!data.loaded) return <Box sx={{ p: 3 }}>載入中…</Box>;

  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
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
          <Button
            onClick={() => setZoom(zoomSteps[Math.max(0, zoomSteps.indexOf(zoom) - 1)])}
            disabled={zoom === zoomSteps[0]}
          >
            縮小
          </Button>
          <Button disabled>{Math.round(zoom * 100)}%</Button>
          <Button
            onClick={() =>
              setZoom(zoomSteps[Math.min(zoomSteps.length - 1, zoomSteps.indexOf(zoom) + 1)])
            }
            disabled={zoom === 1}
          >
            放大
          </Button>
        </ButtonGroup>
      </Box>

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
            sx={{
              overflow: "auto",
              maxHeight: "calc(100vh - 230px)",
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
                  {layout.edges.map((edge) => (
                    <EdgeLine
                      key={`${edge.from}-${edge.to}`}
                      edge={edge}
                      from={byId.get(edge.from)}
                      to={byId.get(edge.to)}
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
        <Box sx={{ p: 3 }}>
          <h2>還沒有選擇要編輯的劇本</h2>
          <p>
            到劇本列表，在想編輯的劇本上按「設定為目前劇本」，這一頁就會顯示它的流程。
          </p>
          <Button component={Link} to="/scenarios" variant="contained">
            前往劇本列表
          </Button>
        </Box>
      )}
    </>
  );
};
