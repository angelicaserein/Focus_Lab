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
 * 升级：改动缓存策略本身（需要整桶作废）时，把 CACHE_VERSION 加一。
 *       日常发版不必动它——activate 时会按本次构建清单清掉不再存在的旧产物，
 *       见下面的 BUILD_MANIFEST / pruneStaleEntries。
 */

const CACHE_VERSION = "focuslab-v13";

// 本次构建产出的全部文件（相对 scope 的路径）。构建时由 vite.config.js 里的
// sw-build-manifest 插件把这行占位符替换成真正的数组；dev 下 public/sw.js 原样
// 送达，值仍是字符串，此时跳过清理（dev 没有 hash 文件名，也不会堆积）。
//
// 存在的意义：产物文件名带 hash，每发一版就是一批新文件名。没有清单就只能靠手动
// bump CACHE_VERSION 才淘汰，否则旧的 bundle 和 .glb 会永远躺在同一个 cache 里，
// 发几版就是几十 MB。有了清单，activate 时把「不在本次构建里的」条目删掉即可，
// 而未变动的 hash 资源仍然命中缓存、不必重新下载。
const BUILD_MANIFEST = "__SW_BUILD_MANIFEST__";

// 安装时预缓存的「应用外壳」。带 hash 的 JS/CSS 不在此列——它们文件名每次构建都变，
// 无法静态写死，改由运行时缓存兜底（首次联网访问后即可离线复用）。
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  // 侧边栏 logo 的猫形遮罩：缺了它离线时品牌区只剩一块纯色底板。
  "./logo-mask.png",
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

// 把清单/外壳里的相对路径统一解析成绝对 pathname，好和缓存里的 Request.url 比对。
function toPathname(p) {
  return new URL(p, self.registration.scope).pathname;
}

// 删掉当前缓存桶里「不属于本次构建」的条目：上一版的 hash chunk、旧模型、旧图片。
async function pruneStaleEntries() {
  if (!Array.isArray(BUILD_MANIFEST)) return; // dev：占位符未被替换，不清理
  const keep = new Set([...BUILD_MANIFEST, ...APP_SHELL].map(toPathname));
  const cache = await caches.open(CACHE_VERSION);
  const requests = await cache.keys();
  await Promise.all(
    requests.map((req) => {
      const { pathname } = new URL(req.url);
      return keep.has(pathname) ? null : cache.delete(req);
    }),
  );
}

// ── 激活：清掉旧版本缓存桶 + 本桶里的过期产物，并接管当前所有页面 ────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => pruneStaleEntries())
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
