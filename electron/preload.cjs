// 预加载脚本：渲染进程唯一能碰到 Electron 的入口。
// contextIsolation 开着，所以这里手工列出一份最小 API，不暴露 ipcRenderer 本体。
//
// 两个窗口共用这一个 preload，靠主进程注入的 --focuslab-role 区分身份：
// 主窗口拿到的是「发布状态 / 接收指令」，桌宠拿到的是「接收状态 / 发指令 + 窗口控制」。
// 反向的方法在对应窗口里也存在但用不到，无害，省得写两份 preload。

const { contextBridge, ipcRenderer } = require("electron");

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

  // 桌宠侧
  onState: (cb) => on("desktop:state", cb),
  sendCommand: (cmd) => ipcRenderer.send("desktop:command", cmd),
  onQuickCapture: (cb) => on("desktop:pet-quick-capture", cb),
  setExpanded: (expanded) => ipcRenderer.send("desktop:pet-expanded", expanded),
  dragStart: (pt) => ipcRenderer.send("desktop:pet-drag-start", pt),
  dragMove: (pt) => ipcRenderer.send("desktop:pet-drag-move", pt),
  dragEnd: () => ipcRenderer.send("desktop:pet-drag-end"),
  setIgnoreMouse: (ignore) => ipcRenderer.send("desktop:pet-ignore-mouse", ignore),
  hidePet: () => ipcRenderer.send("desktop:pet-hide"),
});
