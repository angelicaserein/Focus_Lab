# docs 索引

## 开发约定（写代码前看）

| 文件 | 内容 |
| --- | --- |
| [tech-stack.md](tech-stack.md) | 技术栈与目录约定 |
| [TDD.md](TDD.md) | 测试怎么写、跑什么命令 |
| [test-edge-cases.md](test-edge-cases.md) | 手写的边界情况清单，用来对照 AI 生成的测试 |
| [desktop.md](desktop.md) | Electron 桌面版（主窗 / 桌宠窗 / 积水窗）架构 |
| [z-index.md](z-index.md) | 全局 z-index 分层表 |

## 已拍板的功能结论

[claude-memory/](claude-memory/README.md) —— 每个功能领域一份，记的是**已经定过的取舍**，
动对应功能前先读，别推翻重来。根目录 `CLAUDE.md` 是它的摘要版（两边都要改）。

## 过程材料（研究用，不影响代码）

- [iteration-history/](iteration-history/) —— 功能点迭代表、需求演变史、多端形态开发史、
  提交时间轴、尼尔森启发式体检，以及 6.13–7.9 的工作日志。
- [prototypes/](prototypes/) —— 单页原型稿（专注瓶 / 生态缸、收集品四种手感）。
- `screenshots/` —— 论文用的历史版本截图存档，近 100MB，**不进版本库**（见 `.gitignore`）。

## 不在 docs 里的东西

- 本地临时产物（截图、`npm run data:example` 生成的示例备份）统一落在根目录 `.tmp/`，已忽略。
- 论文稿件在 `paper/`、本地待办在 `待办/`，都不进版本库。
