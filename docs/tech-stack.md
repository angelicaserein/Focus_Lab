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
| @anthropic-ai/sdk | Claude API 客户端 |
| 模型 | claude-haiku-4-5-20251001 |

三种运行模式自动切换（见 `src/utils/aiChat.js`）：
1. **生产（Vercel）** → 调用 `/api/chat` 服务端代理，API key 不暴露给浏览器
2. **本地 + 有 `VITE_ANTHROPIC_API_KEY`** → 直接调用 SDK（`dangerouslyAllowBrowser`）
3. **本地 + 无 key** → 轮换 6 条预设 ADHD 鼓励回复

System prompt：温柔、简洁的 ADHD 专注陪伴助手，每次 ≤2 句中文。

## 状态管理

纯 **React Context + useState**，无第三方状态库。

Context 嵌套顺序（从外到内）：

```
RewardProvider → FocusProvider → TodoProvider → ScenarioProvider → App
```

所有状态通过 `useLocalStorage` hook **持久化到 localStorage**：

| key | 内容 |
|-----|------|
| `coins_v1` | 金币余额 |
| `focus_records_v1` | 专注记录 |
| `todos_v1` | 任务列表 |
| `scenarios_v1` | 情景配置 |
| `focus_chat_v1` | AI 对话历史 |
| `focus_notes_v1` | 专注随记 |
| `focus_distractions_v1` | 分心记录 |

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

使用 `React.lazy` + `Suspense` 懒加载所有页面：

| 路径 | 页面 |
|------|------|
| `/` | Home（热力图 + 今日概览） |
| `/focus` | 专注控制台（含沉浸模式） |
| `/history` | 历史记录与统计 |
| `/scenario` | 情景管理 |
| `/scenario-stats` | 情景数据统计 |
| `/reward` | 奖励商店 |
| `/settings` | 设置 |
| `/research` | 研究记录 |

## 工具链

| 工具 | 用途 |
|------|------|
| Playwright | E2E 测试 / 截图验证 |
| scripts/git-notion-logger | 将 git commit 同步至 Notion（`npm run journal`） |
| Vercel | 生产部署（推断自 `/api/chat` 代理路径） |

## 样式

纯 **CSS**，无 CSS-in-JS 或预处理器。按模块拆分：
- `src/styles/` — 全局、侧栏、Todo、Scenario、Toast
- `src/theme.css` — 设计 token（颜色、间距）
- 各页面同目录 `.css` — 局部样式
