# z-index 层级表

现状盘点（未改任何数值）。目的是先把「谁该压谁」写下来，改数字放到单独一轮。

## 1. 全局层带（建议约定）

| 层带 | 区间 | 含义 |
| --- | --- | --- |
| 页内 | 0–99 | 页面内部堆叠：表头吸顶、卡片、装饰。不跨组件。 |
| 页内浮层 | 100–399 | 依附某个元素的 popup / 下拉，`position: absolute`，随页面滚动。 |
| 角落挂件 | 400–899 | 调试面板、悬浮按钮等常驻小挂件，允许被侧栏和弹窗盖住。 |
| 导航 | 900–1099 | 侧边栏及其遮罩、把手。 |
| 模态 | 1100–1999 | 全屏 backdrop + 弹窗，必须盖住侧栏。 |
| 沉浸 | 2000–2499 | 专注沉浸层及其内部控件。 |
| 沉浸之上 | 2500–2999 | 仪式启动等要压住沉浸层的过场。 |
| 系统提示 | 9000+ | toast、分心弹窗这类任何时候都得看得见的东西。 |

## 2. 实际取值

### 导航（`src/styles/sidebar.css`）

| 值 | 选择器 | 作用域 | 行 |
| --- | --- | --- | --- |
| 990 | `.sidebar-hover-zone` | `min-width: 601px` | [sidebar.css:339](../src/styles/sidebar.css#L339) |
| 998 | `.sidebar-backdrop` | `max-width: 600px` | [sidebar.css:475](../src/styles/sidebar.css#L475) |
| 999 | `.sidebar` | **全局** | [sidebar.css:14](../src/styles/sidebar.css#L14) |
| 1000 | `.sidebar-launcher` | `min-width: 601px` | [sidebar.css:350](../src/styles/sidebar.css#L350) |
| 1001 | `.sidebar-toggle` | `max-width: 600px` | [sidebar.css:445](../src/styles/sidebar.css#L445) |

`.sidebar` 的 999 是无条件生效的 —— 这条是下面所有冲突判断的基准线。

### 全屏模态（`position: fixed; inset: 0`）

| 值 | 选择器 | 文件 |
| --- | --- | --- |
| 1000 | `.ddl-modal-overlay` | [DDLReminderModal.css:6](../src/components/ddl/DDLReminderModal.css#L6) |
| 1000 | `.gantt-modal-backdrop` | [Gantt.css:386](../src/pages/Gantt/Gantt.css#L386) |
| 1000 | `.srewards-backdrop` | [SessionRewardCard.css:6](../src/pages/Focus/SessionRewardCard.css#L6) |
| 1000 | `.reward-debug-overlay` | [Reward.css:42](../src/pages/Reward/Reward.css#L42) |
| 1050 | `.rtd-overlay` | [RandomTaskDrawer.css:14](../src/pages/Focus/RandomTaskDrawer.css#L14) |
| 1100 | `.wish-reveal` | [Wish.css:208](../src/pages/Wish/Wish.css#L208) |
| 1101 | `.wish-result-backdrop` | [Wish.css:233](../src/pages/Wish/Wish.css#L233) |
| 9999 | `.ait-backdrop` | [AiTaskModal.css:5](../src/pages/Memo/AiTaskModal.css#L5) |
| 9999 | `.distraction-modal-backdrop` | [DistractionModal.css:5](../src/pages/Focus/DistractionModal.css#L5) |

### 沉浸层（专注页）

| 值 | 选择器 | 文件 |
| --- | --- | --- |
| 2000 | `.immersive-overlay` | [FocusImmersive.css:5](../src/pages/Focus/FocusImmersive.css#L5) |
| 2000 | `.immersive-loading`（懒加载兜底） | [Focus.css:516](../src/pages/Focus/Focus.css#L516) |
| 2001 | `.immersive-fullscreen-btn` | [ImmersiveFullscreen.css:6](../src/pages/Focus/Immersive/ImmersiveFullscreen.css#L6) |
| 2001 | `.immersive-utils` | [ImmersiveUtils.css:6](../src/pages/Focus/Immersive/ImmersiveUtils.css#L6) |
| 2001 | `.immersive-chat` | [ImmersiveChat.css:10](../src/pages/Focus/Immersive/ImmersiveChat.css#L10) |
| 2001 | `.immersive-card-reopen` | [ImmersiveCard.css:110](../src/pages/Focus/Immersive/ImmersiveCard.css#L110) |
| 2002 | `.immersive-tweaks`（调试） | [DebugTweaks.css:7](../src/pages/Focus/DebugTweaks.css#L7) |
| 2500 | `.ritual-overlay` | [RitualLaunch.css:8](../src/pages/Focus/RitualLaunch.css#L8) |

2001 那一组是 `.immersive-overlay` 内部的 `absolute` 子元素，只跟同层兄弟比大小，不与页面其他部分竞争。

### 系统提示

| 值 | 选择器 | 文件 |
| --- | --- | --- |
| 1000 | `.toast` | [toast.css:7](../src/styles/toast.css#L7) |
| 10000 | `.distraction-undo-toast` | [toast.css:61](../src/styles/toast.css#L61) |

### 页内浮层 / 页内堆叠（不跨组件，仅登记）

`.attr-popup` / `.cell-popup` 200、`.attr-editor` 300（[Tasks.css](../src/pages/Tasks/Tasks.css#L870)）、
`.ddl-debug-wrap` 200（[DDLReminders.css:469](../src/pages/DDLReminders/DDLReminders.css#L469)）、
EisenhowerMatrix 的 20/30/60/70/200!important、Calendar 1–5、Gantt 0–2、Aquarium 1/30/60、
Memo 50/60、Tasks 2/3/60、EmojiPicker 30、Flasks 2、Companion 2。

## 3. 已知问题

1. ~~**`.rtd-overlay` = 300 < `.sidebar` = 999。**~~ **已修（2026-08-11）：300 → 1050。**
   随机任务抽屉是全屏 `fixed` 遮罩却排在侧栏下面，桌面端侧栏常驻时遮罩盖不住导航，用户能穿过遮罩点到侧栏。
   这是层级表里唯一一处当前就成立的错位，故单独修掉；其余几条只登记不动。
2. **1000 挤了五个不同语义的东西**：侧栏把手、四种模态 backdrop、toast 全都是 1000。
   同值靠 DOM 顺序决胜负 —— 现在没炸，但任何一次挂载顺序的改动都可能悄悄翻转。
3. **9999 / 10000 是逃逸值**，不是层级。AiTaskModal 和 DistractionModal 用 9999 只是为了「一定在最上面」；
   撤回 toast 又不得不用 10000 压过它们（注释已写明是为了压住 2000+ 的沉浸层）。
4. **`.ddl-debug-wrap` 200 是 `fixed`**，会被侧栏(999)盖住。调试面板在右下角，实际不重叠，属于潜在而非现症。

## 4. 修的时候

按上面的层带把值收敛成一组 CSS 变量（`--z-nav` / `--z-modal` / `--z-immersive` / `--z-toast` …），
一次一层带地换，每换一层带手动过一遍对应页面。重排层叠上下文容易静默出错，别一把梭。
