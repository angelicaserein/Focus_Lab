---
name: ai-three-mode-pattern
description: FocusLab 里所有 AI 调用都用同一套三模式分流，新增 AI 功能照搬
metadata: 
  node_type: memory
  type: reference
  originSessionId: 94bad98b-2be1-4cf8-9f82-e714e678708a
---

FocusLab 调 Claude 的约定（见 src/utils/aiChat.js、src/utils/aiTasks.js，及 api/*.mjs 代理）：

三模式自动切换，靠 `import.meta.env`：
1. **生产环境**（`import.meta.env.PROD`）→ `fetch("/api/<name>")` 调 Vercel serverless 代理，API key 在服务器侧（`process.env.ANTHROPIC_API_KEY`）。
2. **本地 dev + 有 `VITE_ANTHROPIC_API_KEY`** → 浏览器直连 `@anthropic-ai/sdk`（`dangerouslyAllowBrowser:true`）。
3. **本地 dev 无 key** → 返回示例/占位结果，保证离线也能跑通 UI。

模型统一 `claude-haiku-4-5-20251001`。每加一个 AI 功能就在 `api/` 加一个对应 `.mjs` 代理（镜像 api/chat.mjs）。已有代理：chat / extract-tasks / recommend / **tone**（2026-07-05 新增，`api/tone.mjs`+`src/utils/ai/aiTone.js`，角色卡语气包生成，见 [[adhd-no-judgmental-numbers]]）。

**Why:** key 不能进浏览器 bundle；离线示例让没有 key 的人也能演示/开发。
**How to apply:** 新 AI 功能直接复制这套分流骨架，别只写 SDK 直连。后续可抽成通用 `callAi(mode,payload)`。关联 [[focuslab-project]] 的 RQ2。


**2026-08-24**：`tone` 代理已删除（`api/tone.mjs` + `src/utils/ai/aiTone.js` 随角色语气功能一起移除）。
