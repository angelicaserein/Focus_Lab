# ADHD Focus Lab — 技术栈总览

## 核心框架

| 层次 | 技术 | 版本 |
|------|------|------|
| UI 框架 | React | 18.2 |
| 路由 | React Router DOM | ^6.30 |
| 构建工具 | Vite | ^5.0 |
| 语言 | JavaScript (JSX) | — |

## 3D / 沉浸式

| 技术 | 说明 |
|------|------|
| Three.js | WebGL 渲染底层 |
| @react-three/fiber | React 的 Three.js 渲染器 |
| @react-three/drei | 常用 3D 工具集（Controls、Text、环境贴图等） |

沉浸专注模式（`ImmersiveView`）全屏渲染 Pusheen 3D 场景，可拖动液态玻璃信息卡叠加在 Canvas 上方。

## AI 对话

| 技术 | 说明 |
|------|------|
| openai（SDK） | AI 端点的客户端 |
| 环境变量 | `VITE_OPENAI_API_KEY` |
| 模型 | 由各服务端端点指定（如 `api/chat.mjs`），不写死在前端 |

三种运行模式自动切换（见 `src/utils/ai/aiChat.js` 与 `src/utils/ai/aiClient.js`）：
1. **生产（Vercel）** → 调用 `api/*.mjs` 服务端代理，API key 不暴露给浏览器
2. **本地 + 有 `VITE_OPENAI_API_KEY`** → 直接调用 SDK（`dangerouslyAllowBrowser`）
3. **本地 + 无 key** → 轮换预设 ADHD 鼓励回复

服务端端点：`chat`、`narrate`、`recommend`、`tone`、`extract-tasks`、
`assign-matrix`、`scenario-config`（均在 `api/`）。

System prompt：温柔、简洁的 ADHD 专注陪伴助手，每次 ≤2 句中文。

## 状态管理

纯 **React Context + useState**，无第三方状态库。

Context 嵌套顺序在 `src/AppProviders.jsx` 的 `providers` 数组中声明（数组顺序即
嵌套层级，越靠前越外层）。当前（从外到内）：

```
LanguageProvider → ThemeProvider → RewardProvider → FocusProvider → ActivityProvider
→ DatabaseProvider → TodoProvider → ScenarioProvider → DDLProvider → FeatureProvider
```

所有状态通过 `useLocalStorage` hook **持久化到 localStorage**。全部 key 集中登记在
[`src/utils/storage/storageKeys.js`](../src/utils/storage/storageKeys.js) 的 `STORAGE_KEYS`
（业务数据、专注会话、奖励、功能/技能树、任务 database、偏好设置、DDL 等），
带 `_v1` 版本后缀，请以该文件为准，勿在文档里另抄一份。

## 自定义 Hooks

| Hook | 职责 |
|------|------|
| `useFocusTimer` | 计时器（start / pause / reset / clearSession / getSession） |
| `useFocusChat` | AI 对话消息管理 |
| `useDraggable` | RAF-based 指针拖拽 |
| `useLocalStorage` | JSON 序列化的 localStorage 封装 |
| `useUndoDelete` | 带撤销的删除队列 |
| `usePrefs` | 用户偏好设置 |

## 页面路由

使用 `React.lazy` + `Suspense` 懒加载所有页面，首屏渲染后趁空闲预取其余 chunk。
完整路由表（含哪些是 `core` 核心页、哪些是可被「功能树」关闭的功能）以
[`src/routes/AppRoutes.jsx`](../src/routes/AppRoutes.jsx) 的 `ROUTES` 数组为准。

核心页（始终可达）：`/`（Home）、`/settings`、`/functiontree`、`/tutorial`。
其余为可开关功能，例如 `/focus`、`/tasks`、`/gantt`、`/character`、`/reward`、
`/scenario`、`/calendar` 等——被功能树关掉时直接访问会弹回主页。

## 工具链

| 工具 | 用途 |
|------|------|
| Playwright | E2E 测试 / 截图验证 |
| scripts/git-notion-logger | 将 git commit 同步至 Notion（`npm run journal`） |
| Vercel | 生产部署（推断自 `/api/chat` 代理路径） |

## 样式

纯 **CSS**，无 CSS-in-JS 或预处理器。按模块拆分：
- `src/styles/` — 全局、侧栏、Todo、Scenario、Toast 等
- `src/styles/theme.css` — 设计 token（颜色、间距、明暗主题）
- 各页面同目录 `.css` — 局部样式
