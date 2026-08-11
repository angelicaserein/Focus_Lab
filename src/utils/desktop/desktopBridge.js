// 桌面端桥接层：把 preload 注入的 window.focusDesktop 包一层。
//
// 存在的意义是「浏览器里跑的时候什么都不做」——同一份 src 既构建成网页版
// 也构建成 Electron 渲染层，业务代码不该到处写 `if (window.focusDesktop)`。
// 这里所有函数在网页环境下都是安全的 no-op，订阅类返回一个空的取消函数。

const bridge = typeof window !== "undefined" ? window.focusDesktop : undefined;

const noop = () => {};
const noopSub = () => noop;

// 是否运行在 Electron 桌面版里。UI 用它决定要不要显示「桌宠」相关的入口。
export const isDesktop = !!bridge;

export const desktop = {
  isDesktop,

  // ── 主窗口侧 ──
  // 向桌宠推送状态快照。调用频率不低（计时每 500ms 变一次），
  // 所以调用方要自己做「没变就不发」的过滤，见 useDesktopSync。
  publishState: bridge ? (state) => bridge.publishState(state) : noop,
  // 桌宠发来的操作指令：{ type: "start" | "toggle-pause" | "stop" | "add-note", ... }
  onCommand: bridge ? (cb) => bridge.onCommand(cb) : noopSub,
  // 挂载时认领一条错过的计时指令，没有就返回 null
  claimCommand: bridge ? () => bridge.claimCommand() : async () => null,
  // 主进程要求主窗口跳转到某个 hash 路由（托盘菜单 / 桌宠的「开始专注」）
  onNavigate: bridge ? (cb) => bridge.onNavigate(cb) : noopSub,
  // 把主窗口请回前台。网页版下 window.focus() 就够了，所以这里是 no-op
  showMain: bridge ? (hash) => bridge.showMain(hash) : noop,

  // ── 分心水位 ──
  // 白名单配置：真值在主窗口的 localStorage 里，这里只是同步给主进程做判定
  setWatchConfig: bridge ? (cfg) => bridge.setWatchConfig(cfg) : noop,
  // 探测器攒的「最近用过的应用」，设置页拿它渲染勾选表
  onAppsSeen: bridge ? (cb) => bridge.onAppsSeen(cb) : noopSub,
  // 探测器在这台机器上跑不起来，功能要自己关掉（见 DesktopHost）
  onWatchUnavailable: bridge ? (cb) => bridge.onWatchUnavailable(cb) : noopSub,
  // 积水窗专用
  onFloodLevel: bridge ? (cb) => bridge.onFloodLevel(cb) : noopSub,
  // 切走别的软件的三类事件：
  //   { type: "enter" }   —— 刚离开白名单（计时器该暂停）
  //   { type: "leave" }   —— 回来了（计时器该恢复）
  //   { type: "segment", name, label, startTs, endTs, durationSecs } —— 一段用完的账
  onDistraction: bridge ? (cb) => bridge.onDistraction(cb) : noopSub,

  // ── 桌宠侧 ──
  onState: bridge ? (cb) => bridge.onState(cb) : noopSub,
  sendCommand: bridge ? (cmd) => bridge.sendCommand(cmd) : noop,
  onQuickCapture: bridge ? (cb) => bridge.onQuickCapture(cb) : noopSub,
  // 桌宠窗失焦，面板据此自动收起
  onPetBlur: bridge ? (cb) => bridge.onPetBlur(cb) : noopSub,
  dragStart: bridge ? (pt) => bridge.dragStart(pt) : noop,
  dragMove: bridge ? (pt) => bridge.dragMove(pt) : noop,
  dragEnd: bridge ? () => bridge.dragEnd() : noop,
  setIgnoreMouse: bridge ? (v) => bridge.setIgnoreMouse(v) : noop,
  hidePet: bridge ? () => bridge.hidePet() : noop,
  hello: bridge ? () => bridge.hello() : async () => ({ state: null }),
};

export default desktop;
