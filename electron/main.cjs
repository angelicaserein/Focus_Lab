// Electron 主进程：把 Focus Lab 装成桌面 app，并额外开一个「桌宠」悬浮窗。
//
// 两个窗口的分工：
//   主窗口（main）  —— 完整的 Focus Lab，持有全部业务状态与 localStorage。
//   桌宠窗（pet）   —— 无边框 / 透明 / 置顶的小窗，只画那只烧瓶 + 一个迷你面板。
//                     它自己不存任何数据：状态由主窗口通过 IPC 推过来，
//                     操作（开始 / 暂停 / 记一条）也原样转回主窗口去执行。
//
// 之所以让桌宠「无状态」：主窗口才是 localStorage 的唯一 owner，两个渲染进程
// 各写各的会打架（useLocalStorage 不监听跨窗口 storage 事件）。单向数据流最省心，
// 代价只是主窗口不能真的被销毁——关闭时藏起来而不是 destroy（见 close 拦截）。

const {
  app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut,
  screen, protocol, net, nativeImage, shell,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { AppWatcher, SUPPORTED: WATCH_SUPPORTED } = require("./appWatch.cjs");

const DEV_SERVER = process.env.VITE_DEV_SERVER_URL || "";
const IS_DEV = !!DEV_SERVER;
const DIST = path.join(__dirname, "..", "dist");

// 桌宠窗尺寸：收起时只够放下烧瓶，展开时多出上方的迷你面板。
// 窗口比烧瓶本身大一圈：窗口的空白部分不会挡桌面（渲染层按烧瓶轮廓做穿透，
// 见 PetApp.css 的 .flask-hit），所以宁可留够余量，也别把瓶身挤扁。
const PET_COLLAPSED = { width: 176, height: 176 };
const PET_EXPANDED = { width: 320, height: 460 };

// 自定义协议：生产环境不用 file://。
// file:// 下 localStorage 的 origin 是不透明的，两个窗口不一定共享，
// crypto.randomUUID / Notification 等也可能因「非安全上下文」失效。
// 注册成 standard + secure 的 app:// 后，两个窗口同源、且都是安全上下文。
const SCHEME = "app";
const APP_ORIGIN = `${SCHEME}://focuslab`;

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

let mainWindow = null;
let petWindow = null;
let floodWindow = null;
let tray = null;
let quitting = false;

// 主窗口最后一次推送的状态快照。桌宠窗启动 / 重载后立刻要一份，
// 否则在主窗口下次推送前它是空白的。
let lastState = null;

// 计时类指令：由 /focus 页的 useDesktopFocusSync 接住。
// 而 /focus 是懒加载路由，桌宠点「开始专注」的那一刻它多半还没挂载，
// 直接 send 会丢。所以这类指令额外暂存一份，页面挂载时自己来认领。
// 指令带 id，渲染层按 id 去重，「实时收到 + 挂载后认领」不会执行两次。
const TIMER_COMMANDS = new Set(["start", "toggle-pause", "stop"]);
const PENDING_TTL = 10_000; // 超过这个时间没人来认领就作废，免得手动进专注页时诈尸
let commandSeq = 0;
let pendingCommand = null; // { cmd, ts }

// ── 桌宠窗位置记忆 ────────────────────────────────────────────────
// 存的是「窗口右下角」的屏幕坐标，而不是左上角：展开面板时窗口要变大，
// 面板往左上方长出去，右下角（也就是烧瓶所在的位置）保持不动才不会看起来在乱跳。
const stateFile = () => path.join(app.getPath("userData"), "pet-window.json");

function loadPetAnchor() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    if (Number.isFinite(raw?.x) && Number.isFinite(raw?.y)) return { x: raw.x, y: raw.y };
  } catch {
    /* 首次启动 / 文件损坏：回退到默认位置 */
  }
  return null;
}

function savePetAnchor(anchor) {
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(anchor));
  } catch {
    /* 写不进去不影响使用，下次启动回默认位置即可 */
  }
}

// 把右下角锚点夹取到某块显示器内，避免拔掉外接屏后桌宠留在不存在的坐标上。
function clampAnchor(anchor, size) {
  const display = screen.getDisplayNearestPoint({ x: anchor.x, y: anchor.y });
  const wa = display.workArea;
  return {
    x: Math.min(Math.max(anchor.x, wa.x + size.width), wa.x + wa.width),
    y: Math.min(Math.max(anchor.y, wa.y + size.height), wa.y + wa.height),
  };
}

function defaultPetAnchor() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - 40, y: wa.y + wa.height - 40 };
}

// 当前锚点：优先读窗口实际位置（用户可能刚拖过），没有窗口时读磁盘。
function currentPetAnchor() {
  if (petWindow && !petWindow.isDestroyed()) {
    const b = petWindow.getBounds();
    return { x: b.x + b.width, y: b.y + b.height };
  }
  return loadPetAnchor() ?? defaultPetAnchor();
}

// ── 协议处理 ────────────────────────────────────────────────────
// app://focuslab/<相对路径> → dist/<相对路径>。
// 目录穿越（../）在这里被 normalize + 前缀校验挡掉。
function registerAppProtocol() {
  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
    const target = path.normalize(path.join(DIST, rel));
    // 带上分隔符再比前缀：只写 startsWith(DIST) 的话，隔壁的 dist-old/ 也能过。
    if (target !== DIST && !target.startsWith(DIST + path.sep)) {
      return new Response("Forbidden", { status: 403 });
    }
    return net.fetch(pathToFileURL(target).toString());
  });
}

// ── 窗口 ────────────────────────────────────────────────────────
function preloadPath() {
  return path.join(__dirname, "preload.cjs");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#1a1620",
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: ["--focuslab-role=main"],
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(IS_DEV ? DEV_SERVER : `${APP_ORIGIN}/index.html`);

  // 关闭 ≠ 退出：主窗口是全部业务状态和 localStorage 的 owner，
  // 真销毁了桌宠就没数据来源、计时也会丢。点 X 只是藏起来，退出走托盘菜单。
  mainWindow.on("close", (e) => {
    if (quitting) return;
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => { mainWindow = null; });

  // 外链走系统浏览器，别在 app 里开一个没有导航栏的窗口。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

function createPetWindow() {
  const size = PET_COLLAPSED;
  const anchor = clampAnchor(loadPetAnchor() ?? defaultPetAnchor(), size);

  petWindow = new BrowserWindow({
    ...size,
    x: anchor.x - size.width,
    y: anchor.y - size.height,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: ["--focuslab-role=pet"],
    },
  });

  // "screen-saver" 这一层比普通置顶更高，全屏播视频 / 演示时桌宠也还在。
  petWindow.setAlwaysOnTop(true, "screen-saver");
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  petWindow.once("ready-to-show", () => petWindow.show());
  petWindow.loadURL(IS_DEV ? `${DEV_SERVER}pet.html` : `${APP_ORIGIN}/pet.html`);

  // 拖动结束后记住位置。app-region 拖动不触发 moved，用 move 节流写盘。
  let saveTimer = null;
  petWindow.on("move", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => savePetAnchor(currentPetAnchor()), 400);
  });

  petWindow.on("closed", () => { petWindow = null; });
}

// 展开 / 收起迷你面板：改窗口大小但钉住右下角。
function setPetExpanded(expanded) {
  if (!petWindow || petWindow.isDestroyed()) return;
  const size = expanded ? PET_EXPANDED : PET_COLLAPSED;
  const anchor = clampAnchor(currentPetAnchor(), size);
  petWindow.setBounds({
    x: Math.round(anchor.x - size.width),
    y: Math.round(anchor.y - size.height),
    width: size.width,
    height: size.height,
  });
}

// 往主窗口发消息。窗口可能是刚刚才 createMainWindow() 出来的，
// 这时页面还没加载完，直接 send 会掉进虚空——等 did-finish-load 再发。
function sendToMain(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const wc = mainWindow.webContents;
  if (wc.isLoading()) wc.once("did-finish-load", () => wc.send(channel, payload));
  else wc.send(channel, payload);
}

function sendToPet(channel, payload) {
  if (!petWindow || petWindow.isDestroyed()) return;
  const wc = petWindow.webContents;
  if (wc.isLoading()) wc.once("did-finish-load", () => wc.send(channel, payload));
  else wc.send(channel, payload);
}

function showMainWindow(hash) {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (hash) sendToMain("desktop:navigate", hash);
}

function togglePetWindow() {
  if (!petWindow || petWindow.isDestroyed()) { createPetWindow(); return; }
  if (petWindow.isVisible()) petWindow.hide();
  else petWindow.show();
}

// ── 分心水位 ────────────────────────────────────────────────────
// 专注进行中，如果前台程序不在用户勾的白名单里，桌宠的烧瓶就翻过来往外倒水，
// 倒出去的水积在屏幕底部。回到白名单立刻退潮，水回到瓶子里。
//
// 三条刻意的设计约束（都是用户拍板的）：
//   1. 不扣真实专注进度。水位只是一面镜子，seconds 一秒都不会少。
//      所以这里算出来的 level 只喂给「显示」，不参与任何结算。
//   2. 回到白名单立刻退潮，而且退得比涨得快得多——回头的动作要马上被奖励。
//   3. 不设宽限期。切走就开始倒。之所以敢这么严，正是因为 1 和 2：
//      代价可逆、又不真的扣分，严格才不至于变成惩罚。
//
// 只在「功能开着 + 勾了至少一个白名单 + 正在跑的专注会话」三者同时成立时工作，
// 其余时间连探测子进程都不起。

const FLOOD_TICK_MS = 200;
const FLOOD_RISE_SECS = 480; // 持续分心多久积满一屏（到设定的最大水位）
const FLOOD_DRAIN_SECS = 45; // 回到白名单后从满退到空要多久
const FLOOD_MAX_RATIO = 0.5; // 积水窗只占屏幕下半：全屏透明窗常驻画波浪太费 GPU
const RECENT_APP_LIMIT = 24;

// Focus Lab 自己永远不算分心：点桌宠、回主窗口看任务都不该触发倒水。
// dev 下前台进程是 electron，打包后是 Focus Lab.exe。
const SELF_PROC = path.basename(process.execPath, ".exe").toLowerCase();

// 这些是系统外壳，不是「用户在用的程序」。锁屏、开始菜单、输入法候选框
// 一闪而过就翻瓶子会非常吵，遇到它们一律维持原判。
const NEUTRAL_PROCS = new Set([
  "lockapp", "logonui", "searchhost", "searchapp", "shellexperiencehost",
  "startmenuexperiencehost", "textinputhost", "applicationframehost", "dwm",
]);

let watchCfg = { enabled: false, allow: [] };
let watcher = null;
let currentApp = null;
let distracted = false;
let floodLevel = 0;
let floodTimer = null;
let lastFloodTick = 0;
let lastPushedFlood = -1;
let lastPushedSpill = "";
const recentApps = new Map(); // name → { name, label, seenAt }
let recentKey = "";

function watchGateOpen() {
  return !!(
    WATCH_SUPPORTED
    && watchCfg.enabled
    && watchCfg.allow.length > 0
    && lastState?.focus?.isRunning
  );
}

// 返回 true=分心 / false=专心 / null=维持原判（系统外壳之类）
function judgeApp(a) {
  if (!a?.name) return null;
  if (a.name === SELF_PROC) return false;
  if (NEUTRAL_PROCS.has(a.name)) return null;
  // 标题为空的 explorer 是桌面本身或任务栏，点一下任务栏切窗口会短暂经过这里
  if (a.name === "explorer" && !a.title) return null;
  return !watchCfg.allow.includes(a.name);
}

function createFloodWindow() {
  const { bounds } = screen.getPrimaryDisplay();
  const height = Math.round(bounds.height * FLOOD_MAX_RATIO);

  floodWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y + bounds.height - height,
    width: bounds.width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false, // 绝不能抢焦点：它盖在别人正在用的窗口上面
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    backgroundColor: "#00000000",
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      // 这个窗口的全部意义就是「用户在别的程序里的时候还在动」，
      // 默认的后台节流会把水面的 rAF 掐到几乎不动。
      backgroundThrottling: false,
      additionalArguments: ["--focuslab-role=flood"],
    },
  });

  // 比普通置顶高，但低于桌宠用的 screen-saver 层——水要在瓶子后面。
  floodWindow.setAlwaysOnTop(true, "pop-up-menu");
  floodWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 永久穿透，而且不 forward：这个窗口从头到尾不需要知道鼠标在哪，
  // 它唯一的职责是画一层看得见、碰不到的水。
  floodWindow.setIgnoreMouseEvents(true);
  floodWindow.loadURL(IS_DEV ? `${DEV_SERVER}flood.html` : `${APP_ORIGIN}/flood.html`);
  floodWindow.on("closed", () => { floodWindow = null; });
}

function sendToFlood(channel, payload) {
  if (!floodWindow || floodWindow.isDestroyed()) return;
  const wc = floodWindow.webContents;
  if (wc.isLoading()) wc.once("did-finish-load", () => wc.send(channel, payload));
  else wc.send(channel, payload);
}

// 水位推给两个窗口：积水窗画水，桌宠按同一个值把瓶子倒空——
// 瓶里少掉的正好是屏幕上多出来的，两边是同一摊水。
function pushFlood() {
  // 翻瓶子这一下必须立刻推，不能被「水位没怎么变」的阈值挡住
  const key = `${distracted}`;
  if (key === lastPushedSpill && lastPushedFlood >= 0
      && Math.abs(floodLevel - lastPushedFlood) < 0.004) return;
  lastPushedSpill = key;
  lastPushedFlood = floodLevel;
  lastState = { ...(lastState || {}), watch: { level: floodLevel, spilling: distracted } };
  sendToPet("desktop:state", lastState);
  sendToFlood("flood:level", { level: floodLevel, rising: distracted });
}

function floodTick() {
  const now = Date.now();
  const dt = Math.min((now - lastFloodTick) / 1000, 1); // 睡眠唤醒后别一口气灌满
  lastFloodTick = now;

  const before = floodLevel;
  if (distracted) floodLevel = Math.min(1, floodLevel + dt / FLOOD_RISE_SECS);
  else floodLevel = Math.max(0, floodLevel - dt / FLOOD_DRAIN_SECS);

  if (floodLevel > 0 && !floodWindow) createFloodWindow();
  if (floodLevel > 0 && floodWindow && !floodWindow.isVisible()) {
    floodWindow.showInactive(); // show() 会抢焦点，把用户从正在打字的窗口里踢出去
  }
  if (floodLevel > 0 || before > 0) pushFlood();

  // 退干净了就把窗口藏起来、停掉计时：桌面上不该留一个空转的透明窗
  if (floodLevel === 0 && !distracted) {
    if (floodWindow && !floodWindow.isDestroyed()) floodWindow.hide();
    stopFloodTimer();
  }
}

function startFloodTimer() {
  if (floodTimer) return;
  lastFloodTick = Date.now();
  floodTimer = setInterval(floodTick, FLOOD_TICK_MS);
}

function stopFloodTimer() {
  clearInterval(floodTimer);
  floodTimer = null;
}

function setDistracted(next) {
  if (distracted === next) return;
  distracted = next;
  startFloodTimer();
}

// 白名单 / 专注状态 / 前台程序，任何一个变了都重新过一遍这里。
function reevaluateWatch() {
  const open = watchGateOpen();

  if (open && !watcher) {
    watcher = new AppWatcher(app.getPath("userData"));
    watcher.on("app", (a) => {
      currentApp = a;
      rememberApp(a);
      const verdict = judgeApp(a);
      if (verdict !== null) setDistracted(verdict);
    });
    watcher.on("unavailable", () => { watchCfg = { ...watchCfg, enabled: false }; reevaluateWatch(); });
  }

  if (open) {
    watcher.start();
    // 白名单刚改过的话，当前这个前台程序的判定可能已经不一样了
    const verdict = judgeApp(currentApp);
    if (verdict !== null) setDistracted(verdict);
  } else if (watcher) {
    watcher.stop();
    currentApp = null;
    setDistracted(false);
    startFloodTimer(); // 让已经积起来的水正常退潮，退完计时器自己会停
  }
}

// 设置页要给用户勾的那张表。让探测器自己攒，用户就不用去猜「Word 的进程名叫什么」。
function rememberApp(a) {
  if (!a.name || a.name === SELF_PROC || NEUTRAL_PROCS.has(a.name)) return;
  recentApps.set(a.name, { name: a.name, label: a.label, seenAt: Date.now() });
  if (recentApps.size > RECENT_APP_LIMIT) {
    const oldest = [...recentApps.values()].sort((x, y) => x.seenAt - y.seenAt)[0];
    recentApps.delete(oldest.name);
  }
  // 判重按名字排序，不看先后：来回切两个已知程序不该反复刷设置页那张表。
  // 推过去的仍然按最近使用排序，新面孔出现时顺序自然会跟着更新一次。
  const key = [...recentApps.keys()].sort().join("|");
  if (key === recentKey) return;
  recentKey = key;
  sendToMain("desktop:apps-seen", [...recentApps.values()].sort((x, y) => y.seenAt - x.seenAt));
}

// ── 托盘 ────────────────────────────────────────────────────────
function trayIcon() {
  // 打包后 icon 在 dist/ 里（public/ 的内容会原样拷过去）；dev 时读 public/。
  const file = IS_DEV
    ? path.join(__dirname, "..", "public", "icon-192.png")
    : path.join(DIST, "icon-192.png");
  const img = nativeImage.createFromPath(file);
  return img.isEmpty() ? img : img.resize({ width: 16, height: 16 });
}

function buildTrayMenu() {
  const petVisible = !!petWindow && !petWindow.isDestroyed() && petWindow.isVisible();
  return Menu.buildFromTemplate([
    { label: "打开 Focus Lab", click: () => showMainWindow() },
    { label: "开始专注", click: () => showMainWindow("#/focus") },
    { type: "separator" },
    { label: "显示桌宠", type: "checkbox", checked: petVisible, click: togglePetWindow },
    {
      label: "开机自启",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, args: ["--hidden"] });
      },
    },
    { type: "separator" },
    { label: "退出", click: () => { quitting = true; app.quit(); } },
  ]);
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Focus Lab");
  // 菜单每次弹出时重建：里面的两个 checkbox 状态是活的。
  tray.on("right-click", () => tray.popUpContextMenu(buildTrayMenu()));
  tray.on("click", () => showMainWindow());
}

// ── IPC ─────────────────────────────────────────────────────────
function registerIpc() {
  // 渲染进程启动时握手，顺便把当前快照带回去（桌宠窗重载后不至于空白）。
  ipcMain.handle("desktop:hello", () => ({
    state: lastState,
    // 设置页要用「最近见过的应用」渲染白名单，重载后不该等到下次切窗口才有内容
    apps: [...recentApps.values()].sort((x, y) => y.seenAt - x.seenAt),
    watchSupported: WATCH_SUPPORTED,
  }));

  // 主窗口 → 桌宠：状态快照。收到的是「补丁」而不是全量，主进程负责浅合并。
  //
  // 为什么是补丁：主窗口里有两个发布方——常驻的 DesktopHost 发 app 段（任务数、
  // 语言、烧瓶形状），只在 /focus 挂载的 useDesktopFocusSync 发 focus 段（计时）。
  // 各发各的、互不覆盖，Focus 页卸载时发一个 { focus: null } 就干净地退回待机态。
  ipcMain.on("desktop:publish-state", (_e, patch) => {
    const wasRunning = !!lastState?.focus?.isRunning;
    lastState = { ...(lastState || {}), ...(patch || {}) };
    // 桌宠还在加载就不必发了：它挂载后会用 desktop:hello 主动取一份最新快照。
    if (petWindow && !petWindow.isDestroyed() && !petWindow.webContents.isLoading()) {
      petWindow.webContents.send("desktop:state", lastState);
    }
    // 分心探测只在专注跑起来的时候工作，所以「开始/暂停/结束」都要重新过一遍闸门
    if (wasRunning !== !!lastState?.focus?.isRunning) reevaluateWatch();
  });

  // 设置页改了白名单 / 开关。真值存在主窗口的 localStorage 里（跟其他偏好一致），
  // 主进程只拿一份用来判定，不落盘——专注必然要主窗口在，冷启动没有先于它的时刻。
  ipcMain.on("desktop:watch-config", (_e, cfg) => {
    watchCfg = {
      enabled: !!cfg?.enabled,
      allow: Array.isArray(cfg?.allow) ? cfg.allow.map((s) => String(s).toLowerCase()) : [],
    };
    reevaluateWatch();
  });

  // 桌宠 → 主窗口：操作指令。部分指令主进程自己也要顺手做点事（比如唤起主窗口）。
  ipcMain.on("desktop:command", (_e, raw) => {
    if (raw?.type === "open-main") { showMainWindow(raw.hash); return; }
    const cmd = { ...raw, id: `cmd-${++commandSeq}` };
    // 「开始专注」必须先把主窗口切到 /focus：计时状态活在 Focus 页面组件里，
    // 页面没挂载就没人接这条指令（详见 useDesktopFocusSync 的注释）。
    if (cmd.type === "start") showMainWindow("#/focus");
    if (TIMER_COMMANDS.has(cmd.type)) pendingCommand = { cmd, ts: Date.now() };
    sendToMain("desktop:command", cmd);
  });

  // Focus 页挂载时来认领一条「刚发出但当时没人接」的计时指令。
  // 认领即出队；过期的直接丢弃。
  ipcMain.handle("desktop:claim-command", () => {
    const p = pendingCommand;
    pendingCommand = null;
    if (!p || Date.now() - p.ts > PENDING_TTL) return null;
    return p.cmd;
  });

  ipcMain.on("desktop:pet-expanded", (_e, expanded) => setPetExpanded(!!expanded));

  // 鼠标穿透：桌宠窗是个矩形，但烧瓶只占其中一小块。
  // 渲染层持续判断光标是否落在烧瓶 / 面板上，落在外面就让整个窗口对鼠标透明，
  // 这样点桌面图标不会被这块看不见的矩形挡住。
  // forward:true 让穿透状态下仍能收到 mousemove，否则一旦穿透就再也回不来。
  ipcMain.on("desktop:pet-ignore-mouse", (_e, ignore) => {
    if (!petWindow || petWindow.isDestroyed()) return;
    petWindow.setIgnoreMouseEvents(!!ignore, { forward: true });
  });

  // 自己实现拖动，而不是用 CSS 的 -webkit-app-region: drag。
  // 后者会把鼠标事件整个交给系统，渲染层收不到 click，「拖动」和「点开面板」
  // 就没法用同一块区域。改成：渲染层报告光标的屏幕坐标，这里换算成窗口位置；
  // 按下到抬起之间位移够小，渲染层自己判定成一次点击。
  let dragGrab = null;
  ipcMain.on("desktop:pet-drag-start", (_e, pt) => {
    if (!petWindow || petWindow.isDestroyed()) return;
    const b = petWindow.getBounds();
    dragGrab = { dx: pt.x - b.x, dy: pt.y - b.y };
  });
  ipcMain.on("desktop:pet-drag-move", (_e, pt) => {
    if (!dragGrab || !petWindow || petWindow.isDestroyed()) return;
    petWindow.setPosition(Math.round(pt.x - dragGrab.dx), Math.round(pt.y - dragGrab.dy));
  });
  ipcMain.on("desktop:pet-drag-end", () => {
    dragGrab = null;
    savePetAnchor(currentPetAnchor());
  });

  ipcMain.on("desktop:pet-hide", () => {
    if (petWindow && !petWindow.isDestroyed()) petWindow.hide();
  });
}

// ── 启动 ────────────────────────────────────────────────────────
// 单实例：第二次启动只是把已有窗口唤到前面。
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showMainWindow());

  app.whenReady().then(() => {
    if (!IS_DEV) registerAppProtocol();
    registerIpc();
    createMainWindow();
    createPetWindow();
    createTray();

    // 全局快捷键：无论在哪个 app 里，一键把桌宠叫出来并展开到「记一条」。
    // 注册失败（被别的软件占了）不致命，静默跳过。
    globalShortcut.register("CommandOrControl+Shift+Space", () => {
      if (!petWindow || petWindow.isDestroyed()) createPetWindow();
      petWindow.show();
      petWindow.focus();
      sendToPet("desktop:pet-quick-capture");
    });

    // 积水窗是按主显示器的尺寸一次性摆好的。分辨率变了 / 拔了外接屏之后
    // 那份 bounds 就不对了，直接销毁，下次要用时按新尺寸重建。
    const rebuildFlood = () => {
      if (!floodWindow || floodWindow.isDestroyed()) return;
      floodWindow.destroy();
      floodWindow = null;
      lastPushedFlood = -1; // 新窗口是空白的，得重推一次水位
    };
    screen.on("display-metrics-changed", rebuildFlood);
    screen.on("display-added", rebuildFlood);
    screen.on("display-removed", rebuildFlood);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) { createMainWindow(); createPetWindow(); }
      else showMainWindow();
    });
  });

  // 托盘常驻，所以关掉所有窗口不等于退出（macOS 本来就是这个语义）。
  app.on("window-all-closed", () => {});

  app.on("before-quit", () => { quitting = true; });
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
    // 探测子进程是我们 spawn 出来的，不收拾它会在退出后继续留在任务管理器里
    stopFloodTimer();
    watcher?.stop();
  });
}
