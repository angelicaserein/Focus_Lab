# 桌面版与桌宠

Focus Lab 可以用 Electron 打包成桌面 app。桌面版比网页版多一样东西：
一个常驻桌面的**桌宠悬浮窗**——就是沉浸式专注页里的那只烧瓶，直接飘在桌面上。

## 跑起来

```bash
npm run desktop:dev     # 开发：起 vite + Electron（改代码热更新）
npm run desktop:pack    # 只打包成免安装目录 release/win-unpacked/
npm run desktop:build   # 打成安装包 release/*.exe
```

网页版完全不受影响：`npm run dev` / `npm run build` 一切照旧。

## 两个窗口

| 窗口 | 内容 | 数据 |
|------|------|------|
| 主窗口 | 完整的 Focus Lab（侧边栏 + 全部页面） | 持有全部 localStorage |
| 桌宠窗 | 一只烧瓶 + 展开后的迷你面板 | **不存任何数据**，全靠 IPC |

桌宠刻意做成无状态的：localStorage 只能有一个 owner，两个渲染进程各写各的会打架
（`useLocalStorage` 不监听跨窗口 storage 事件）。所以数据单向流动——

```
主窗口 ──publishState(补丁)──▶ 主进程(合并) ──desktop:state──▶ 桌宠
主窗口 ◀────desktop:command──── 主进程 ◀──sendCommand──── 桌宠
```

代价是主窗口不能真的被销毁：点 X 只是隐藏，退出走托盘菜单。

状态快照分两段，由主进程浅合并：

- `app` 段 —— 由 [`DesktopHost`](../src/components/desktop/DesktopHost.jsx) 常驻发布：
  任务、语言、烧瓶形状参数。
- `focus` 段 —— 由 [`useDesktopFocusSync`](../src/hooks/desktop/useDesktopFocusSync.js) 发布，
  **只在 `/focus` 页面挂载时存在**。离开专注页会发 `{ focus: null }`，桌宠退回空瓶。

一次专注的计时状态活在 `FocusPage` 组件里（`useFocusTimer`），页面卸载会话就没了。
所以桌宠的「开始专注」在主进程侧会先把主窗口切到 `#/focus`，等 hook 挂载上来才有人接得住。

## 桌宠的行为

- **拖动 + 记忆位置**：按住烧瓶拖到桌面任意角落，位置存在
  `%APPDATA%/Focus Lab/pet-window.json`（存的是窗口右下角坐标，展开面板时这个角不动）。
  没用 CSS 的 `-webkit-app-region: drag`——那样系统会吞掉鼠标事件，同一块区域就没法既能拖又能点。
- **点击展开**：按下到抬起位移小于 4px 判定为点击，展开迷你面板（当前任务 / 开始暂停结束 / 记一条）。
- **鼠标穿透**：光标不在烧瓶或面板上时整个窗口对鼠标透明，不会挡住底下的桌面图标。
  靠 `setIgnoreMouseEvents(ignore, { forward: true })` + 渲染层 `elementFromPoint` 判定，
  实体区域在 DOM 里用 `data-pet-hit` 标记。
  判定精确到**瓶子的轮廓**而不是它的外接方块：窗口里除了 `.flask-hit`（烧瓶轮廓的一份
  不上色副本，描边加宽留出指针余量）之外的一切都设了 `pointer-events: none`，
  所以环外和四角照旧穿透。也正因如此，窗口尺寸可以比瓶子宽松，不必贴着瓶身裁。
- **专注计时同步**：烧瓶液面 = 已过时长 / 目标时长（和沉浸层同一口径），外圈还有一道进度环，
  计时进行中环会缓慢呼吸，暂停即静止。
- **托盘 + 全局快捷键**：托盘右键可开关桌宠 / 开机自启 / 退出；
  `Ctrl+Shift+Space` 随时唤起桌宠并把光标放进「记一条」输入框（写进备忘录）。

烧瓶没有情绪，也不会饿、不会枯萎。它只有一个状态量：装到哪儿了。
不专注的时候它就是空的，不表达任何评价。

## AI 功能

桌面版页面跑在自定义的 `app://` 协议下，没有同源的服务端，`/api/*` 代理会 404。
打包前需要把代理指向已部署的站点：

```bash
# .env.production.local
VITE_API_BASE=https://<你的 vercel 域名>
```

不设的话 AI 相关功能会失败并各自走兜底（示例内容 / 报错提示），其余功能不受影响。

## 已知的环境问题

Windows 上首次 `npm run desktop:build` 可能报：

```
ERROR: Cannot create symbolic link : 客户端没有所需的特权
```

这是 electron-builder 解压签名工具包时需要创建符号链接。二选一：

- 打开「设置 → 系统 → 开发者选项 → 开发人员模式」（一次性，推荐）；
- 或用管理员权限的终端跑打包命令。

急着出个能跑的产物、不在意 exe 图标和版本信息的话，可以临时加
`-c.win.signAndEditExecutable=false` 绕过。
