# TDD 约定

FocusLab 的测试流程与规范。目标：核心**纯逻辑**受测试保护，重构/封装时红绿灯即时反馈，覆盖率只涨不跌。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm test` | 跑一遍全部单测（CI / 提交前用） |
| `npm run test:watch` | 开发时常驻，改代码即时反馈 |
| `npm run test:cov` | 出覆盖率报告（`coverage/index.html`），校验阈值 |

## 红-绿-重构循环

1. **红**：先写一个会失败的测试，描述你要的行为。
2. **绿**：写最少的代码让它过。
3. **重构**：在测试保护下清理实现，测试保持绿。

`test:watch` 常驻着做这个循环最顺。

## 本仓的核心范式：抽出纯函数再测

组件、three.js、带 DOM/定时器的 hook **不做单测**——成本高、脆。
做法是把可判定的逻辑从 hook/组件里抽成**纯函数**，对纯函数做单测。仓库里已有先例：

- `useFocusTimer.js` 抽出 `calcSeconds(accSecs, runStart, now)` → `useFocusTimer.test.js`
- `useDistractionTracking.js` 抽出 `reducer` / `initialPhaseState` → 对 reducer 做单测
- `useFlaskFullNotify.js` 抽出 `shouldFireFlaskFull(...)` → 判定函数单测
- `utils/ai/aiTasks.js` 的 `parseTasksJson` / `sanitizeTaskAttrs` 等纯解析函数

新写逻辑时，先问："这段判断/换算/解析能不能不依赖 React、DOM、网络？" 能就抽出去，然后 TDD。

## 放哪、叫什么

- 测试文件与被测文件同目录，命名 `<name>.test.js`。
- 用 `@/` 别名 import（`import { calcSeconds } from "@/hooks/focus/useFocusTimer"`）。
- `describe` / `it` 描述用中文，讲清"什么情况下期望什么"，和现有测试一致。
- 默认 node 环境。要测组件时，在测试文件顶部加 `// @vitest-environment jsdom` 并 `npm i -D jsdom`。

## 覆盖率门槛

- 只 gate 纯逻辑层 `src/utils/**`（配置见 `vite.config.js` 的 `test.coverage`）。
- 阈值是"只涨不跌"的地板线，不是目标。补了测试、`npm run test:cov` 数字上去后，
  就把 `vite.config.js` 里的 thresholds 往上调，锁住成果。
- UI/three/JSX 组件不计入覆盖率，别为凑数字给它们硬写脆测试。

## 提交前钩子

`.githooks/pre-commit` 会在每次 `git commit` 前跑 `npm test`，红灯挡提交。
钩子随仓库走，`npm install` 时经 `prepare` 脚本自动启用（`git config core.hooksPath .githooks`）。
应急跳过：`git commit --no-verify`（别常态化）。
