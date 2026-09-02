# Focus Lab · ADHD 专注实验室

**🌐 Try it now — no install needed: <https://focus-lab-ruddy.vercel.app/>**

**🌐 直接打开就能用，无需安装：<https://focus-lab-ruddy.vercel.app/>**

[English](#english) · [简体中文](#简体中文)

---

<a id="english"></a>

# English

A participatory-design research prototype for people with ADHD: focus timing, task
management, gamified rewards and GenAI companionship in one React SPA, built to explore
*how AI can help people with ADHD sustain focus*.

> Research prototype, not a commercial product. All data stays in the browser's
> `localStorage` and is never uploaded (the only exception: AI requests send the content
> needed for that one exchange to the model proxy).

## 1. Use the web version (recommended, zero setup)

Open <https://focus-lab-ruddy.vercel.app/> in any modern browser. Everything works
immediately — no account, no install, no API key. AI features fall back to preset sample
replies if the deployment has no key configured.

Your data lives in that browser's `localStorage`, so:

- it persists across visits on the **same browser + same device**;
- it does **not** sync between devices or browsers — use Settings → backup export/import
  to move data;
- clearing site data / browsing in private mode wipes it.

## 2. Install it on your phone (PWA)

There is no App Store / Play Store build. The web version *is* the mobile app — it ships
a manifest and a service worker, so you can install it to the home screen and run it
full-screen and offline.

**iOS (Safari)**
1. Open <https://focus-lab-ruddy.vercel.app/> in **Safari** (Chrome on iOS cannot install PWAs).
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch it from the home-screen icon. It runs without the browser chrome.

**Android (Chrome / Edge)**
1. Open <https://focus-lab-ruddy.vercel.app/>.
2. Tap the **⋮** menu → **Install app** / **Add to Home screen** (some versions show an
   install banner automatically).
3. Launch it from the launcher icon.

Notes for mobile:
- After the first load the service worker caches the app, so it opens offline; AI
  features still need a network connection.
- The home-screen app and the browser tab share the same `localStorage` origin, so your
  data is the same.
- The 3D immersive layer on the focus page is heavy — on older phones prefer the plain
  timer.

## 3. Desktop app (Electron, adds the desktop pet)

The desktop build is everything the web version has, **plus a floating desktop pet** —
the same flask from the immersive focus screen, living on your desktop, with a tray icon
and a global hotkey.

There is no prebuilt installer published yet, so build it yourself:

```bash
git clone <this repo>
cd Focus_Lab
npm install
npm run desktop:build   # installer → release/*.exe
# or
npm run desktop:pack    # portable folder → release/win-unpacked/
```

Then run the produced installer / executable. Desktop extras:

- **Desktop pet**: drag it anywhere, click to expand a mini panel (pick a task, start /
  pause / end focus, jot a quick note). Mouse-through outside the flask outline, so it
  never blocks your desktop icons.
- **Flood window**: a thin water layer pinned to the bottom of the screen that rises with
  distractions.
- **Tray menu**: toggle the pet, launch on startup, quit (closing the main window only
  hides it).
- **Global hotkey** `Ctrl+Shift+Space`: summon the pet with the cursor already in the
  quick-note box.

Details: [`docs/desktop.md`](docs/desktop.md).

## 4. Run it locally (development)

```bash
git clone <this repo>
cd Focus_Lab
npm install
npm run dev          # http://localhost:5173 (fixed port)
npm run build        # production build → dist/
npm run preview      # serve the production build locally
npm run desktop:dev  # Electron: main window + pet window + flood window, with HMR
```

Requires Node.js 18+.

The dev port is pinned to 5173 with `strictPort`: `localStorage` is isolated per origin
(port included), so a different port means your tasks and settings appear to be gone. If
the port is taken the server errors out instead of silently moving — close the old dev
server first.

**Open your local build on your phone** (same Wi-Fi):

```bash
npm run dev -- --host        # prints a http://192.168.x.x:5173 URL
```

Open that URL on the phone. Note that iOS Safari will not offer "Add to Home Screen" as a
real PWA over plain HTTP on a LAN address — for the installable experience use the
hosted URL above.

### Optional: configure AI

AI works out of the box; with no key it rotates through preset sample replies and no
feature is blocked. To use a real model:

```bash
cp .env.example .env      # then fill in VITE_OPENAI_API_KEY
```

Three modes are selected automatically (see [`src/utils/ai/aiClient.js`](src/utils/ai/aiClient.js)):

| Environment | Behaviour |
|------|------|
| Production (Vercel) | Goes through the server proxies in `api/*.mjs`; the key never reaches the browser |
| Local + `VITE_OPENAI_API_KEY` set | Browser talks to the OpenAI SDK directly |
| Local, no key | Rotating preset sample replies |

There are 9 serverless proxy endpoints; the shared shell and the model id live in
[`api/_shared.mjs`](api/_shared.mjs) (swap models in one place): chat, task extraction,
clarifying questions, refinement, priority-matrix placement, scenario re-ranking,
scenario-setup assistant, journey narration.

## 5. Feature map

The sidebar sections are the feature sections; the route table is
[`src/routes/routeTable.js`](src/routes/routeTable.js).

| Section | Pages |
|------|------|
| — | `/` Home — today's todos, current status, entry points |
| Daily | `/focus` Focus (timer + start ritual + 3D immersive layer + distraction log + summary card), `/tasks` Task library, `/memo` Memos, `/ddl` Deadlines, `/character` Character sheet, `/skilltree` Skill tree, `/world` World map, `/industry` Industry points |
| Rewards | `/reward` Coin shop, `/wish` Wishes, `/aquarium` Aquarium, `/flasks` Flask shelf |
| Review | `/calendar` Timeline (with raw log), `/analytics` Analytics, `/distraction` Distraction stats, `/scenario-stats` Scenario stats |
| Tools | `/gantt` Gantt, `/tutorial` Tutorial, `/functiontree` Function tree, `/scenario` Scenario setup |
| Other | `/settings` Settings (sidebar bottom icon), `/deprecated` Retired pages (reachable from Settings only) |

- **Function tree**: every node on `/functiontree` is a feature switch — turning one off
  hides its sidebar entry *and* makes the route genuinely unreachable (direct visits
  bounce home). Core pages (Home / Settings / Function tree / Retired) are exempt.
- **Global search / command palette**: from the sidebar; searches tasks and pages across
  the app and can create a task or a quick note directly
  ([`src/components/search/`](src/components/search/)).
- **Bilingual UI**: all copy lives in [`src/i18n/`](src/i18n/), switchable from the sidebar.

## 6. Scripts

| Command | Purpose |
|------|------|
| `npm run dev` | Dev server |
| `npm run build` / `preview` | Production build / preview |
| `npm test` | Full unit test run (vitest, one-shot) |
| `npm run test:watch` | Watch mode |
| `npm run test:cov` | Coverage report (`coverage/index.html`) |
| `npm run journal` | Sync git commits to Notion (`scripts/git-notion-logger/`) |
| `npm run shot [path]` | Full-page screenshot of the dev server → `.tmp/shots/` |
| `npm run data:example` | Generate a one-week sample backup → `.tmp/`, import it in Settings → Data |
| `npm run desktop:dev` | Desktop dev (Electron main + pet + flood windows) |
| `npm run desktop:pack` / `desktop:build` | Portable folder / installer, output in `release/` |

## 7. Tech stack

- **UI**: React 18 + React Router 6; all pages are `React.lazy` and prefetched when idle
- **Build**: Vite 5, alias `@/` → `src/`; three entries `index.html` / `pet.html` / `flood.html`
- **3D**: Three.js + @react-three/fiber / drei (Draco-compressed models, decoder self-hosted in `public/draco/`)
- **AI**: OpenAI SDK + serverless proxies in `api/`
- **State**: plain React Context + `useLocalStorage`, no third-party store
- **Styling**: hand-written CSS split per module/page; design tokens in `src/styles/theme.css`
- **Testing**: Vitest (unit, node env) + Playwright (E2E / screenshot checks)
- **Deploy**: Vercel (`api/` as Serverless Functions)
- **Desktop**: Electron 33 + electron-builder ([`docs/desktop.md`](docs/desktop.md))

More: [`docs/README.md`](docs/README.md) indexes every doc — stack in
[`docs/tech-stack.md`](docs/tech-stack.md), testing rules in [`docs/TDD.md`](docs/TDD.md),
overlay layering in [`docs/z-index.md`](docs/z-index.md).

## 8. Project layout

```
Focus_Lab/
├── api/               # Vercel Serverless Functions (9 AI proxy endpoints + _shared shell)
├── electron/          # Desktop main process, preload, tray, auto-update
├── public/            # Copied verbatim (PWA manifest + SW, Draco decoder, icons)
├── docs/              # Docs — see docs/README.md for the index
├── scripts/           # Helper scripts (desktop launcher, screenshots, sample data, git→Notion logger)
├── .tmp/              # Local scratch output (screenshots, generated sample backup) — gitignored
├── src/
│   ├── pages/         # One directory per page (with its own .css and local logic)
│   ├── components/    # Cross-page components (layout / ui / todo / focus / search / privacy …)
│   ├── context/       # Global providers (tasks, focus, rewards, scenario, theme, language, feature flags)
│   ├── hooks/         # Custom hooks (focus / task / session / scenario / desktop / common …)
│   ├── utils/         # Pure logic (ai / task / scenario / storage / analytics / privacy …)
│   ├── data/          # Static config (aquarium fish, companions, specimens)
│   ├── assets/        # Assets imported by code and bundled (3D models, …)
│   ├── i18n/          # zh / en copy
│   ├── pet/           # Desktop-pet renderer entry (pet.html)
│   ├── flood/         # Screen-bottom flood layer entry (flood.html)
│   ├── routes/        # Route table and lazy wiring
│   ├── styles/        # Global styles and design tokens
│   ├── AppProviders.jsx  # Context assembly (array order = nesting order)
│   └── App.jsx
└── src/_deprecated/   # Retired but archived features (not bundled, see its README)
```

`pet.html` / `flood.html` deliberately do not reuse `index.html` — one needs a single SVG
flask, the other a single canvas; neither should boot the router, contexts and three.js again.

## 9. Conventions

- **Tests first**: core pure logic must be unit-tested and coverage only goes up
  ([`docs/TDD.md`](docs/TDD.md)). `.githooks/pre-commit` runs `vitest run` automatically.
- **Keep abstraction restrained**: extract only genuinely duplicated / multi-responsibility
  code; don't split an already-fine page just to split it.
- **Persistence**: global state goes through `useLocalStorage` into `localStorage`; keys are
  registered in `src/utils/storage/storageKeys.js`, with a warning when quota runs low
  (`quotaAlert.js`).
- **Settled trade-offs**: before changing a feature, read its file under
  [`docs/claude-memory/`](docs/claude-memory/README.md) instead of re-litigating it.
  Collaboration rules: [`CLAUDE.md`](CLAUDE.md).

---

<a id="简体中文"></a>

# 简体中文

面向 ADHD 人群的参与式设计研究原型：把专注计时、任务管理、游戏化激励与 GenAI 陪伴整合进
一个 React 单页应用，用来探索「AI 如何帮助 ADHD 用户维持专注」。

> 研究性质原型，非商业产品。数据全部存在浏览器 `localStorage`，不上传服务器
> （AI 请求除外——只把当次对话所需内容发给模型代理）。

## 一、直接用网页版（推荐，零配置）

用任意现代浏览器打开 <https://focus-lab-ruddy.vercel.app/>。开箱即用，不需要注册、
不需要安装、不需要 API key；部署侧没有配 key 时 AI 功能自动回落到预设示例回复。

数据存在这个浏览器的 `localStorage` 里，所以：

- **同一台设备、同一个浏览器**再打开还在；
- **不会**跨设备/跨浏览器同步——换设备请用「设置 → 备份导出/导入」搬数据；
- 清除站点数据、无痕模式关闭窗口，数据就没了。

## 二、装到手机上（PWA）

没有 App Store / 应用商店版本。**网页版本身就是手机版**：带 manifest 和 Service Worker，
可以装到主屏、全屏运行、离线打开。

**iOS（Safari）**
1. 用 **Safari** 打开 <https://focus-lab-ruddy.vercel.app/>（iOS 上的 Chrome 装不了 PWA）。
2. 点 **分享** → **添加到主屏幕** → **添加**。
3. 从主屏图标启动，没有浏览器边框。

**Android（Chrome / Edge）**
1. 打开 <https://focus-lab-ruddy.vercel.app/>。
2. 点 **⋮** 菜单 → **安装应用 / 添加到主屏幕**（部分版本会自动弹安装条）。
3. 从桌面图标启动。

手机端注意：
- 首次加载后 Service Worker 会缓存整个应用，之后可离线打开；AI 功能仍需联网。
- 主屏应用和浏览器标签页是同一个 origin，`localStorage` 数据互通。
- 专注页的 3D 沉浸层较吃性能，旧手机建议用普通计时模式。

## 三、桌面版（Electron，多一只桌宠）

桌面版 = 网页版的全部功能 + **一只常驻桌面的桌宠**：就是沉浸式专注页里那只烧瓶，
直接飘在桌面上，另有托盘图标和全局快捷键。

目前没有发布预编译安装包，自己打一个：

```bash
git clone <本仓库>
cd Focus_Lab
npm install
npm run desktop:build   # 安装包 → release/*.exe
# 或
npm run desktop:pack    # 免安装目录 → release/win-unpacked/
```

然后运行产出的安装包 / 可执行文件。桌面版独有：

- **桌宠**：拖到桌面任意角落，点一下展开迷你面板（挑任务 / 开始暂停结束 / 记一条）。
  烧瓶轮廓之外鼠标穿透，不会挡住桌面图标。
- **积水窗**：贴在屏幕底部的一层水，随分心次数上涨。
- **托盘菜单**：开关桌宠、开机自启、退出（点主窗口的 × 只是隐藏）。
- **全局快捷键** `Ctrl+Shift+Space`：随时唤起桌宠，光标直接落在「记一条」输入框里。

细节见 [`docs/desktop.md`](docs/desktop.md)。

## 四、本地跑起来（开发）

```bash
git clone <本仓库>
cd Focus_Lab
npm install
npm run dev          # http://localhost:5173（端口固定）
npm run build        # 生产构建 → dist/
npm run preview      # 本地预览生产构建
npm run desktop:dev  # Electron：主窗口 + 桌宠窗 + 积水窗，带热更新
```

需要 Node.js 18+。

dev 端口写死 5173 且 `strictPort`：`localStorage` 按 origin（含端口）隔离，端口一变就
读不到之前的任务和设置。端口被占用时会直接报错，先关掉旧的 dev server。

**用手机访问本地版本**（同一个 Wi-Fi）：

```bash
npm run dev -- --host        # 会打印一个 http://192.168.x.x:5173
```

手机浏览器打开这个地址即可。注意局域网的纯 HTTP 地址在 iOS Safari 上装不成真正的 PWA，
要装到主屏请用上面的线上地址。

### 可选：配置 AI

AI 开箱即用，无 key 时轮换预设示例回复，功能不受影响。要接真实模型：

```bash
cp .env.example .env      # 然后把 key 填进 VITE_OPENAI_API_KEY
```

三种模式自动切换（分流实现见 [`src/utils/ai/aiClient.js`](src/utils/ai/aiClient.js)）：

| 环境 | 行为 |
|------|------|
| 生产（Vercel） | 走服务端代理 `api/*.mjs`，key 不暴露给浏览器 |
| 本地 + 有 `VITE_OPENAI_API_KEY` | 浏览器直连 OpenAI SDK |
| 本地 + 无 key | 轮换预设示例回复 |

服务端共 9 个代理端点，公共外壳与模型号集中在 [`api/_shared.mjs`](api/_shared.mjs)
（换模型只改这一处）：对话、任务抽取、拆分反问、再细化、优先级矩阵分配、情景推荐精排、
情境配置助手、旅程旁白。

## 五、功能地图

侧栏分区即功能分区，路由表见 [`src/routes/routeTable.js`](src/routes/routeTable.js)。

| 分区 | 页面 |
|------|------|
| — | `/` 主页——今日待办、当前状态与各功能入口 |
| 每日 | `/focus` 专注（计时 + 仪式启动 + 3D 沉浸层 + 分心记录 + 结算卡）、`/tasks` 任务库、`/memo` 备忘录、`/ddl` DDL 提醒、`/character` 角色卡、`/skilltree` 技能树、`/world` 世界地图、`/industry` 工业点数 |
| 奖励 | `/reward` 金币商店、`/wish` 祈愿、`/aquarium` 生态缸、`/flasks` 烧瓶架 |
| 回顾 | `/calendar` 时间轴（含原始流水）、`/analytics` 数据分析、`/distraction` 分心统计、`/scenario-stats` 情景统计 |
| 工具 | `/gantt` 甘特图、`/tutorial` 教程、`/functiontree` 功能树、`/scenario` 情境配置 |
| 其他 | `/settings` 设置（侧栏底部图标）、`/deprecated` 废弃页面（仅从设置页进） |

- **功能树**：`/functiontree` 每个节点是一个功能开关，关掉后侧栏入口隐藏、路由也真正不可达
  （直接访问弹回主页）。核心页（主页 / 设置 / 功能树 / 废弃页面）不受此限。
- **全局搜索 / 命令面板**：侧栏入口，跨页搜任务与页面，并可直接「新建任务 / 记一条随记」
  （[`src/components/search/`](src/components/search/)）。
- **中英双语**：文案集中在 [`src/i18n/`](src/i18n/)，侧栏一键切换。

## 六、常用脚本

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` / `preview` | 生产构建 / 预览 |
| `npm test` | 跑全部单测（vitest，一次性） |
| `npm run test:watch` | 常驻监听测试 |
| `npm run test:cov` | 覆盖率报告（`coverage/index.html`） |
| `npm run journal` | 把 git commit 同步到 Notion（见 `scripts/git-notion-logger/`） |
| `npm run shot [路径]` | 给开发服务器整页截图 → `.tmp/shots/` |
| `npm run data:example` | 造一周示例备份 → `.tmp/`，在 设置 → 数据 里导入 |
| `npm run desktop:dev` | 桌面版开发（Electron 主窗口 + 桌宠悬浮窗 + 积水窗） |
| `npm run desktop:pack` / `desktop:build` | 打免安装目录 / 打安装包，产物在 `release/` |

## 七、技术栈一览

- **UI**：React 18 + React Router 6，页面全部 `React.lazy` 懒加载并在空闲时预取 chunk
- **构建**：Vite 5，路径别名 `@/` → `src/`；三个入口 `index.html` / `pet.html` / `flood.html`
- **3D / 沉浸**：Three.js + @react-three/fiber / drei（Draco 压缩模型，解码器自托管于 `public/draco/`）
- **AI**：OpenAI SDK + `api/` 服务端代理
- **状态**：纯 React Context + `useLocalStorage`，无第三方状态库
- **样式**：原生 CSS，按模块与页面拆分，设计 token 在 `src/styles/theme.css`
- **测试**：Vitest（单测，node 环境）+ Playwright（E2E / 截图验证）
- **部署**：Vercel（`api/` 为 Serverless Functions）
- **桌面版**：Electron 33 + electron-builder（见 [`docs/desktop.md`](docs/desktop.md)）

文档索引见 [`docs/README.md`](docs/README.md)：技术细节 [`docs/tech-stack.md`](docs/tech-stack.md)，
测试规范 [`docs/TDD.md`](docs/TDD.md)，浮层层级约定 [`docs/z-index.md`](docs/z-index.md)。

## 八、目录结构

```
Focus_Lab/
├── api/               # Vercel Serverless Functions（9 个 AI 代理端点 + _shared 外壳）
├── electron/          # 桌面版主进程、preload、托盘与自动更新
├── public/            # 原样拷贝的静态资源（PWA、Draco 解码器、图标）
├── docs/              # 项目文档，索引见 docs/README.md
├── scripts/           # 辅助脚本（桌面版启动器、截图、示例数据、git→Notion 日志器）
├── .tmp/              # 本地临时产物（截图、生成的示例备份），已 gitignore
├── src/
│   ├── pages/         # 各功能页面，一页一目录（含同名 .css 与局部逻辑）
│   ├── components/    # 跨页复用组件（layout / ui / todo / focus / search / privacy …）
│   ├── context/       # 全局 Context Provider（任务、专注、奖励、情景、主题、语言、功能开关）
│   ├── hooks/         # 自定义 hooks（focus / task / session / scenario / desktop / common …）
│   ├── utils/         # 纯逻辑（ai / task / scenario / storage / analytics / privacy …）
│   ├── data/          # 静态配置数据（生态缸鱼种、伙伴、标本）
│   ├── assets/        # 被代码 import、打进 bundle 的资源（3D 模型等）
│   ├── i18n/          # 中英文案
│   ├── pet/           # 桌宠悬浮窗渲染入口（pet.html）
│   ├── flood/         # 屏幕底部「积水」层渲染入口（flood.html）
│   ├── routes/        # 路由表与懒加载装配
│   ├── styles/        # 全局样式与设计 token
│   ├── AppProviders.jsx  # Context 装配（数组顺序即嵌套层级）
│   └── App.jsx
└── src/_deprecated/   # 已下线但留档的功能（不参与打包，见其 README）
```

`pet.html` / `flood.html` 刻意不复用 `index.html`——一个只要一只 SVG 烧瓶、一个只要一块
canvas，都不该把路由 / Context / three.js 再跑一遍。

## 九、开发约定

- **测试优先**：核心纯逻辑要有单测保护，覆盖率只涨不跌（[`docs/TDD.md`](docs/TDD.md)）。
  提交前 `.githooks/pre-commit` 会自动跑 `vitest run`。
- **封装要克制**：只抽取真正重复 / 多职责的代码，已达标的页面不为拆而拆。
- **状态持久化**：全局状态经 `useLocalStorage` 落到 `localStorage`，key 集中登记在
  `src/utils/storage/storageKeys.js`；配额将满时有警报（`quotaAlert.js`）。
- **已拍板的取舍**：动某个功能前先读 [`docs/claude-memory/`](docs/claude-memory/README.md)
  里对应那篇，别推翻重来。协作约定见根目录 [`CLAUDE.md`](CLAUDE.md)。
