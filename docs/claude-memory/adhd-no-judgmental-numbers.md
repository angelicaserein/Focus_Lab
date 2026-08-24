---
name: adhd-no-judgmental-numbers
description: 方向已反转——游戏化 UI 现在要显示数字（Lv/分母/连续天数等），不再强制质化措辞
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c676da91-7e6e-4cd1-ae46-e20085559ba7
---

**2026-07-09 方向反转：现在要显示数字了。** 之前的准则（游戏化 UI 不显示 Lv.N / X-of-Y 分母 / 达成率 / 排名 / 连续天数 KPI，一律改质化措辞）**已作废**——用户明确表示「不要这个，现在需要数字了」。

给角色卡 / 结算卡 / 首页 / 任何游戏化面板加指标时，**可以直接渲染数字**（等级序号、进度分母、连续天数、达成率等），不必再强制走 `charView.js` 的质化 helper。

**历史背景（现已不适用）**：项目早期出于 ADHD 参与式研究考虑刻意去掉「评判类数字」，用质化措辞（`src/pages/Character/charView.js` 的 `growthStageText` / `momentumText` 等）+ AI 语气重写（设置页「角色语气」，见 [[rpg-gamification]]）。这套代码仍在，但不再是硬约束。

**2026-07-15 跟进：AI 叙事 prompt 已改为允许数字。** 之前 `aiTone.js`、`aiNarrate.js`（三个 persona）及 prod 侧 `api/narrate.mjs` 的 system prompt 都硬写「不要罗列数字 / NEVER include numbers / 不报还差多少」，与本方向冲突，现已全部放开——改成「可自然带入具体数字（时长/连续天数/产量），但别堆成数据清单」，同时保留「不催促/不施压/不评判」的鼓励语气（这条不在作废范围）。`api/tone.mjs` 用前端传入的 system，故 aiTone 一处即覆盖 prod。

**Why:** 用户改变了产品方向。这是明确指令，覆盖之前的偏好。
**How to apply:** 新增游戏化指标时按普通产品直觉展示数字即可；如果要重新收敛到质化措辞，需用户再次确认。质化 helper 若彻底不用了可考虑清理。


**2026-08-24：角色语气功能整体删除。** 设置页「语气」tab、`ToneSection.jsx`、`useTonePack` / `tonePack.js` / `aiTone.js`、`api/tone.mjs`、`TONE_PACK` 存储键与 `settings.tone.*` 文案全部移除；角色页改回直接用 `t`。别再提「AI 语气重写」这条路径。
