// Turns the errors Firebase, fetch and the code throw into a sentence the
// author can act on. Technical detail goes to the console, not the screen.

import { describePath } from "./fieldLabels.js";

const firebaseCodes = {
  "permission-denied": "你沒有權限修改這個劇本",
  unauthenticated: "登入已逾期，請重新登入",
  "not-found": "資料不存在，可能已被刪除",
  "already-exists": "已經有相同代號的資料",
  unavailable: "無法連線到伺服器，請檢查網路後再試",
  "deadline-exceeded": "伺服器回應逾時，請稍後再試",
  "resource-exhausted": "資料庫用量已達上限，請稍後再試",
  cancelled: "操作已取消",
};

export function describeError(e) {
  if (!e) return "不明的錯誤";
  if (typeof e === "string") return e;
  // Firebase codes look like "permission-denied" or "firestore/permission-denied"
  const code = typeof e.code === "string" ? e.code.split("/").pop() : "";
  if (firebaseCodes[code]) return firebaseCodes[code];
  const message = e.message || String(e);
  // Firestore: "Unsupported field value: undefined (found in field description in document ...)"
  if (/Unsupported field value: undefined/.test(message)) {
    const field = /found in field (\S+)/.exec(message)?.[1];
    return field
      ? `${describePath(field)}欄位是空的，請把資料填完整後再試`
      : "有欄位是空的，請把資料填完整後再試";
  }
  if (/Failed to fetch|NetworkError|network-request-failed|ERR_INTERNET/i.test(message))
    return "無法連線到伺服器，請檢查網路後再試";
  if (/quota|exceeded/i.test(message)) return "資料庫用量已達上限，請稍後再試";
  if (e instanceof TypeError || e instanceof RangeError)
    return `程式發生錯誤（${message}）`;
  return message;
}

// Reads the body of a failed fetch Response. response.body is a stream, not
// text, so it has to be read (once) to be useful. Returns the raw text and,
// when the server sent JSON with a message field, that message.
async function readResponseBody(response) {
  let raw = "";
  try {
    raw = (await response.text()).trim();
  } catch (e) {
    return { raw: "", message: `無法讀取伺服器回覆：${e.message || e}` };
  }
  if (!raw) return { raw, message: "" };
  try {
    const json = JSON.parse(raw);
    if (json && typeof json === "object") {
      const message = ["message", "error", "detail", "errors", "reason"]
        .map((key) => json[key])
        .find(
          (value) =>
            (typeof value === "string" && value.trim() !== "") ||
            (value && typeof value === "object" && Object.keys(value).length > 0)
        );
      if (message)
        return {
          raw,
          message: typeof message === "string" ? message : JSON.stringify(message),
        };
    }
  } catch (e) {
    // not JSON; fall through and use the text itself
  }
  // an HTML error page (from a proxy, say) is noise on screen; keep it for the log
  if (/^<(!doctype|html)/i.test(raw)) return { raw, message: "" };
  return { raw, message: raw };
}

const maxMessageLength = 400;
const maxValueLength = 80;

function clip(text, max = maxMessageLength) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// Splits a circe cursor path like ".[3].performances[0].action.content.task.text"
// (or "[3].performances[0]...") into ["3", "performances", "0", ...].
function splitPath(path) {
  const parts = [];
  const re = /\[(\d+)\]|\.?([^.[\]]+)/g;
  let m;
  while ((m = re.exec(path)) !== null) parts.push(m[1] !== undefined ? m[1] : m[2]);
  return parts;
}

// circe's reasons, in the author's words. Anything else is shown as is.
function translateReason(reason, field) {
  const fieldText = field ? `欄位「${field}」` : "有個欄位";
  if (/Missing required field/i.test(reason)) return `缺少必要${fieldText}`;
  // circe: Got value '<json>' with wrong type, expecting <type>
  const wrongType = reason.match(/Got value '(.*)' with wrong type, expecting (.+)$/is);
  if (wrongType)
    return `${fieldText}的值不對：需要 ${wrongType[2]}，但給的是 ${clip(wrongType[1], maxValueLength)}`;
  if (/wrong type, expecting (.+)$/i.test(reason))
    return `${fieldText}的值不對：需要 ${reason.match(/expecting (.+)$/i)[1]}`;
  if (/not found in|not a valid|unknown|unexpected/i.test(reason))
    return `${fieldText}的值伺服器不認得：${reason}`;
  return `${fieldText}：${reason}`;
}

// the editor's names for the task types it publishes
const taskNames = {
  SOUND: "聲音",
  POPUP: "對話框",
  POPUP_DISMISSAL: "關閉對話框",
  POPUP_STYLE: "對話框樣式",
  BUTTON_STYLE: "按鈕樣式",
  INCOMING_CALL: "來電",
  MARKER: "地圖標記",
  MARKER_REMOVAL: "移除地圖標記",
  MAP_STYLE: "地圖樣式",
  INTRO_IMAGE: "開場圖",
  GUIDE_IMAGE: "導覽圖",
  GUIDE_IMAGE_REMOVAL: "移除導覽圖",
  SILENCE: "靜音",
  VARIABLE_UPDATES: "變數更新",
  END_GAME: "結束遊戲",
  FRIEND: "好友",
};

// One editor effect becomes one or more server actions, and the editor adds
// some of its own (friends, the shadow intro), so the position in
// `performances` means nothing to the author. Name the effect by its type.
function describeEffect(performance, index) {
  const action = performance?.action;
  const type = action?.content?.task?.type;
  if (!type) return `的第 ${index + 1} 個效果`;
  const name = taskNames[type] ? `${taskNames[type]}（${type}）` : type;
  const generated = action?.id === "shadow-intro" || type === "FRIEND";
  return `的${name}效果` + (generated ? "（由編輯器自動加入，請回報給開發者）" : "");
}

// Names the place in the published template that a circe path points at:
// which editor action (node), which of its effects (performance), which field.
function locateInTemplate(parts, template, actions) {
  // the server decodes the template on its own, but tolerate a path rooted at
  // the request body ({ template, metadata })
  if (parts[0] === "template") parts = parts.slice(1);
  if (parts[0] === "metadata")
    return "劇本設定" + (parts[1] !== undefined ? `的「${parts[1]}」` : "");
  if (!Array.isArray(template) || parts.length === 0) return null;
  const node = template[Number(parts[0])];
  if (!node) return null;
  const actionName =
    node.name === "initial" ? "初始動作" : actions?.[node.name]?.name || node.name;
  let where = `動作「${actionName}」`;
  if (parts[1] === "performances" && parts[2] !== undefined) {
    const index = Number(parts[2]);
    where += describeEffect(node.performances?.[index], index);
  } else if (parts[1] === "triggers" && parts[2] !== undefined) {
    where += `的第 ${Number(parts[2]) + 1} 個觸發條件`;
  } else if (parts[1] === "preconditions" && parts[2] !== undefined) {
    where += `的第 ${Number(parts[2]) + 1} 個前提條件`;
  } else if (parts[1] !== undefined) {
    where += `的「${parts[1]}」`;
  }
  return where;
}

// Turns the server's "invalid template: DecodingFailure at <path>: <reason>"
// (circe 0.14's getMessage) into a sentence naming the action, the effect and
// the field at fault.
export function describeTemplateFailure(message, template, actions) {
  const circe = message.match(/DecodingFailure at (\S+): (.*)$/s);
  if (!circe) {
    const parse = message.match(/ParsingFailure: (.*)$/s);
    return clip(
      parse
        ? `伺服器讀不懂送出的劇本資料（${parse[1]}）`
        : `伺服器無法接受這個劇本：${message}`
    );
  }
  const [, path, reason] = circe;
  const parts = splitPath(path);
  const last = parts[parts.length - 1];
  const field = last !== undefined && isNaN(Number(last)) ? last : "";
  const where = locateInTemplate(parts, template, actions);
  const problem = translateReason(reason.trim(), field);
  if (!where) return clip(`劇本資料的 ${path} ${problem}`);
  const advice = where.startsWith("劇本設定") ? "請修正劇本設定後再發佈" : "請修正這個動作後再發佈";
  return clip(`${where}${problem}。${advice}`);
}

// What the Ghostspeak server is telling us, in plain language. The server
// answers a bad publish with a 500 whose text explains the problem, so the
// text matters more than the status.
function describeServerMessage(status, message, context) {
  const invalid = message.match(/invalid (?:scenario|template)[:：]\s*(.*)$/is);
  if (invalid) {
    const inner = invalid[1].replace(/^invalid template:\s*/i, "");
    return describeTemplateFailure(inner, context.template, context.actions);
  }
  // a request about a scenario (publish, unpublish, broadcast) carries its id
  const aboutScenario = !!context.scenarioId;
  if (/no such scenario/i.test(message))
    return aboutScenario
      ? "伺服器上找不到這個劇本，可能尚未發佈或已被解除發佈"
      : "伺服器回覆「no such scenario」";
  const shortMessage = clip(message);
  const detail = shortMessage ? `（${shortMessage}）` : "";
  if (status === 401 || status === 403) return "伺服器拒絕了這個操作，請確認你有權限" + detail;
  if (status === 404)
    return aboutScenario
      ? "伺服器上找不到這個劇本" + detail
      : "伺服器上沒有這個功能的位址（404），請確認伺服器網址" + detail;
  if (status === 409) return "伺服器上的資料有衝突，請重新整理後再試" + detail;
  if (status >= 500)
    return shortMessage
      ? `伺服器發生錯誤（${status}）：${shortMessage}`
      : `伺服器發生錯誤（${status}），沒有說明原因；詳細紀錄在瀏覽器主控台（Console）`;
  return `伺服器回覆 ${status}` + detail;
}

// the Ghostspeak server's reply to publish, unpublish and send. Reads the body
// and logs the whole exchange (what was asked, what came back) to the console
// so a failure can be pinned down, then returns a sentence for the screen.
// context may carry the published template and the editor's actions map so a
// template error can name the action at fault.
export async function describeResponse(response, context = {}) {
  const status = response?.status;
  const { raw, message } = await readResponseBody(response);
  const { template, actions, ...logged } = context;
  console.error("伺服器回覆錯誤 (server request failed)", {
    ...logged,
    ...(template ? { nodes: template.length } : {}),
    url: response?.url,
    status,
    statusText: response?.statusText,
    body: raw,
  });
  return describeServerMessage(status, message, context);
}
