/*
 * Focus Lab Service Worker —— 让应用可离线、可安装为 PWA。
 *
 * 策略概览：
 *   • 导航请求（打开页面）   → 网络优先，断网时回退到缓存的 index.html（HashRouter
 *                              下所有路由都是同一个 index.html，所以离线也能进任意页）。
 *   • 同源静态资源（js/css/  → 缓存优先（cache-first）。Vite 产物文件名带 hash、内容不可变，
 *     图片/字体/.glb 模型）     命中缓存直接用，未命中再走网络并顺手缓存。
 *   • /api/* （AI 对话）      → 永不缓存，纯走网络（每次回复都应实时）。
 *   • 跨域请求               → 直接放行网络，不拦截。
 *
 * 升级：改动需要让旧缓存失效时，把 CACHE_VERSION 加一即可。
 */

const CACHE_VERSION = "focuslab-v10";

// 安装时预缓存的「应用外壳」。带 hash 的 JS/CSS 不在此列——它们文件名每次构建都变，
// 无法静态写死，改由运行时缓存兜底（首次联网访问后即可离线复用）。
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

// ── 安装：预缓存外壳，并立即激活新版本 ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ── 激活：清掉旧版本缓存，并接管当前所有页面 ────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// 把成功的同源响应写入缓存（克隆后再放，response 流只能读一次）。
function putInCache(request, response) {
  if (response && response.ok && response.type === "basic") {
    const copy = response.clone();
    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 只处理 GET；POST（如 /api/chat）等一律放行。
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 跨域资源不拦截，避免破坏 AI SDK / 第三方请求。
  if (url.origin !== self.location.origin) return;

  // AI 接口永不缓存。
  if (url.pathname.startsWith("/api/")) return;

  // 导航请求：网络优先，断网回退到缓存的应用外壳。
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resp) => putInCache(request, resp))
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  // 其余同源静态资源：缓存优先，未命中走网络并缓存。
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((resp) => putInCache(request, resp))
          .catch(() => cached),
    ),
  );
});
