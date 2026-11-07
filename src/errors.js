// Turns the errors Firebase, fetch and the code throw into a sentence the
// author can act on. Technical detail goes to the console, not the screen.

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
  if (/Unsupported field value: undefined/.test(message))
    return "有欄位是空的，請把資料填完整後再試";
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
      const message =
        json.message || json.error || json.detail || json.errors || json.reason;
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

const maxMessageLength = 300;

// the Ghostspeak server's reply to publish, unpublish and send. Reads the body
// and logs the whole exchange (what was asked, what came back) to the console
// so a failure can be pinned down, then returns a sentence for the screen.
export async function describeResponse(response, context = {}) {
  const status = response?.status;
  const { raw, message } = await readResponseBody(response);
  console.error("伺服器回覆錯誤 (server request failed)", {
    ...context,
    url: response?.url,
    status,
    statusText: response?.statusText,
    body: raw,
  });
  const shortMessage =
    message.length > maxMessageLength
      ? message.slice(0, maxMessageLength) + "…"
      : message;
  const body = shortMessage ? `（${shortMessage}）` : "";
  if (status === 401 || status === 403) return "伺服器拒絕了這個操作，請確認你有權限" + body;
  if (status === 404) return "伺服器上找不到這個劇本" + body;
  if (status === 409) return "伺服器上的資料有衝突，請重新整理後再試" + body;
  if (status >= 500) return `伺服器發生錯誤（${status}），請稍後再試` + body;
  return `伺服器回覆 ${status}` + body;
}
