// 首启隐私须知的「看过没有」状态。
//
// 这不是同意书，是告知：没有「拒绝」这一支，所以状态只有「看过第几版」一个维度。
// 存的是版本号而不是布尔值——以后应用真的多出一种外发行为时，把 NOTICE_VERSION +1，
// 老用户会再看一次；只改错别字就别动它，别为了排版拿弹窗打扰所有人。
//
// 不进 storage.js 的 KEY_MAP：它是本机的一次性提示状态，不是用户数据，
// 不该跟着备份导出跑到另一台设备上去（在新设备上第一次打开，就该重新告知一次）。

export const NOTICE_VERSION = 1;

const ACK_KEY = "privacy_notice_ack_v1";

/** 看过的版本号低于当前版本（或从没看过）就要弹。 */
export function shouldShowNotice(ack) {
  if (!ack || typeof ack.version !== "number") return true;
  return ack.version < NOTICE_VERSION;
}

/** 读回 { version, at }；没存过或存坏了都当没看过。 */
export function readAck() {
  try {
    const raw = localStorage.getItem(ACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAck(now = Date.now()) {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify({ version: NOTICE_VERSION, at: now }));
  } catch {
    // 配额满时记不住无所谓：最坏情况是下次打开再弹一次，比让启动流程崩了强。
  }
}

/** 设置页的「当作第一次打开再看一遍」。 */
export function clearAck() {
  try {
    localStorage.removeItem(ACK_KEY);
  } catch {
    /* 同上，读不到写不进都不该影响主流程 */
  }
}
