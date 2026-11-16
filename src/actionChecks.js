// Mistakes in a story that the reference check cannot see. Kept free of
// React so it can be tested with node --test.

// an action with none of these does nothing when it runs
const contentFlags = [
  "hasSound",
  "hasPopup",
  "hasPopupDismissal",
  "hasMarker",
  "hasMarkerRemoval",
  "hasIncomingCall",
  "hasHangUp",
  "hasMapStyle",
  "hasIntroImage",
  "hasGuideImage",
  "hasGuideImageRemoval",
  "hasSilence",
  "hasButtonStyle",
  "hasPopupStyle",
  "hasVariableUpdate",
  "endgame",
];

// actions that do nothing, and blocking popups with no way to answer
export function findContentProblems(actions) {
  return {
    noContent: actions.filter((a) => !contentFlags.some((f) => a[f])),
    noReply: actions.filter(
      (a) =>
        a.hasPopup &&
        (a.destinations || []).some((d) => d === "ALERT" || d === "INTRO") &&
        !(a.choices && a.choices.length > 0) &&
        !a.allowTextReply &&
        !a.allowNoReply
    ),
  };
}

// the content problems, plus the actions the player can never reach
export function checkActions(actionMap) {
  const all = Object.values(actionMap || {});
  const first = all.find((a) => a.firstAction);
  const followers = new Map();
  all.forEach((a) => {
    // the initial action's previous steps are hidden in the form and may be
    // stale; the action list and publishing do not follow them either
    if (a.firstAction) return;
    (a.prevs || []).forEach((p) => {
      if (!p || !p.prev) return;
      followers.set(p.prev, [...(followers.get(p.prev) || []), a.id]);
    });
  });
  const reachable = new Set();
  const queue = first ? [first.id] : [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    (followers.get(id) || []).forEach((f) => queue.push(f));
  }
  return {
    total: all.length,
    unreachable: all.filter((a) => !reachable.has(a.id)),
    ...findContentProblems(all),
  };
}
