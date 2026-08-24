# Claude 记忆索引

这些文件原本存在本机的 `~/.claude/projects/<项目>/memory/`（只在这台机器生效），现已复制进仓库，跟着 git 走。
根目录的 [`CLAUDE.md`](../../CLAUDE.md) 是会被自动加载的规则文件；本目录是它的详细出处。

## 工作方式（硬约束）

- [回复要用中文 / 不问是否跑 dev](user-language-and-dev.md) — 全程简体中文；用户常驻 `npm run dev`，别再问「要不要运行/验证」
- [回复要极简](concise-output-style.md) — 先给答案/动作，省铺垫，能一句别写三句；只留决策/状态/阻塞
- [封装要克制](no-over-encapsulation.md) — 只抽真有问题的（重复/多职责/内联 renderX），已达标页面别再拆
- [AI 调用三模式约定](ai-three-mode-pattern.md) — 新增 AI 功能照搬 prod 代理 / dev+key SDK / 无 key 示例 的分流
- [数字方向已反转](adhd-no-judgmental-numbers.md) — 2026-07-09 起改回「要显示数字」，旧的去评判数字/质化措辞准则作废

## 项目与功能现状

- [FocusLab 项目背景](focuslab-project.md) — ADHD 参与式设计研究，RQ2=GenAI 整合是创新点，数据收集等伦理批准
- [人生 RPG 游戏化](rpg-gamification.md) — 角色卡+经验条已落地，两套皮肤待选，含结算卡/技能树/AI GM 路线图
- [二游·伙伴与祈愿](nijigen-companion-wish.md) — 借二游皮不抄钩子；无损祈愿/图鉴/世界地图已落地。2026-08-04 灯灯角色形象已删→换无名抽象暖光，系统保留，别再加回灯灯
- [生态缸收集页](aquarium-collectible.md) — /aquarium 金币换鱼、跃出收集卡、活水缸游动；复用祈愿无损抽取
- [功能树](function-tree.md) — /functiontree 每个节点是功能开关，关掉即隐去且不可达；独立新页，不动技能树
- [任务库 /tasks](flow-tasks-page.md) — 2026-08-24 起只剩一种卡片流排布：表格视图/视图切换、分库标签与新建库、属性增删编辑器全删；勾完成平滑沉到已完成堆末尾，落位冻结只留给改属性
- [专注页 3D 性能](focus-perf-3d.md) — 卡顿主因是沉浸层 three.js 伙伴；模型 Draco 压到 1.18MB+解码器自托管(墙内)，剩 442KB 余量
- [专注会话 sessionId](focus-session-id.md) — 重置保留 sessionId（已拍板）；两个同名 sessionStart 不是一回事，易误判
