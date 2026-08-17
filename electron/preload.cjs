// 预加载脚本：渲染进程唯一能碰到 Electron 的入口。
// contextIsolation 开着，所以这里手工列出一份最小 API，不暴露 ipcRenderer 本体。
//
// 三个窗口共用这一个 preload，靠主进程注入的 --focuslab-role 区分身份：
// 主窗口拿到的是「发布状态 / 接收指令」，桌宠拿到的是「接收状态 / 发指令 + 窗口控制」，
// 积水窗只用得上一个 onFloodLevel。
// 用不到的方法在对应窗口里也存在，无害，省得写三份 preload。

const { contextBridge, ipcRenderer, webUtils } = require("electron");

const roleArg = process.argv.find((a) => a.startsWith("--focuslab-role="));
const role = roleArg ? roleArg.split("=")[1] : "main";

// 统一的订阅封装：返回取消订阅函数，方便 useEffect 直接 return。
function on(channel, cb) {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

contextBridge.exposeInMainWorld("focusDesktop", {
  role,
  isPet: role === "pet",

  // 启动握手：拿主进程缓存的最近一份状态快照（桌宠重载后立刻有内容可画）。
  hello: () => ipcRenderer.invoke("desktop:hello"),

  // 主窗口侧
  publishState: (state) => ipcRenderer.send("desktop:publish-state", state),
  onCommand: (cb) => on("desktop:command", cb),
  // 认领一条在页面挂载前就发出来的计时指令（懒加载路由会错过实时推送）
  claimCommand: () => ipcRenderer.invoke("desktop:claim-command"),
  onNavigate: (cb) => on("desktop:navigate", cb),
  // 切走 / 回来 / 一段用完的账（主进程判定，见 main.cjs 的 applyVerdict）
  onDistraction: (cb) => on("desktop:distraction", cb),
  // 把主窗口请回前台（藏起来的窗口 window.focus() 叫不动）。可带 "#/focus" 之类的路由
  showMain: (hash) => ipcRenderer.send("desktop:show-main", hash),

  // 拖进来的文件在硬盘上的真实路径。浏览器给的 File 对象里没有这个东西
  // （能拿到内容，拿不到位置，更不可能回头把它打开），是桌面版独有的一件事。
  // Electron 32 起 File.path 被移除了，只能走 webUtils。
  pathsOf: (files) => {
    const out = [];
    for (const f of files ?? []) {
      try {
        const p = webUtils.getPathForFile(f);
        if (p) out.push(p);
      } catch { /* 不是真文件（拖的是浏览器里的图片之类）：跳过 */ }
    }
    return out;
  },
  // 用系统默认程序打开。成功返回 ""，失败返回原因（文件被移走 / 删了）。
  openPath: (p) => ipcRenderer.invoke("desktop:open-path", p),

  // 分心水位：设置页发白名单，积水窗收水位
  setWatchConfig: (cfg) => ipcRenderer.send("desktop:watch-config", cfg),
  onAppsSeen: (cb) => on("desktop:apps-seen", cb),
  // 探测器在这台机器上跑不起来：设置页据此把开关关掉并说明原因
  onWatchUnavailable: (cb) => on("desktop:watch-unavailable", cb),
  onFloodLevel: (cb) => on("flood:level", cb),

  // 桌宠侧
  onState: (cb) => on("desktop:state", cb),
  sendCommand: (cmd) => ipcRenderer.send("desktop:command", cmd),
  onQuickCapture: (cb) => on("desktop:pet-quick-capture", cb),
  // 桌宠窗失焦（用户回去用别的程序了）：展开的面板该自己收起来
  onPetBlur: (cb) => on("desktop:pet-blur", cb),
  dragStart: (pt) => ipcRenderer.send("desktop:pet-drag-start", pt),
  dragMove: (pt) => ipcRenderer.send("desktop:pet-drag-move", pt),
  dragEnd: () => ipcRenderer.send("desktop:pet-drag-end"),
  setIgnoreMouse: (ignore) => ipcRenderer.send("desktop:pet-ignore-mouse", ignore),
  hidePet: () => ipcRenderer.send("desktop:pet-hide"),
});
