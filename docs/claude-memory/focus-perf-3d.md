---
name: focus-perf-3d
description: 专注页卡顿主因是沉浸层的 three.js 3D 伙伴；已做的性能收敛与剩余余量
metadata: 
  node_type: memory
  type: project
  originSessionId: e75d1461-f3a1-4d7e-b87b-d4e6395a1440
---

专注页（Vercel 部署后别人反馈「卡卡的」）的性能瓶颈是沉浸式专注遮罩里的 three.js 3D 伙伴（Pusheen "I'm busy"），[[nijigen-companion-wish]] 里的常驻伙伴是另一套 2D 立绘、不相干。

已做的优化（2026-07-07，均已落在 `src/pages/Focus/PusheenScene.jsx` / `Focus/index.jsx` / `public/draco/`）：
- **模型 16.5MB → 1.18MB**：Draco 无损压几何（`@gltf-transform/cli draco`），顶点数/包围盒/动画完全不变，画面像素级一致。这是下载侧最大头。
- **Draco 解码器自托管在 `public/draco/`**：three 自带的 wasm 版，`useGLTF(url, "./draco/")`。**绝不能用 drei 默认的 gstatic CDN——在中国大陆被墙**，用户会白屏（走 ErrorBoundary 回退文案）。
- Canvas 运行时收敛：`dpr={[1,1.5]}`（高分屏不再全量出像素）、`antialias:false`、`powerPreference:"high-performance"`、`performance.min:0.5`、关动画时 `frameloop="demand"`。
- `memo(PusheenScene)`：挡掉计时每 500ms tick 连带的 3D 场景树 reconcile。
- `ImmersiveView` 改 `React.lazy`：973KB 的 three chunk 不再打进 Focus 页 chunk、也不随路由空闲预取拉。

**剩余余量**：若还嫌卡，可用 `gltf-transform optimize --compress draco`（含 weld+simplify）把模型再压到 **442KB**，但会动几何、伙伴外形略变——参与式设计里伙伴形象要紧，当时**故意没做**，留作最后手段。

**Why**：RQ2=GenAI 整合是创新点，但基础体验（专注页能流畅跑）是地基。
**How to apply**：动这块 3D 前先想清楚 CDN 在墙内可达性；模型再压先问外形能不能变。
