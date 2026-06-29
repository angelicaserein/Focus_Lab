// 注册 PWA service worker（仅生产环境）。
//
// 为什么只在生产注册：开发模式下 Vite 以未打包的原始模块提供文件并依赖 HMR 热更新，
// 一旦 SW 介入缓存，热更新会失灵、还容易拿到旧文件。所以本地 `npm run dev` 不注册，
// 只有 `npm run build` 产物（线上 / `npm run preview`）才启用离线与可安装能力。
//
// 路径用 import.meta.env.BASE_URL 兼容 vite.config.js 里的 base: './'。
export default function registerSW() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn("[sw] 注册失败：", err);
    });
  });
}
