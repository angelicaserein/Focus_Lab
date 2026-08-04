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
  ipcMain.handle("desktop:hello", () => ({ state: lastState }));

  // 主窗口 → 桌宠：状态快照。收到的是「补丁」而不是全量，主进程负责浅合并。
  //
  // 为什么是补丁：主窗口里有两个发布方——常驻的 DesktopHost 发 app 段（任务数、
  // 语言、烧瓶形状），只在 /focus 挂载的 useDesktopFocusSync 发 focus 段（计时）。
  // 各发各的、互不覆盖，Focus 页卸载时发一个 { focus: null } 就干净地退回待机态。
  ipcMain.on("desktop:publish-state", (_e, patch) => {
    lastState = { ...(lastState || {}), ...(patch || {}) };
    // 桌宠还在加载就不必发了：它挂载后会用 desktop:hello 主动取一份最新快照。
    if (petWindow && !petWindow.isDestroyed() && !petWindow.webContents.isLoading()) {
      petWindow.webContents.send("desktop:state", lastState);
    }
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

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) { createMainWindow(); createPetWindow(); }
      else showMainWindow();
    });
  });

  // 托盘常驻，所以关掉所有窗口不等于退出（macOS 本来就是这个语义）。
  app.on("window-all-closed", () => {});

  app.on("before-quit", () => { quitting = true; });
  app.on("will-quit", () => globalShortcut.unregisterAll());
}
