# Focus Lab · ADHD 专注实验室

一个面向 ADHD 人群的参与式设计研究原型：把专注计时、任务管理、游戏化激励与
GenAI 陪伴整合进一个 React 单页应用，用来探索「AI 如何帮助 ADHD 用户维持专注」。

> 研究性质原型，非商业产品。数据全部存在浏览器 `localStorage`，不上传服务器。

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 本地开发（默认 http://localhost:5173）
npm run build      # 生产构建，产物在 dist/
npm run preview    # 本地预览生产构建
```

### 配置 AI（可选）

AI 对话开箱即用，无 key 时自动回落到预设示例回复，功能不受影响。要接真实模型：

```bash
cp .env.example .env      # 然后把 key 填进 VITE_OPENAI_API_KEY
```

AI 调用有三种模式，自动切换（详见 [`src/utils/ai/aiChat.js`](src/utils/ai/aiChat.js)）：

| 环境 | 行为 |
|------|------|
| 生产（Vercel） | 走服务端代理 `/api/*.mjs`，key 不暴露给浏览器 |
| 本地 + 有 `VITE_OPENAI_API_KEY` | 浏览器直连 SDK |
| 本地 + 无 key | 轮换预设示例回复 |

## 常用脚本

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` / `preview` | 生产构建 / 预览 |
| `npm test` | 跑全部单测（vitest，一次性） |
| `npm run test:watch` | 常驻监听测试 |
| `npm run test:cov` | 覆盖率报告（`coverage/index.html`） |
| `npm run journal` | 把 git commit 同步到 Notion（见 `scripts/git-notion-logger/`） |

## 技术栈一览

- **UI**：React 18 + React Router 6，页面全部 `React.lazy` 懒加载
- **构建**：Vite 5，路径别名 `@/` → `src/`
- **3D / 沉浸**：Three.js + @react-three/fiber / drei（Draco 压缩模型自托管于 `public/draco/`）
- **AI**：OpenAI SDK（服务端 `api/*.mjs` 代理，模型见各端点）
- **状态**：纯 React Context + `useLocalStorage`，无第三方状态库
- **样式**：原生 CSS，按模块与页面拆分，设计 token 在 `src/styles/theme.css`
- **测试**：Vitest（单测）+ Playwright（E2E / 截图验证）
- **部署**：Vercel（`api/` 为 Serverless Functions）

完整技术细节见 [`docs/tech-stack.md`](docs/tech-stack.md)，测试规范见 [`docs/TDD.md`](docs/TDD.md)。

## 目录结构

```
Focus_Lab/
├── api/               # Vercel Serverless Functions（AI 代理端点）
├── assets/            # 打包进 bundle 的资源（3D 模型等）
├── public/            # 原样拷贝的静态资源（PWA、Draco 解码器、图标）
├── docs/              # 项目文档（技术栈、TDD 约定）
├── scripts/           # 辅助脚本（git→Notion 日志器等）
├── src/
│   ├── pages/         # 各功能页面，一页一目录（含同名 .css 与局部逻辑）
│   ├── components/    # 跨页复用组件（layout / ui / todo / reminder …）
│   ├── context/       # 全局 Context Provider（状态、主题、语言、功能开关）
│   ├── hooks/         # 自定义 hooks（focus / task / session / common …）
│   ├── utils/         # 纯逻辑（ai / task / scenario / storage / analytics …）
│   ├── i18n/          # 中英文案
│   ├── routes/        # 路由表与懒加载装配
│   ├── styles/        # 全局样式与设计 token
│   ├── AppProviders.jsx  # Context 装配（数组顺序即嵌套层级）
│   └── App.jsx
└── src/_deprecated/   # 已下线但留档的功能（不参与打包，见其 README）
```

页面路由（含核心页与可开关功能）以 [`src/routes/AppRoutes.jsx`](src/routes/AppRoutes.jsx)
的 `ROUTES` 表为准——「功能树」可把非核心功能整块关闭并使其路由不可达。

## 开发约定

- **测试优先**：核心纯逻辑要有单测保护，覆盖率只涨不跌（[`docs/TDD.md`](docs/TDD.md)）。
  提交前 `.githooks/pre-commit` 会自动跑 `vitest run`。
- **封装要克制**：只抽取真正重复 / 多职责的代码，已达标的页面不为拆而拆。
- **状态持久化**：所有全局状态经 `useLocalStorage` 落到 `localStorage`，key 带 `_v1` 版本后缀。
