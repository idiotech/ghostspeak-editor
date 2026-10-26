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

// the Ghostspeak server's reply to publish, unpublish and send
export function describeResponse(response) {
  const status = response?.status;
  const body = response?.body ? `（${response.body}）` : "";
  if (status === 401 || status === 403) return "伺服器拒絕了這個操作，請確認你有權限" + body;
  if (status === 404) return "伺服器上找不到這個劇本" + body;
  if (status === 409) return "伺服器上的資料有衝突，請重新整理後再試" + body;
  if (status >= 500) return `伺服器發生錯誤（${status}），請稍後再試` + body;
  return `伺服器回覆 ${status}` + body;
}
