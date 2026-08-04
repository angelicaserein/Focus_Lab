// 注册 PWA service worker（仅生产环境）。
//
// 为什么只在生产注册：开发模式下 Vite 以未打包的原始模块提供文件并依赖 HMR 热更新，
// 一旦 SW 介入缓存，热更新会失灵、还容易拿到旧文件。所以本地 `npm run dev` 不注册，
// 只有 `npm run build` 产物（线上 / `npm run preview`）才启用离线与可安装能力。
//
// 路径用 import.meta.env.BASE_URL 兼容 vite.config.js 里的 base: './'。
export default function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  // Electron 桌面版：整个应用本来就装在本地，离线缓存没有意义；
  // 而 SW 一旦介入 app:// 的请求，升级后还容易吃到上一版的旧 chunk。直接不注册。
  if (window.focusDesktop) return;

  // 开发模式：主动清除残留的 SW 与其缓存。
  // 若之前跑过 build/preview，SW 会常驻浏览器并对 JS 走缓存优先，导致 dev 时
  // 拿到旧的坏 bundle（表现为 "Cannot read properties of null (reading 'useState')"）。
  // 这里在 dev 一进来就注销所有 SW 并清空 Cache Storage，避免手动清缓存。
  if (!import.meta.env.PROD) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn("[sw] 注册失败：", err);
    });
  });
}
