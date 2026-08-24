# CLAUDE.md

写这个仓库的代码前先读这里。详细出处在 [`docs/claude-memory/`](docs/claude-memory/README.md)，本文是被自动加载的那份。

## 沟通

- **全程简体中文**，不夹日语/英语（[出处](docs/claude-memory/user-language-and-dev.md)）。
- **极简**：先给答案/动作，省铺垫，能一句别写三句；只留决策、状态、阻塞（[出处](docs/claude-memory/concise-output-style.md)）。
- 用户自己一直挂着 `npm run dev`，**不要问「要不要跑 dev / 要不要验证」**，改完直接说改了什么。

## 写代码

- **封装要克制**：只抽真有问题的地方（重复逻辑、多职责、内联 `renderX`）；已经达标的页面别再拆组件（[出处](docs/claude-memory/no-over-encapsulation.md)）。
- **AI 功能走三模式分流**：prod 走服务端代理 / dev + key 走 SDK / 无 key 走示例数据。新增 AI 功能照搬现有形状，别自创第四种（[出处](docs/claude-memory/ai-three-mode-pattern.md)）。
- **可以显示数字**：等级序号、进度分母、连续天数、达成率都能直接渲染；早期「去评判数字、强制质化措辞」的准则 2026-07-09 起已作废，AI 叙事 prompt 也已放开（但保留不催促/不施压/不评判的语气）（[出处](docs/claude-memory/adhd-no-judgmental-numbers.md)）。

## 项目背景

FocusLab 是面向 ADHD 的参与式设计研究项目，RQ2（GenAI 整合）是创新点，涉及数据收集与伦理批准。见 [项目背景](docs/claude-memory/focuslab-project.md)。

## 各功能的已拍板结论

动到下面这些之前先读对应文件，里面是已经定过的取舍，别推翻重来：

| 领域 | 要点 |
| --- | --- |
| [人生 RPG 游戏化](docs/claude-memory/rpg-gamification.md) | 角色卡+经验条已落地；两套皮肤待选；结算卡/技能树/AI GM 路线图 |
| [二游·伙伴与祈愿](docs/claude-memory/nijigen-companion-wish.md) | 借二游皮不抄钩子；无损祈愿/图鉴/世界地图已落地；**灯灯形象已删，别再加回** |
| [生态缸收集页](docs/claude-memory/aquarium-collectible.md) | `/aquarium` 金币换鱼、跃出收集卡、活水缸游动，复用祈愿无损抽取 |
| [功能树](docs/claude-memory/function-tree.md) | `/functiontree` 每个节点是功能开关，关掉即隐去且不可达；独立页，不动技能树 |
| [任务库](docs/claude-memory/flow-tasks-page.md) | `/tasks` 只剩一种卡片流排布，表格视图 / 分库 tab / 属性增删都已删；勾完成平滑沉底，落位冻结只留给改属性 |
| [专注页 3D 性能](docs/claude-memory/focus-perf-3d.md) | 卡顿主因是沉浸层 three.js 伙伴；模型 Draco 压到 1.18MB + 解码器自托管（墙内），剩 442KB 余量 |
| [专注会话 sessionId](docs/claude-memory/focus-session-id.md) | 重置保留 sessionId（已拍板）；两个同名 `sessionStart` 不是一回事 |

## 其他文档

- [技术栈](docs/tech-stack.md) · [TDD](docs/TDD.md) · [桌面版](docs/desktop.md) · [z-index 分层](docs/z-index.md)
