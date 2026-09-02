// Focus Lab 桌面版的 REPL 驱动：从 stdin 读命令，驱动真的 Electron。
//
// 为什么是 REPL 而不是一次性脚本：启动一次要十几秒，而验证桌宠往往要连着试
// 好几步（展开 → 打字 → 失焦 → 截图）。REPL 让你一次启动、反复戳。
// 写死的一次性脚本每改一个断言就要重启一次 app。
//
// 用法（管道跑一串，跑完自己退出）：
//   node .claude/skills/run-desktop/driver.mjs <<'EOF'
//   launch
//   publish {"focus":{"seconds":754,"isRunning":true,"targetMins":25}}
//   expand
//   ss panel
//   EOF
//
// 也可以直接交互式跑：node .claude/skills/run-desktop/driver.mjs

import * as path from "node:path";
import * as fs from "node:fs";
import * as readline from "node:readline";
import { pathToFileURL } from "node:url";

const APP_DIR = path.resolve(import.meta.dirname, "../../..");
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(APP_DIR, ".tmp/shots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

// 这个脚本在 .claude/ 里，裸 import 解析不到项目的 node_modules，走绝对 file URL。
const { _electron: electron } = await import(
  pathToFileURL(path.join(APP_DIR, "node_modules/playwright-core/index.mjs")).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let app = null;
let main = null; // 主窗口
let pet = null; // 桌宠窗
let page = null; // 当前操作的那个（默认桌宠）

async function findWindow(match, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const w = app.windows().find((x) => x.url().includes(match));
    if (w) return w;
    await sleep(200);
  }
  return null;
}

const COMMANDS = {
  // 生产形态启动（读 dist/，走 app:// 协议）。改了 src 要先 `npx vite build`。
  // dev 形态请用 `npm run desktop:dev`，那条路要先起 vite，不归这个驱动管。
  async launch() {
    if (app) return console.log("already launched");
    const env = { ...process.env };
    // Electron 系的终端（VS Code 内置终端、Claude Code）会带着这个变量，
    // 它让 electron 二进制退化成纯 node 跑，主进程一上来就 TypeError。
    delete env.ELECTRON_RUN_AS_NODE;
    // 默认用真实的 userData（读得到你平时的数据）。设了 FL_USER_DATA_DIR 就换一份
    // 干净的：测试数据不会混进真实存档，也不跟已经开着的 Focus Lab 抢单实例锁。
    const isolated = process.env.FL_USER_DATA_DIR;
    app = await electron.launch({
      executablePath: path.join(APP_DIR, "node_modules/electron/dist/electron.exe"),
      args: isolated ? [APP_DIR, `--user-data-dir=${isolated}`] : [APP_DIR],
      cwd: APP_DIR,
      env,
      timeout: 60_000,
    });
    main = await findWindow("index.html");
    pet = await findWindow("pet.html");
    page = pet ?? main;
    if (pet) await pet.waitForSelector(".pet-flask", { timeout: 20_000 });
    console.log("launched:", app.windows().map((w) => w.url()).join(" | "));
  },

  // 当前操作对象在两个窗口之间切
  async pet() { page = pet; console.log("target = pet"); },
  async main() { page = main; console.log("target = main"); },

  async windows() {
    for (const w of app.windows()) console.log(" ", w.url());
  },

  // 往主进程发一份状态补丁，桌宠据此渲染。走的是主窗口真实的 publishState，
  // 所以 pushPetState / 托盘 tooltip 这些副作用都会一并跑到。
  // 例：publish {"app":{"scenarioTitle":"写论文","pendingCount":3},"focus":{"seconds":754,"isRunning":true,"targetMins":25,"timerMode":"countup"}}
  async publish(json) {
    await main.evaluate((p) => window.focusDesktop.publishState(p), JSON.parse(json));
    await sleep(400);
    console.log("published");
  },

  // 点开桌宠面板。必须点在 .flask-hit 的轮廓上：窗口里除了它一切都是
  // pointer-events:none，点 .pet-flask 的几何中心多半落在空处，什么都不会发生。
  async expand() {
    const b = await pet.evaluate(() => {
      const r = document.querySelector(".flask-hit")?.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height * 0.8 } : null;
    });
    if (!b) return console.log("ERROR: 找不到 .flask-hit");
    await pet.mouse.move(b.x, b.y);
    await pet.mouse.down();
    await pet.mouse.up();
    await sleep(400);
    console.log("panel:", await pet.evaluate(() => !!document.querySelector(".pet-panel")));
  },

  // 让某个窗口拿到焦点：桌宠的「失焦自动收起」只能这么触发
  async focus(which) {
    await app.evaluate(({ BrowserWindow }, w) => {
      const target = w === "main" ? "index.html" : "pet.html";
      BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes(target))?.focus();
    }, which || "main");
    await sleep(500);
    console.log("focused:", which || "main");
  },

  async 'hide-pet'() {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes("pet.html"))?.hide();
    });
    await sleep(300);
    console.log("pet hidden");
  },

  async 'show-pet'() {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes("pet.html"))?.show();
    });
    await sleep(600);
    console.log("pet shown");
  },

  // 分心水位的白名单配置。必须走这条真实的 IPC，不能去种 localStorage：
  // 那个 key 的默认值是 null，app 一挂载就把你种的值原样写回成 null 冲掉了。
  // 参数是 allow 里的进程名，逗号分隔；空着＝白名单为空（只采集、不判分心）。
  async watch(arg) {
    const allow = (arg || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    await main.evaluate((a) =>
      window.focusDesktop.setWatchConfig({ enabled: true, allow: a, deny: [] }), allow);
    await sleep(1200);
    console.log("watch allow =", JSON.stringify(allow));
  },

  // 此刻真正在最前面的是哪个进程（探测器看的就是这个值）
  async foreground() {
    const { spawnSync } = await import("node:child_process");
    const out = spawnSync("powershell.exe", ["-NoProfile", "-Command",
      `Add-Type -Name W -Namespace F -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);'
       $h = [F.W]::GetForegroundWindow(); $procId = [uint32]0; [void][F.W]::GetWindowThreadProcessId($h, [ref]$procId)
       (Get-Process -Id $procId).ProcessName`], { encoding: "utf8" });
    console.log("foreground:", (out.stdout || "").trim());
  },

  // 全局快捷键 Ctrl+Shift+Space 那一路。快捷键本身是系统级的，自动化按不出来，
  // 这条命令直接发主进程发的同一条 IPC，渲染层走的是完全一样的路径。
  async 'quick-capture'() {
    await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes("pet.html"));
      p?.show();
      p?.focus();
      p?.webContents.send("desktop:pet-quick-capture");
    });
    await sleep(600);
    console.log("quick-capture sent");
  },

  async ss(name) {
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + ".png");
    await page.screenshot({ path: f });
    console.log("screenshot:", f);
  },

  // fill <选择器> | <文本>
  // 分隔符是 " | " 而不是空格：选择器本身常常带空格（`.pet-note input`），
  // 按第一个空格切会把选择器切成两半，报的还是「元素不是 input」这种指不到病根的错。
  // 不带 | 时退回按第一个空格切，简单选择器照旧能用。
  async fill(arg) {
    const [sel, text] = arg.includes(" | ")
      ? [arg.slice(0, arg.indexOf(" | ")).trim(), arg.slice(arg.indexOf(" | ") + 3)]
      : [arg.slice(0, arg.indexOf(" ")), arg.slice(arg.indexOf(" ") + 1)];
    await page.fill(sel, text);
    console.log("filled", sel);
  },

  async press(key) { await page.keyboard.press(key); await sleep(250); console.log("pressed", key); },

  // setfile <选择器> | <文件绝对路径>
  // 给 <input type="file"> 塞文件，不走系统对话框——「设置 → 数据 → 导入」那条路
  // 就是这么验的（原生文件选择框在自动化里点不了，但那个 input 本身能直接喂）。
  async setfile(arg) {
    const i = arg.indexOf(" | ");
    const sel = arg.slice(0, i).trim();
    const file = arg.slice(i + 3).trim();
    await page.setInputFiles(sel, file);
    console.log("setfile", sel, "←", file);
  },

  async text(sel) {
    console.log(await page.evaluate(
      (s) => (s ? document.querySelector(s)?.innerText : document.body.innerText) ?? "(null)",
      sel || null,
    ));
  },

  async eval(expr) {
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log("ERROR:", e.message); }
  },

  // 备忘录 / 任务这些存储读出来看一眼。格式是 { version, data }，不是裸数组。
  async storage(key) {
    console.log(JSON.stringify(await main.evaluate((k) => {
      const raw = JSON.parse(localStorage.getItem(k) || "null");
      return Array.isArray(raw) ? raw : (raw?.data ?? raw);
    }, key), null, 2));
  },

  async wait(ms) { await sleep(Number(ms) || 500); },

  async quit() { if (app) await app.close().catch(() => {}); app = main = pet = page = null; },

  help() { console.log("commands:", Object.keys(COMMANDS).join(", ")); },
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const fn = COMMANDS[cmd];
  if (!fn) { console.log("unknown:", cmd, "— try: help"); continue; }
  try { await fn(rest.join(" ")); }
  catch (e) { console.log("ERROR:", e.message); }
  if (cmd === "quit") break;
}

await COMMANDS.quit();
process.exit(0);
