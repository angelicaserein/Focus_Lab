---
name: focus-session-id
description: 「重置」保留 sessionId 的决策；两个 session 起始时间不是一回事，别搞混
metadata: 
  node_type: memory
  type: project
  originSessionId: c842c086-370a-4010-8a87-b107147353ef
---

2026-07-16 拍板：专注页「重置」按钮**保留 sessionId**，维持原行为。因为「重置」和
「结束专注」是两个按钮，后者才负责结束会话（走 `clearSession` 清 sessionId），
所以重置的语义是「这次没完，只是计时重来」——重置前后结算的任务在 History 里
仍归为同一张「一次专注」卡。

**易混点（我曾据此误报过 bug）**：代码里有两个「会话起始时间」，同名不同物——

- `useFocusTimer` 内部的 `sessionStartRef`：`resetTimer` 会清它，用于结算时反推
  `startedAt`。清它是对的。
- `Focus/index.jsx` 的 `sessionStartTs` state：筛「本次」随记/分心用，只由
  `handleStart`/`handleStop` 管，`resetTimer` **碰不到**。所以点重置不会弄丢随记。

**Why:** 这个决策在 `待办/重构验证清单.md` 里悬了很久，用户看不懂选项差异；结论和
理由已写进 `useFocusTimer.js` 的 `resetTimer()` 注释，但两处 sessionStart 的区别
极易再次误判。

**How to apply:** 再有人问「重置要不要清 sessionId」，答案是不清。碰专注会话相关
逻辑前，先分清这两个 sessionStart 各归谁管。相关：[[flow-tasks-page]]

`待办/` 目录在 .gitignore 里，是用户本地私人草稿，不进版本库——别试图提交它。
