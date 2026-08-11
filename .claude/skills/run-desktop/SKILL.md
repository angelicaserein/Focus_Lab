---
name: run-desktop
description: 启动并驱动 Focus Lab 的 Electron 桌面版（主窗口 + 桌宠悬浮窗 + 积水窗）。当需要跑起桌面版、给桌宠截图、验证 IPC / 穿透 / 分心水位这类只在 Electron 里成立的行为时使用。
---

Focus Lab 的桌面版是三个 BrowserWindow：主窗口（完整应用，持有全部 localStorage）、
桌宠悬浮窗（无边框透明置顶，只画烧瓶 + 迷你面板，无状态）、积水窗（分心时的水面）。
桌宠的行为几乎全都跨进程——推状态、点击穿透、失焦收起——**在 vitest 里一条都验不到**，
必须真的把 Electron 跑起来。

自动化走 `.claude/skills/run-desktop/driver.mjs`（Playwright `_electron` 的 REPL）。
Windows 上窗口直接画在真实桌面，不需要 xvfb。

## 跑之前

```bash
npx vite build     # 驱动跑的是生产形态（读 dist/，走 app:// 协议）
```

改了 `src/` 而没重新 build 的话，你验的是上一次的代码。

## 用法

管道喂一串命令，跑完自己退出：

```bash
node .claude/skills/run-desktop/driver.mjs <<'EOF'
launch
publish {"app":{"lang":"zh","scenarioTitle":"写论文","pendingCount":3,"selectedTitles":["重写第三章"],"selectedIds":["t1"],"candidates":[]},"focus":{"seconds":754,"isRunning":true,"targetMins":25,"timerMode":"countup","hasSelection":true}}
expand
text .pet-panel
press Escape
eval !document.querySelector('.pet-panel')
ss panel
quit
EOF
```

截图落在 `.tmp-shots/`（`SCREENSHOT_DIR` 可覆盖）。**要真的把截图打开看**——
透明窗截出来是全透明的话就是没画出来，跟「启动失败」长得一模一样。

### 命令

| 命令 | 作用 |
|---|---|
| `launch` | 起 app，等两个窗口就绪，默认操作对象 = 桌宠窗 |
| `pet` / `main` | 切换后续命令作用在哪个窗口 |
| `windows` | 列出所有窗口 URL |
| `publish <json>` | 主窗口发一份状态补丁给主进程（桌宠据此渲染） |
| `expand` | 点烧瓶轮廓展开面板 |
| `focus main\|pet` | 让某个窗口拿到焦点（验「失焦自动收起」只能这么触发） |
| `hide-pet` / `show-pet` | 藏 / 显示桌宠（验「藏起来不推状态、show 时补一份」） |
| `quick-capture` | 发 `Ctrl+Shift+Space` 那条 IPC（系统级快捷键在自动化里按不出来） |
| `ss [名字]` | 截图 |
| `fill <sel> \| <文本>` / `press <键>` | 输入（分隔符是 ` \| `，选择器常常自带空格） |
| `text [sel]` / `eval <js>` | 读页面 |
| `storage <key>` | 读主窗口的 localStorage（自动拆 `{version,data}` 包装） |
| `watch <进程名,…>` | 开着分心水位并设白名单（走真实 IPC，见下） |
| `foreground` | 此刻真正在最前面的是哪个进程（探测器看的就是它） |
| `wait <ms>` / `quit` | 等待 / 退出 |

## 验「切走即分心」（自动停表 + 记账）

这条路验起来有个绕不过去的障碍：**Windows 不让后台进程把别的窗口拱到最前面**。
从驱动里 `spawn("notepad.exe")` 弹出来的记事本进不了前台，`AppActivate` 也一样，
所以「真的 Alt+Tab 走开」这个动作自动化模拟不了 —— 别在这上面耗时间。

换个方向驱动同一条判定链：**前台不动，改白名单**。把当前前台程序移出白名单
＝切走，放回去＝回来，走的仍然是 `reevaluateWatch → judgeApp → applyVerdict`：

```bash
node .claude/skills/run-desktop/driver.mjs <<'EOF'
launch
main
foreground                 # 记下这个名字，比如 msedge
# …在主窗口里开一次专注（双击任务卡直达，不走仪式）…
watch msedge               # 前台在白名单里 ＝ 专心，表往前走
wait 4000
text .immersive-clock
watch electron             # 把 msedge 踢出去 ＝ 切走，表该冻住
wait 9000
text .immersive-clock
watch msedge               # 放回去 ＝ 回来，表恢复 + 这一段结账
wait 4000
storage focus_distractions_v1
quit
EOF
```

跑通的样子：计时在阶段二纹丝不动，阶段三继续往前；`focus_distractions_v1` 里多一条
`type: "app"`、`tag` 是程序的友好名、带 `ts`/`endTs`/`durationSecs`/`sessionId`。

- **开关必须走 `watch` 命令（真实 IPC），不能去种 `pref_app_watch_v1`。**
  那个 key 的默认值是 `null`，app 一挂载就把种进去的值写回成 `{"version":1,"data":null}`，
  于是功能全程是关着的 —— 表现是「什么都没发生」，跟功能坏了长得一模一样。
- 白名单**空着不等于什么都算分心**，是只采集、不判定（那张表就是探测器攒的）。
- 探测器本身可以单独验，不用起 Electron：
  `node -e "const{AppWatcher}=require('./electron/appWatch.cjs');const w=new AppWatcher(require('os').tmpdir());w.on('app',console.log);w.start()"`

## 人工跑

```bash
npm run desktop:dev     # vite + electron，改代码热更新
```

## 坑（都是真踩过的）

- **`ELECTRON_RUN_AS_NODE`**：从 VS Code 内置终端 / Claude Code 里启动会带着这个变量，
  它让 electron 二进制退化成纯 node 跑，`require("electron")` 只返回一个路径字符串，
  主进程一上来就 TypeError。驱动和 `scripts/dev-desktop.mjs` 都显式 `delete` 掉了。
- **驱动脚本在 `.claude/` 下，裸 `import "playwright-core"` 解析不到**项目的 node_modules。
  必须用绝对 file URL 动态 import（见 driver.mjs 顶部）。
- **点桌宠要点在 `.flask-hit` 的轮廓上**。窗口里除了那份不上色的轮廓副本，一切都是
  `pointer-events: none`；点 `.pet-flask` 的几何中心多半落在空处，什么都不会发生。
  驱动的 `expand` 取的是 `.flask-hit` 的 rect 再往下偏 80%（落在瓶肚子里）。
- **桌宠没有自己的数据**，直接改它的 localStorage 是没用的。要让它显示什么，
  只能从主窗口 `publishState` 推（就是 `publish` 命令干的事）。
- **localStorage 的格式是 `{ version, data }`**，不是裸数组（见 `storage.js`）。
- **别直接改 localStorage 来清理测试数据**：`usePersistedWrite` 在 `pagehide` 时会拿
  组件里那份内存值无条件 flush 一遍，你在盘上删掉的会被原样盖回来。要清理就走 UI
  自己的删除按钮（比如备忘录页），让 React 状态先变。
- **一次 `evaluate` 只点一下**。React 是异步 re-render 的，在同一个 evaluate 里同步
  循环「找元素→点删除」，DOM 根本不会更新，你会对着同一条按二十下。
- 主窗口点 X 不退出（托盘常驻），驱动的 `quit` 走的是 `app.close()`。
- **托盘 tooltip 这个驱动验不了**：`Tray` 没有 `getToolTip`，装进 app 之后那句话
  只有人眼能看见。所以它的文案被抽成了纯函数 `electron/trayTooltip.cjs`，
  形态全在 `electron/trayTooltip.test.js` 里锁着 —— 改托盘文案时改测试，别指望驱动。
  这里能验的只是「连推多次状态后 app 没崩」，那说明 `updateTrayTooltip` 这条路没抛。

## 排查

- **`launch` 超时**：`dist/` 不存在 → 先 `npx vite build`。
- **窗口起来了但桌宠是空的**：正常，它在等第一份状态；发一条 `publish` 就有内容。
- **`expand` 报找不到 `.flask-hit`**：桌宠窗还没加载完，或 build 是旧的。
- **第二次 `launch` 立刻退出**：单实例锁——已经有一个 Focus Lab 在跑了。要么关掉它，
  要么 `FL_USER_DATA_DIR=%TEMP%\fl-test` 换一份独立的 userData：锁是按 userData 目录
  算的，顺带测试数据也不会混进你的真实存档（代价是那边看不到你平时的数据）。
