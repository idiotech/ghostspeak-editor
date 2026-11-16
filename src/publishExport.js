// Turns the editor's records into the script the server runs for players.
// Kept free of React so it can be tested with node --test.
import { getPrevId } from "./actionType.js";

export const DEFAULT_GEOFENCE_MODE = "ARRIVE";
// what a fence saved without a radius has always been published with
export const LEGACY_GEOFENCE_RADIUS = 14;

// the trigger condition the server expects, from an action's previous-step
// entry or from a broadcast itself; shared so both publish the same shape
export function buildCondition(node, { locations, beacons }) {
  if (!node.conditionType || node.conditionType === "ALWAYS")
    return { type: "ALWAYS" };
  return {
    type: node.conditionType,
    beaconId: (node.beacon && beacons[node.beacon]?.beaconId) || null,
    threshold: node.beaconThreshold,
    mode:
      node.conditionType === "GEOFENCE"
        ? node.geofenceMode || DEFAULT_GEOFENCE_MODE
        : node.beaconType,
    location: node.geofenceCenter ? locations[node.geofenceCenter] : null,
    radius: node.geofenceRadius || LEGACY_GEOFENCE_RADIUS,
  };
}

function getActTime(currentNode, name) {
  const delayHour = currentNode[name + "DelayHour"] || 0;
  const delayMin = currentNode[name + "DelayMinute"] || 0;
  const delaySecond = currentNode[name + "DelaySecond"] || 0;
  const delayMilli = currentNode[name + "DelayMilli"] || 0;
  const delay =
    (delayHour * 3600 + delayMin * 60 + delaySecond) * 1000 + delayMilli;
  const randomHour = currentNode[name + "RandomHour"] || 0;
  const randomMin = currentNode[name + "RandomMinute"] || 0;
  const randomSecond = currentNode[name + "RandomSecond"] || 0;
  const randomMilli = currentNode[name + "RandomMilli"] || 0;
  const random =
    (randomHour * 3600 + randomMin * 60 + randomSecond) * 1000 + randomMilli;

  const clockTime = currentNode[name + "Time"]
    ? currentNode[name + "Time"] + ":00"
    : null;
  if (clockTime || delay || random) {
    return {
      target: clockTime,
      minAfter: delay,
      range: random,
    };
  } else return null;
}

export const getActions = (currentNode, data, condition) => {
  const { sounds, locations, images, mapStyles, variables, beacons } = data;
  const ret = [];
  // if (currentNode.hasSound && !sounds[currentNode.soundId]) {
  //   console.log('bad sound:', currentNode.name);
  // }
  const sender = currentNode.sender || "ghost";
  if (currentNode.hasSound) {
    const sound = sounds[currentNode.soundId];
    if (!sound) {
      throw `聲音不存在: ${currentNode.name}`;
    }
    if (currentNode.soundCenterId && !locations[currentNode.soundCenterId]) {
      throw `聲音中心點不存在: ${currentNode.name}\n`;
    }
    const fadeOutSeconds = currentNode.fadeOutSeconds;
    const speechLength = currentNode.speechLength;
    const mainVolume = currentNode.speechLength
      ? {
          speechLength,
          fadeOutSeconds: fadeOutSeconds || 5,
        }
      : null;
    const soundAction = {
      id: currentNode.id + "-sound",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "SOUND",
          url: sound ? sound.sound.src : null,
          volumeSetting: {
            type: currentNode.mode || "STATIC_VOLUME",
            center: currentNode.soundCenterId
              ? locations[currentNode.soundCenterId]
              : null,
            fadeOutSeconds,
            speechLength,
            radius: currentNode.range || 30,
            minVolume:
              currentNode.mode === "DYNAMIC_VOLUME"
                ? currentNode.minVolume
                : currentNode.beaconMinVolume,
            minValue: currentNode.beaconMinValue,
            maxValue: currentNode.beaconMaxValue,
            beaconId: currentNode.beaconForSound
              ? beacons[currentNode.beaconForSound].beaconId
              : null,
            mainVolume,
          },
          mode: currentNode.soundType || "MAIN",
        },
        condition: condition,
      },
      delay: currentNode.soundDelay,
      time: getActTime(currentNode, "sound"),
      description: currentNode.name,
    };
    ret.push(soundAction);
  }

  if (currentNode.hasPopup) {
    const ps = currentNode.pictures;
    if (ps) {
      ps.forEach((p) => {
        if (!images[p.pictureId] || !images[p.pictureId].image.src) {
          throw `圖片不存在：${currentNode.name}`;
        }
      });
    }
    const popupAction = {
      id: currentNode.id + "-popup",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "POPUP",
          destinations: currentNode.destinations,
          text: currentNode.text,
          choices:
            currentNode.choices && !currentNode.allowNoReply
              ? currentNode.choices.map((c) => c.choice)
              : [],
          pictures: ps ? ps.map((p) => images[p.pictureId].image.src) : [],
          allowTextReply:
            currentNode.allowTextReply && !currentNode.allowNoReply
              ? true
              : false,
          closeAlertAfterReply: !currentNode.dontCloseAlertAfterReply,
          clearDialog: currentNode.clearDialog,
        },
        condition: condition,
      },
      delay: currentNode.popupDelay,
      time: getActTime(currentNode, "popup"),
      description: currentNode.name,
    };
    ret.push(popupAction);
  }
  if (currentNode.hasIncomingCall) {
    const portrait = images[currentNode.portrait];
    if (!portrait) throw `頭像不存在: ${currentNode.name}`;
    const incomingCallAction = {
      id: currentNode.id + "-incoming-call",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "INCOMING_CALL",
          caller: currentNode.caller,
          portrait: currentNode.portrait ? portrait.image.src : null,
          status: currentNode.callStatus,
        },
        condition: condition,
      },
      delay: currentNode.incomingCallDelay,
      time: getActTime(currentNode, "incomingCall"),
      description: currentNode.name,
    };
    ret.push(incomingCallAction);
  }
  if (currentNode.hasHangUp) {
    const portrait = images[currentNode.portrait];
    if (!portrait) throw `頭像不存在: ${currentNode.name}`;
    const hangUpAction = {
      id: currentNode.id + "-hang-up",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "INCOMING_CALL",
          caller: currentNode.caller,
          portrait: currentNode.portrait
            ? images[currentNode.portrait].image.src
            : null,
          status: "DISCONNECTED",
        },
        condition: condition,
      },
      delay: currentNode.hangUpDelay,
      time: getActTime(currentNode, "hangUp"),
      description: currentNode.name,
    };
    ret.push(hangUpAction);
  }
  if (currentNode.hasMarker) {
    const icon = images[currentNode.markerIcon];
    if (!icon) throw `圖釘不存在: ${currentNode.name}`;
    const location = locations[currentNode.locationId];
    if (!location) throw `地點不存在: ${currentNode.name}`;
    const markerAction = {
      id: currentNode.id + "-marker",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "MARKER",
          icon: currentNode.markerIcon
            ? icon.image.src
            : // ? `${cdnRoot}/${props.record.id}/images/${currentNode.markerIcon}/image`
              null,
          location: currentNode.locationId ? location : null,
          title: currentNode.title,
          id: currentNode.markerId,
        },
        condition: condition,
      },
      delay: currentNode.markerDelay,
      time: getActTime(currentNode, "marker"),
      description: currentNode.name,
    };
    ret.push(markerAction);
  }
  if (currentNode.hasMarkerRemoval) {
    const markerRemovalAction = {
      id: currentNode.id + "-marker-removal",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "MARKER_REMOVAL",
          id: currentNode.markerId + "-marker",
        },
        condition: condition,
      },
      delay: currentNode.markerRemovalDelay,
      time: getActTime(currentNode, "markerRemoval"),
      description: currentNode.name,
    };
    ret.push(markerRemovalAction);
  }
  if (currentNode.hasPopupDismissal) {
    const popupDismissalAction = {
      id: currentNode.id + "-popup-dismissal",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "POPUP_DISMISSAL",
          destinations: currentNode.dismissalDestinations,
        },
        condition: condition,
      },
      delay: currentNode.dismissalDelay,
      time: getActTime(currentNode, "dismissal"),
      description: currentNode.name,
    };
    ret.push(popupDismissalAction);
  }
  if (
    currentNode.hasMapStyle &&
    (currentNode.satellite || currentNode.mapStyle)
  ) {
    const mapStyle = mapStyles[currentNode.mapStyle];
    if (!currentNode.satellite && !mapStyle) {
      throw `地圖樣式不存在: ${currentNode.name}`;
    }
    const mapStyleAction = {
      id: currentNode.id + "-map-style",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "MAP_STYLE",
          url: currentNode.satellite
            ? null
            : currentNode.mapStyle
            ? mapStyle.mapStyle.src
            : null,
          satellite: currentNode.satellite,
        },
        condition: condition,
      },
      delay: currentNode.mapStyleDelay,
      time: getActTime(currentNode, "mapStyle"),
      description: currentNode.name,
    };
    ret.push(mapStyleAction);
  }
  if (currentNode.hasIntroImage) {
    const introBackground = images[currentNode.introBackground];
    // if (!introBackground) throw `背景不存在: ${currentNode.name}`;
    const introLogo = images[currentNode.introLogo];
    const introLogoUrl = currentNode.noIntroLogo
      ? "https://storage.googleapis.com/daqiaotou/images/Empty.png"
      : introLogo?.image.src;
    // if (!introLogo) throw `Logo不存在: ${currentNode.name}`;
    const mapLogo = images[currentNode.mapLogo];
    // if (!mapLogo) throw `地圖Logo不存在: ${currentNode.name}`;
    const introImageAction = {
      id: currentNode.id + "-intro-image",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "INTRO_IMAGE",
          backgroundUrl: currentNode.introBackground
            ? introBackground.image.src
            : null,
          logoUrl: introLogoUrl,
          textColor: currentNode.introTextColor || null,
          theme: currentNode.introTheme || null,
          accentColor: currentNode.introAccentColor || null,
          mapLogoUrl: currentNode.mapLogo ? mapLogo.image.src : null,
          logoMarginTop: currentNode.introLogoMarginTop,
          logoWidth: currentNode.introLogoWidth,
          logoHeight: currentNode.introLogoHeight,
        },
        condition: condition,
      },
      delay: currentNode.introImageDelay,
      time: getActTime(currentNode, "introImage"),
      description: currentNode.name,
    };
    ret.push(introImageAction);
  }
  if (currentNode.hasButtonStyle) {
    const buttonStyleAction = {
      id: currentNode.id + "-button-style",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "BUTTON_STYLE",
          textColor: currentNode.textColor,
          backgroundColor: currentNode.backgroundColor,
        },
        condition: condition,
      },
      delay: currentNode.buttonStyleDelay,
      time: getActTime(currentNode, "buttonStyle"),
      description: currentNode.name,
    };
    ret.push(buttonStyleAction);
  }
  if (currentNode.hasPopupStyle) {
    const popupStyleAction = {
      id: currentNode.id + "-popup-style",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "POPUP_STYLE",
          alertTextColor: currentNode.alertTextColor,
          panelColor: currentNode.panelColor,
        },
        condition: condition,
      },
      delay: currentNode.popupStyleDelay,
      time: getActTime(currentNode, "popupStyle"),
      description: currentNode.name,
    };
    ret.push(popupStyleAction);
  }
  if (currentNode.hasVariableUpdate) {
    const variableUpdates = currentNode.variableUpdates.map((vu) => ({
      name: vu.variable ? variables[vu.variable]?.name : null,
      operation: vu.operation,
      value: vu.value,
    }));

    const variableAction = {
      id: currentNode.id + "-variable-update" + "",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "VARIABLE_UPDATES",
          updates: variableUpdates,
        },
        condition: condition,
      },
      description: currentNode.name,
    };
    ret.push(variableAction);
  }
  if (currentNode.firstAction) {
    const updates = [];
    for (const key in variables) {
      const v = variables[key];
      updates.push({
        name: v.name,
        operation: "=",
        value: v.value,
      });
    }
    const variableAction = {
      id: currentNode.id + "-variable-default" + "",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "VARIABLE_UPDATES",
          updates: updates,
        },
        condition: condition,
      },
      description: currentNode.name,
    };
    ret.push(variableAction);
  }
  if (currentNode.endgame) {
    const endgameAction = {
      id: currentNode.id + "-endgame",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "END_GAME",
        },
        condition: condition,
      },
      delay: currentNode.endgameDelay,
      time: getActTime(currentNode, "endgame"),
      description: currentNode.name,
    };
    ret.push(endgameAction);
  }
  if (currentNode.hasGuideImage) {
    const guideImage = images[currentNode.guideImage];
    if (!guideImage) throw `指引圖片不存在: ${currentNode.name}`;
    const guideImageAction = {
      id: currentNode.id + "-guide-image",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "GUIDE_IMAGE",
          image: currentNode.guideImage ? guideImage.image.src : null,
        },
        condition: condition,
      },
      delay: currentNode.guideImageDelay,
      time: getActTime(currentNode, "guideImage"),
      description: currentNode.name,
    };
    ret.push(guideImageAction);
  }
  if (currentNode.hasGuideImageRemoval) {
    const guideImageRemovalAction = {
      id: currentNode.id + "-guide-image-removal",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "GUIDE_IMAGE_REMOVAL",
          id: currentNode.guideImageId,
        },
        condition: condition,
      },
      delay: currentNode.guideImageRemovalDelay,
      time: getActTime(currentNode, "guideImageRemoval"),
      description: currentNode.name,
    };
    ret.push(guideImageRemovalAction);
  }
  if (currentNode.hasSilence) {
    const silenceAction = {
      id: currentNode.id + "-silence",
      receiver: "?u",
      sender: sender,
      content: {
        task: {
          type: "SILENCE",
          id: currentNode.silencedSound + "-sound",
          fadeOutSeconds: currentNode.forceFadeOutSeconds,
        },
        condition: condition,
      },
      delay: currentNode.silenceDelay,
      time: getActTime(currentNode, "silence"),
      description: currentNode.name,
    };
    ret.push(silenceAction);
  }
  return ret.map((a) => ({
    ...a,
    session: {
      scenario: "",
      chapter: "",
    },
  }));
};

export function getTriggers(currentNode, parents) {
  if (currentNode.firstAction) {
    return [
      {
        id: "",
        actionId: null,
        receiver: "ghost",
        sender: "?u",
        payload: {
          type: "JOIN",
        },
        scenarioId: "",
      },
    ];
  } else {
    const ret = parents.flatMap((p) => getTriggerList(currentNode, p));
    return ret.filter((value, index) => {
      const _value = JSON.stringify(value);
      return (
        index ===
        ret.findIndex((obj) => {
          return JSON.stringify(obj) === _value;
        })
      );
    });
  }
}

function getTriggerList(currentNode, parentNode) {
  return currentNode.prevs
    .filter((p) => p.prev == parentNode.id)
    .map((condition) => {
      if (!condition) {
        console.error(
          "bad parent",
          currentNode.name,
          parentNode.name,
          parentNode.id,
          currentNode.prevs.map((p) => p.prev)
        );
      }
      const actionId =
        condition.conditionType === "TEXT"
          ? parentNode.id + "-popup"
          : getPrevId(parentNode);

      return {
        id: "",
        actionId: actionId,
        receiver: parentNode.sender || "ghost",
        sender: "?u",
        payload: {
          type: condition.conditionType === "TEXT" ? "TEXT" : "END",
          text: condition.fallback ? "fallback:" : condition.userReply,
          asVariable: condition.asVariable,
        },
        scenarioId: "",
      };
    });
}

// the previous-step entries that carry a condition of their own
function conditionEntries(node) {
  if (node.firstAction) return [];
  return (node.prevs || []).filter(
    (p) => p && p.conditionType != "TEXT" && p.conditionType
  );
}

// The script has one condition per action, so only the first entry's is
// published. hasConflictingConditions finds the actions where that loses
// something.
export function getCondition(currentNode, data) {
  // the initial action has no trigger; a previous step's TEXT reply is a
  // trigger message, not a condition
  return buildCondition(conditionEntries(currentNode)[0] || {}, data);
}

// what buildCondition reads from an entry, to tell two conditions apart
function conditionKey(entry) {
  if (entry.conditionType === "ALWAYS") return "ALWAYS";
  if (entry.conditionType === "GEOFENCE")
    return JSON.stringify([
      "GEOFENCE",
      entry.geofenceCenter || null,
      entry.geofenceRadius || LEGACY_GEOFENCE_RADIUS,
      entry.geofenceMode || DEFAULT_GEOFENCE_MODE,
    ]);
  return JSON.stringify([
    entry.conditionType,
    entry.beacon || null,
    entry.beaconThreshold ?? null,
    entry.beaconType || null,
  ]);
}

// true when the action's previous steps ask for different conditions, of
// which only the first is published
export function hasConflictingConditions(action) {
  const keys = new Set(conditionEntries(action).map(conditionKey));
  return keys.size > 1;
}

function getFriends(node, condition, { people, images }, nextId) {
  return Object.values(people).map((f) => {
    let portrait = null;
    if (f.userPortrait) {
      portrait = images[f.userPortrait]?.image?.src;
    }
    return {
      id: nextId() + "-friend",
      receiver: "?u",
      sender: "ghost",
      content: {
        task: {
          type: "FRIEND",
          id: f.id,
          icon: portrait,
          name: f.name,
        },
        condition: condition,
      },
      description: node.name,
      session: {
        scenario: "",
        chapter: "",
      },
    };
  });
}

// the home page shown when the initial action has nothing for it
const shadowIntro = () => ({
  action: {
    id: "shadow-intro",
    receiver: "?u",
    sender: "ghost",
    content: {
      task: {
        type: "POPUP",
        destinations: ["INTRO"],
        text: "",
        allowTextReply: false,
      },
      condition: {
        type: "ALWAYS",
      },
    },
    delay: 0,
    time: null,
    description: "首頁",
    session: {
      scenario: "",
      chapter: "",
    },
  },
});

// The whole script: one node per action reachable from the initial one,
// the initial node first. `actionTree` comes from getActionTree, `data` from
// useAllData, and `nextId` makes the ids of the friend introductions.
export function buildTemplate(actionTree, data, nextId) {
  const { actions, variables } = data;

  function getNode(tree) {
    const parents = tree.node.prevs
      ? tree.node.prevs.map((p) => actions[p.prev])
      : [];
    const condition = getCondition(tree.node, data);
    const serverActions = getActions(tree.node, data, condition);
    const isFirst = tree.node.firstAction;
    if (isFirst) {
      getFriends(tree.node, condition, data, nextId).forEach((f) =>
        serverActions.push(f)
      );
    }
    return {
      name: isFirst ? "initial" : tree.node.id,
      children: tree.node.children || [],
      exclusiveWith: (tree.node.exclusiveWith || []).filter((e) => e),
      triggers: getTriggers(tree.node, parents),
      performances: serverActions.map((a) => ({
        action: a,
        delay: a.delay === 0 || a.delay ? a.delay : 0,
        time: a.time,
      })),
      preconditions: tree.node.preconditions?.map((p) => ({
        name: variables[p.variable]?.name,
        comparison: p.comparison,
        value: p.value,
      })),
    };
  }

  function getNodes(tree) {
    return tree.children.reduce(
      (agg, c) => [...agg, ...getNodes(c)],
      [getNode(tree)]
    );
  }

  const template = getNodes(actionTree);
  const initialNode = template[0];
  const tasks = initialNode.performances.map((p) => p.action.content.task);
  const validInitial = tasks.find(
    (t) =>
      t.type === "MARKER" ||
      (t.type === "POPUP" && t.destinations.indexOf("INTRO") >= 0) ||
      t.type === "INTRO_IMAGE"
  );
  if (!validInitial) initialNode.performances.push(shadowIntro());
  return template;
}
