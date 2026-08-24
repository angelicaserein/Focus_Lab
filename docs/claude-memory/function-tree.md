---
name: function-tree
description: 功能树页面——每个节点是功能开关，关掉即从侧边栏隐去且路由不可达，随时可再开
metadata: 
  node_type: memory
  type: project
  originSessionId: 38e23b51-0284-4371-a71c-2f4cd2ac7890
---

新增 `/functiontree` 页面（`src/pages/FunctionTree/`）：一棵「设置」形态的树，三条分支复用侧边栏分区（每日/回顾/工具），每个叶子节点是一个功能开关，点一下关掉、再点打开，随时可逆。

- 开关状态由 `FeatureContext`（`src/context/FeatureContext.jsx`）统一持有（存 `DISABLED_FEATURES`）；Sidebar 过滤隐去被关功能，`AppRoutes` 的 `FeatureGate` 让被关路由直接访问时弹回主页。
- 核心功能 `CORE_PATHS` 只留最小兜底集（主页/设置/功能树本身）永不可关，保证总有回去打开的入口；技能树等其余功能都可关。
- 关功能只影响导航可见性与可达性，**不删任何数据**——契合 [[adhd-no-judgmental-numbers]] 的减负思路（让用户自己决定屏幕上留多少东西）。

**Why:** 用户 2026-07-07 提出把 skill tree 改成 function tree。
**How to apply:** 决策是「新做独立页面，不替换技能树、保留成长星图」——技能树页（constellation + 天赋树）原样保留，别去动它。新增可开关功能时，往 `functionTreeData.js` 对应分支加一项即可（path 复用路由、label 复用 `nav.*`）。
