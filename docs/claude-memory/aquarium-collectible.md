---
name: aquarium-collectible
description: 生态缸收集页——金币换鱼、跃出收集卡、潜回缸游动；复用祈愿无损抽取
metadata: 
  node_type: memory
  type: project
  originSessionId: a791cd6e-6da4-4174-913e-f1654cb83329
  modified: 2026-07-21T05:02:05.730Z
---

`/aquarium` 生态缸页（2026-07-21 落地）：水主题收集品，从"番茄钟即时反馈"讨论收敛而来。

**核心决策**：
- **金币换鱼，不是专注就送**——用户明确要求走消费而非奖励（接 `useReward().spendCoins`，一条 `FISH_COST=25`）。
- **无损抽取**：照搬祈愿（[[nijigen-companion-wish]]）的 `drawFish` 每次必出没见过的物种，按稀有度加权；全部入住后停售（不做净亏）。
- **活水缸**：canvas 画的缸里，已收集物种一直慢游；买到新鱼时 `AquariumTank` 的命令式 ref（reveal→顶点弹收集卡→dive 潜回）播放动画。配色全派生自主题 `--accent-rgb`，跟随皮肤/暗夜。

**关键点**：
- 独立新页，符合[[no-over-encapsulation]]——是全新功能不是拆已有页。
- 收集卡的"跃出展示→归档→潜回"这套过渡是用户点名要的，别简化掉。
- 数据/图形分离：canvas 手绘（AquariumTank）与图鉴 SVG（FishGlyph）是两套造型，勿误以为重复。
- 与人生 RPG（[[rpg-gamification]]）同属游戏化线。

**待定方向**：物种只 8 种（金币 sink 偏短）、缸满 8 只可能挤、稀有度可换星星、可加"第 N 次专注"小字、缸形还能试圆肚鱼缸。
