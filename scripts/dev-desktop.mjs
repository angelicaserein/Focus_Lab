// 桌面版开发启动器：拉起 vite dev server，等它真的听上端口了再起 Electron。
//
// 不引 concurrently / wait-on 之类的依赖，就为了这一件事加两个包不值当。
// 关键点是「等就绪」——Electron 起太早会 loadURL 失败，白屏且不会自己重试。

import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

// 与 vite.config.js 的 server.port 保持一致（那边写死 5173 且 strictPort）
const URL = "http://localhost:5173/";

const children = [];
const shellOpt = process.platform === "win32"; // Windows 上 npx/electron 是 .cmd，得走 shell

function run(cmd, args, env) {
  const childEnv = { ...process.env, ...env };
  // 从 Electron 系的终端（部分 IDE 内置终端、Claude Code 等）启动时，环境里会带着
  // ELECTRON_RUN_AS_NODE=1。它会让 electron 二进制退化成纯 node 跑，
  // require("electron") 只返回一个路径字符串，主进程一上来就 TypeError。
  delete childEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(cmd, args, { stdio: "inherit", shell: shellOpt, env: childEnv });
  children.push(child);
  return child;
}

// 任一进程退出就把另一个也带走，别留下孤儿 vite 占着 5173。
//
// Windows 上 shell:true 意味着我们手里的 pid 是外层 cmd.exe，真正的 node vite.js
// 是它的孙进程。c.kill() 只杀壳，vite 会活下来继续占 5173，下次启动必然报端口冲突。
// taskkill /T 才能把整棵树带走；用 spawnSync 是因为紧接着就 process.exit 了，
// 异步版本来不及执行。
function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return; // 已经没了
  if (shellOpt) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill();
  }
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return; // 两个 exit 事件会前后脚都触发，别重入
  shuttingDown = true;
  for (const c of children) { try { killTree(c); } catch { /* 已经没了 */ } }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const vite = run("npx", ["vite"]);
vite.on("exit", (code) => shutdown(code ?? 0));

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(URL, { method: "HEAD" });
      if (resp.ok || resp.status === 404) return true;
    } catch {
      /* 还没起来，继续等 */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

if (!(await waitForServer())) {
  console.error(`[desktop] ${URL} 30 秒内没起来，放弃启动 Electron`);
  shutdown(1);
}

// VITE_DEV_SERVER_URL 存在与否，就是主进程判断 dev / prod 的开关
const electron = run("npx", ["electron", "."], { VITE_DEV_SERVER_URL: URL });
electron.on("exit", (code) => shutdown(code ?? 0));
