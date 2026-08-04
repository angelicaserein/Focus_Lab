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

// 桌宠窗尺寸：固定，一直按「展开后」的大小开着，收起时上半截只是空的。
// 曾经是收起 176 / 展开 460 两档，点一下改窗口大小——但透明无边框窗在 Windows 上
// 每次 setBounds 都会把新露出来的那块先刷一帧再合成，看起来就是「闪一下才出现」。
// 窗口的空白部分本来就不挡桌面（渲染层按烧瓶轮廓做穿透，见 PetApp.css 的 .flask-hit），
// 所以干脆不再改尺寸：面板挂上去就是画出来，没有中间那一帧。
const PET_SIZE = { width: 320, height: 460 };
// 窗口右下角那一块才是烧瓶（上半截是收起时空着的面板位）。位置校正只看这一块，
// 不然「整扇窗都得在屏幕里」会把贴着屏幕上沿摆的桌宠往下推小半个屏。
const PET_ANCHOR_BOX = 176;

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
// 只保证烧瓶那一块在屏幕里，窗口空白的上半截露出屏幕外无所谓。
function clampAnchor(anchor) {
  const display = screen.getDisplayNearestPoint({ x: anchor.x, y: anchor.y });
  const wa = display.workArea;
  return {
    x: Math.min(Math.max(anchor.x, wa.x + PET_ANCHOR_BOX), wa.x + wa.width),
    y: Math.min(Math.max(anchor.y, wa.y + PET_ANCHOR_BOX), wa.y + wa.height),
  };
}

function defaultPetAnchor() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - 40, y: wa.y + wa.height - 40 };
}

// 渲染层传来的坐标先过这一道。setPosition / setBounds 的原生签名是 int32：
// 给它小数（缩放不是 100% 时 screenX 就会带小数）或 NaN，会直接抛
// 「Error processing argument at index 0」——那是主进程的未捕获异常，整个 app 弹框死掉。
// 而且拖动的偏移量是在 drag-start 那一发算好、存到 drag-end 的：坏值放进去一次，
// 之后每一次 drag-move 都必崩，中间没有能自愈的地方。所以在进程边界就拦掉。
function intPoint(pt) {
  if (!Number.isFinite(pt?.x) || !Number.isFinite(pt?.y)) return null;
  return { x: Math.round(pt.x), y: Math.round(pt.y) };
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
  const size = PET_SIZE;
  const anchor = clampAnchor(loadPetAnchor() ?? defaultPetAnchor());

  petWindow = new BrowserWindow({
    ...size,
    x: Math.round(anchor.x - size.width),
    y: Math.round(anchor.y - size.height),
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
// 翻瓶子不只是画面：它和用户自己按「我分心了」是同一件事。切走的那一刻主进程会
// 通知主窗口把计时器按下暂停（在别的软件里的时间不该算进专注），回来时再把这一段
// 「几点到几点、用的哪个程序」发回去写成一条分心记录。见下面的 applyVerdict。
//
// 三条刻意的设计约束（都是用户拍板的）：
//   1. 不扣真实专注进度。水位只是一面镜子，已经跑过的 seconds 一秒都不会少
//      （暂停只是不再往前走，不回退）。所以这里算出来的 level 只喂给「显示」。
//   2. 回到白名单立刻退潮，而且退得比涨得快得多——回头的动作要马上被奖励。
//   3. 不设宽限期。切走就开始倒。之所以敢这么严，正是因为 1 和 2：
//      代价可逆、又不真的扣分，严格才不至于变成惩罚。
//
// 只在「功能开着 + 正在跑的专注会话」同时成立时工作，其余时间连探测子进程都不起。
// 白名单还空着的时候照样采集（设置页那张表就是这么攒出来的），但一律不判分心。

const FLOOD_TICK_MS = 200;
const FLOOD_RISE_SECS = 240; // 持续分心多久积满一屏（到设定的最大水位）
const FLOOD_DRAIN_SECS = 45; // 回到白名单后从满退到空要多久
const FLOOD_MAX_RATIO = 0.5; // 积水窗只占屏幕下半：全屏透明窗常驻画波浪太费 GPU
// 水退到 0 之后再等一会儿才藏窗口：渲染层自己还有一道缓动在收尾，
// 主进程一到 0 就 hide() 的话，最后那点水是「啪」地消失而不是退干净的。
const FLOOD_HIDE_DELAY_MS = 900;
const RECENT_APP_LIMIT = 24;
// 短于这个的「路过」不写进分心记录（计时器照旧暂停，只是不留一条几秒钟的账）。
// 切窗口时经过别的程序、点一下通知就回来，这种噪音记下来只会让明细页没法看。
const AWAY_MIN_SECS = 5;

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
let emptySince = 0; // 水位归零的时刻，用来延后 hide（见 floodTick）
const recentApps = new Map(); // name → { name, label, seenAt }
let recentKey = "";

// 「切走」这一段：away 表示此刻人在白名单外的程序里，awayApp/awaySince 是
// 当前这一段用的哪个程序、从几点开始。切换到另一个程序时把上一段结账、开新的一段，
// 这样明细页看到的就是「10:03–10:07 Chrome、10:07–10:12 微信」而不是糊成一坨。
let away = false;
let awayApp = null;
let awaySince = 0;

// 探测器只要「功能开着 + 有一次没结束的专注」就工作，不看白名单勾没勾。
// 不能把 allow.length > 0 也算进闸门：设置页那张表是探测器自己攒出来的，
// 空名单时不起探测器，名单就永远攒不出来，功能从第一次起就是死的。
// 所以空名单只影响判定（见 judgeApp），不影响采集。
function watchGateOpen() {
  if (!WATCH_SUPPORTED || !watchCfg.enabled) return false;
  const f = lastState?.focus;
  if (!f) return false;
  // 正在跑当然要探测；已经因为切走而被我们自动暂停的会话也必须继续探测——
  // 否则「暂停 → 闸门关 → 再也收不到回来的那一下」，计时器就永远醒不过来了。
  return !!f.isRunning || away;
}

// 返回 true=分心 / false=专心 / null=维持原判（系统外壳之类）
function judgeApp(a) {
  if (!a?.name) return null;
  // 一个都没勾的时候只采集不判定：此时「什么都算分心」会让水一直涨，
  // 而用户还没机会告诉我们什么才算专注。
  if (watchCfg.allow.length === 0) return false;
  if (a.name === SELF_PROC) return false;
  if (NEUTRAL_PROCS.has(a.name)) return null;
  // 标题为空的 explorer 是桌面本身或任务栏，点一下任务栏切窗口会短暂经过这里
  if (a.name === "explorer" && !a.title) return null;
  return !watchCfg.allow.includes(a.name);
}

function createFloodWindow() {
  // 用 workArea 而不是 bounds：bounds 含任务栏那一条，水从屏幕最底下开始积，
  // 前几十像素全被任务栏挡着——而任务栏是系统级 topmost，抢不过它。
  // 贴着工作区底边积，第一滴水就在任务栏上方，立刻看得见。
  const { workArea } = screen.getPrimaryDisplay();
  const height = Math.round(workArea.height * FLOOD_MAX_RATIO);

  floodWindow = new BrowserWindow({
    x: workArea.x,
    y: workArea.y + workArea.height - height,
    width: workArea.width,
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
  // 这个窗口没有任何肉眼可见的「加载中」状态：加载失败的表现就是屏幕上什么都不发生，
  // 跟「功能没触发」长得一模一样。留一句日志，免得下次又要从头猜。
  floodWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[flood] 加载失败 ${code} ${desc} ${url}`);
  });
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

  // 退干净了就把窗口藏起来、停掉计时：桌面上不该留一个空转的透明窗。
  // 但要多等一会儿——渲染层还有一道缓动在把最后那点水收干净。
  if (floodLevel === 0 && !distracted) {
    if (before > 0) emptySince = now; // 刚归零，开始计时
    if (now - emptySince >= FLOOD_HIDE_DELAY_MS) {
      if (floodWindow && !floodWindow.isDestroyed()) floodWindow.hide();
      stopFloodTimer();
    }
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

// 给当前这一段结账，够长就发一条记录给主窗口。
function flushAwaySegment(endTs) {
  const seg = awayApp;
  const startTs = awaySince;
  awayApp = null;
  awaySince = 0;
  if (!seg || !startTs) return;
  const durationSecs = Math.round((endTs - startTs) / 1000);
  if (durationSecs < AWAY_MIN_SECS) return;
  sendToMain("desktop:distraction", {
    type: "segment",
    name: seg.name,
    label: seg.label,
    startTs,
    endTs,
    durationSecs,
  });
}

// 判定结果落到「水位 + 计时器 + 记账」三件事上。
// enter / leave 只发状态翻转的那一下（渲染层据此暂停 / 恢复计时），
// segment 则是一段用完的账；切走期间换程序只结账、不重复发 enter。
function applyVerdict(a, isAway) {
  const now = Date.now();
  if (isAway) {
    if (!away) {
      away = true;
      sendToMain("desktop:distraction", { type: "enter", ts: now });
    } else if (awayApp && a?.name !== awayApp.name) {
      flushAwaySegment(now);
    }
    if (!awayApp && a?.name) { awayApp = { name: a.name, label: a.label }; awaySince = now; }
  } else if (away) {
    flushAwaySegment(now);
    away = false;
    sendToMain("desktop:distraction", { type: "leave", ts: now });
  }
  setDistracted(isAway);
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
      if (verdict !== null) applyVerdict(a, verdict);
    });
    watcher.on("unavailable", () => { watchCfg = { ...watchCfg, enabled: false }; reevaluateWatch(); });
  }

  if (open) {
    watcher.start();
    // 白名单刚改过的话，当前这个前台程序的判定可能已经不一样了
    const verdict = judgeApp(currentApp);
    if (verdict !== null) applyVerdict(currentApp, verdict);
  } else if (watcher) {
    watcher.stop();
    currentApp = null;
    // 会话在切走期间结束了：这一段照样要结账、也要告诉主窗口别再等着恢复计时。
    applyVerdict(null, false);
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
    const wasOpen = watchGateOpen();
    lastState = { ...(lastState || {}), ...(patch || {}) };
    // 桌宠还在加载就不必发了：它挂载后会用 desktop:hello 主动取一份最新快照。
    if (petWindow && !petWindow.isDestroyed() && !petWindow.webContents.isLoading()) {
      petWindow.webContents.send("desktop:state", lastState);
    }
    // 分心探测只在专注跑起来的时候工作，所以「开始/暂停/结束/离开专注页」
    // 都要重新过一遍闸门。比的是闸门本身而不是 isRunning：被我们自动暂停的
    // 会话 isRunning 是 false，但闸门要继续开着（见 watchGateOpen）。
    if (wasOpen !== watchGateOpen()) reevaluateWatch();
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
    const p = intPoint(pt);
    if (!p) return;
    const b = petWindow.getBounds();
    dragGrab = { dx: p.x - b.x, dy: p.y - b.y };
  });
  ipcMain.on("desktop:pet-drag-move", (_e, pt) => {
    if (!dragGrab || !petWindow || petWindow.isDestroyed()) return;
    const p = intPoint(pt);
    if (!p) return;
    petWindow.setPosition(p.x - dragGrab.dx, p.y - dragGrab.dy);
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
