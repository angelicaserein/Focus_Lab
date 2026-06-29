// ──────────────────────────────────────────────────────────────
//  系统通知（Notification API）封装
//
//  包一层的原因：
//   ① 兼容不支持 Notification 的环境（旧浏览器、iOS Safari 非 PWA 等）；
//   ② 统一带上品牌图标、点击聚焦窗口；
//   ③ 用 tag 折叠同类通知，避免刷屏。
//
//  注意：授权请求 requestPermission() 必须由用户手势触发（如点击设置开关），
//  否则部分浏览器会忽略或直接拒绝。
// ──────────────────────────────────────────────────────────────

// 图标用绝对 URL，避免 Notification 在不同页面路径下解析相对路径出错。
// 惰性计算：模块顶层不触碰 location，以兼容非浏览器环境（如单测的 node 环境）。
function iconUrl() {
  if (typeof location === "undefined") return undefined;
  return new URL(`${import.meta.env.BASE_URL}icon-192.png`, location.href).href;
}

export function notifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

// 当前授权状态："granted" | "denied" | "default" | "unsupported"
export function notifyPermission() {
  return notifySupported() ? Notification.permission : "unsupported";
}

export async function requestNotifyPermission() {
  if (!notifySupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// 弹一条系统通知。未授权 / 不支持时静默返回 null。
export function showNotification(title, { body, tag, onClick } = {}) {
  if (!notifySupported() || Notification.permission !== "granted") return null;
  try {
    const icon = iconUrl();
    const n = new Notification(title, {
      body,
      tag,
      icon,
      badge: icon,
    });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
    return n;
  } catch {
    // 部分移动端浏览器要求经由 ServiceWorkerRegistration.showNotification，
    // 直接 new Notification 会抛错——此处静默降级。
    return null;
  }
}
