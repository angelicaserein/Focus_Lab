---
name: flow-tasks-page
description: 任务库 /tasks 只剩一种卡片流排布，表格视图与分库/属性增删已删
metadata: 
  node_type: memory
  type: project
  originSessionId: 64a305f2-d932-487e-9f04-530bd782046b
  modified: 2026-08-24T00:00:00.000Z
---

2026-08-03：原独立页 `/flow-tasks` 合并进任务库 `/tasks`；`/flow-tasks` 路由只剩重定向，侧栏与功能树的独立入口、`nav.flowtasks` 文案都已删。

**2026-08-24 二次收敛（用户拍板）：只留一种排布，别再提「心流」这个名字。**已删：表格视图（`TasksTable.jsx` / `TodoRow.jsx`）、视图切换按钮与 `tasks.view` localStorage、分库标签条与新建库（`DatabaseTabs` / `DatabaseCreateDialog`）、属性增删改编辑器（`AttrHeaderEditor` / `AttrOptionsEditor`）。页面就是默认库 + 默认那几个属性，不给用户增减。

**Why:** 两页两视图职责重叠；表格 + 分库 + 自定义属性是「先配置再干活」的负担，与 ADHD 用户「打开就做」相反。

**How to apply:**
- 文件都在 [src/pages/Tasks/](../../../src/pages/Tasks/)：`index.jsx` 是壳（标题/工具栏/倒脑子/排截止日），`FlowView.jsx` + `TaskCard.jsx` + `taskFlowUtils.js` + `FlowView.css` 是唯一排布，`cells/` 是属性单元格（卡片里也在用，别删）。搜索/筛选/排序/情景筛选走 `useVisibleTasks()`。
- `DatabaseContext` **保留**（数据模型仍有 databaseId 与 taskAttrs，别的页面在读），只是没有增删库/增删属性的 UI 入口了。
- 「卡片乱跳」的解法是 `stickyBuckets()`：已露面的任务沿用上次落位，**改属性**不当场换堆，只有换筛选或点「整理一下」才重排。hero 同理定住，只在被完成/删除/筛掉或点「换一个」时换人。有单测。
- 勾完成不原地划掉：卡片就地收起（`.fc-slot` grid-template-rows 1fr→0fr）→ 300ms 后 `settle(id, done)` 落到「已完成」堆末尾；取消勾浮回原处。删除走同一条路。
- 「去专注」走 `addFocusTodo(id)` + `navigate("/focus")`，任务带过去就是选中态。
- `src/components/todo/TodoApp.jsx` 一族是死代码；`EisenhowerMatrix` 仍被专注页用着，别一起删。
- 与 [[adhd-no-judgmental-numbers]] 一致：进度用「已完成 N/总数」这类具体数字。
