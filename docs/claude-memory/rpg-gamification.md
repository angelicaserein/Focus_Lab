---
name: rpg-gamification
description: FocusLab 正在做「人生 RPG」游戏化改造，已落地角色卡+经验条，含后续路线图
metadata: 
  node_type: memory
  type: project
  originSessionId: 034c81c7-5df3-4716-ba38-ceed6bd876d3
---

用户想把 FocusLab 做成「人生 RPG」感。2026-07-04 已落地第一步：**角色卡 + 经验条**。

核心设计（全部从已有数据推导，不新增持久化字段）：
- 主 XP = 多来源加成之和：专注秒数 + 完成任务×60 + 专注天数×120 + 零分心会话×60；等级曲线二次方 `level=floor(sqrt(xp/300))`，1 级=5 分钟。UI 有「经验从哪来」拆解，让加分透明。
- 场景 Scenario → 技能线（0 经验的场景折叠成 lockedCount 提示，其余显示时长+等级）；自由探索=无场景兜底。
- 5 个固定人生属性（智力/毅力/专注力/执行力/探索）由行为信号映射，各自等级。
- 成就系统 `ACHIEVEMENTS`（9 个，含进度）；连续天数 streak；金币来自 RewardContext。
- 纯函数在 `src/utils/character/characterUtils.js`（computeCharacter/computeMetrics/computeXpBreakdown/computeAttributes/computeAchievements/computeSkills，24 单测），hook `src/hooks/character/useCharacter.js`（消费 focus/scenario/reward/todo 四 context），展示 helper `src/pages/Character/charView.js`，页面 `src/pages/Character/`（两皮肤组件），路由 `/character`，侧边栏「角色/Character」。

**待用户拍板**：页面顶部提供两套皮肤切换——`简约现代`(cm-*) 与 `像素复古`(cp-*)，用户要对比后再决定留哪套（可能删掉未选的）。

**专注结算叙事卡（2026-07-04 已落地）**：专注结束时弹居中庆祝卡。纯函数 `computeSessionReward`（characterUtils），组件 `src/pages/Focus/SessionRewardCard.jsx`，数字滚动 hook `src/hooks/common/useCountUp.js`。
- **两条结束路径都已覆盖**：①点「结束专注」→ `useSessionStop` 的 `onSessionReward`；②逐一勾完任务 → FocusPage 里 `handleSettle` 包装 `onSettle`，当某任务以 completed 收尾且清空选中集合时弹卡（清空/逐个移除等非 completed 收尾不弹）。
- **防双重计数关键**：FocusPage 用 `sessionStartRef` 在会话**开始**时（onStart）定格「结算前」角色快照（prevRecords/prevXp/prevLevel），两条路径共用 `showSessionReward`。因为逐一勾完时先完成的任务已写记录，若结束时才读会把本次时长算进 prevXp。
- **卡片已随用户的 ADHD 友好改造改为质化语言**（用户自己改的 SessionRewardCard + charView）：金币保留数字，经验/等级/连续天数改用 `growthStageText`/`growthPhraseText`/`momentumText`/`rewardGrowKey`（阶段名·成长措辞·势头词，无 Lv.N/无 X-of-Y 分母）。见 [[adhd-no-judgmental-numbers]]。

**技能树页（2026-07-05 已落地，两形态并排比较，待用户拍板）**：新页 `src/pages/SkillTree/`，路由 `/skilltree`，侧边栏「技能树」(Network 图标，Daily 区角色下方)。顶部切换两种形态（照搬角色卡「一份数据两种呈现」）：
- **成长星图 `constellation`**（`GrowthConstellation.jsx`，纯衍生、无门禁）：SVG 星图，核心=称号，内环 5 属性、外环场景技能，节点大小/连线/光晕由真实进度决定。零新增存储，契合角色卡原则。
- **可解锁技能树 `tree`**（`SkillTreeUnlock.jsx`，游戏化试验分支）：经典点技能点。3 分支×4 节点菱形（root→l/r→capstone 需前两者），前置依赖 + 天赋点门禁。数据/点数经济在 `skillTreeData.js`（`earnedTalentPoints`=BASE 3+主等级+Σ属性等级；`computeNodeStates` 返回 unlocked/available/poor/locked）。**唯一新增持久化**：已解锁节点 id 存 `STORAGE_KEYS.SKILLTREE_UNLOCKED`（用 useLocalStorage），有 Reset 全额退还。节点 perk 是主题性描述、非机械加成（原型）。
- 两形态 i18n 全在 `skilltree.*`（en+zh）。样式 `SkillTree.css`（st- 前缀，页宽同角色卡 min(1040px)，tree 舞台窄屏 `.st-tree-scroll` 横向滚动不挤压）。

**工业点数页（2026-07-05 已落地）**：用户要「学《明日方舟：终末地》的工业点数做一个」。做成纯衍生的自动化工厂总览——新页 `src/pages/Industry/`（`index.jsx` + `industryData.js` + `Industry.css`），路由 `/industry`，侧边栏「工业点数/Industry」(Factory 图标，Daily 区技能树下方)。
- 五条产线各自把行为折算成工业点数 IP：采矿=专注时长(/60)、精炼=零分心时长(/60)、装配=完成任务×5、供电=活跃天数×8、物流=场景数×12；汇成总 IP（`computeIndustry({metrics,records})`，metrics 复用 useCharacter 的 char.metrics）。发展等级 6 档（前哨→工业中枢，`INDUSTRY_TIERS`/`tierForPoints`）。节流指标：今日产出（今天专注折算）、日均产能（总/专注天数）。
- **零新增持久化**：IP 只累加、无门禁、无 X-of-Y 分母，契合角色系统 ADHD 原则。总数用 [[rpg-gamification]] 已有的 `useCountUp` 滚动。
- 视觉：HUD 主面板刻意固定深色工业控制台风（teal #2dd4bf + amber，等宽数字、蓝图网格、施工斜纹产能条），生产链卡片随主题；i18n 全在 `industry.*`(en+zh)。**只此一版，非二选一**。

**AI 游戏主持人「旅程旁白」（2026-07-05 已落地，路线图第 4 项）**：把角色真实进展交给 AI 讲成一段冒险叙事，直接服务 RQ2 的 GenAI 整合。严格照搬 [[ai-three-mode-pattern]]：
- 客户端 `src/utils/ai/aiNarrate.js`（`narrateJourney(ctx,{lang,variant})` 返回 `{text,source}`；prod→`/api/narrate`、dev+key→SDK 动态 import、无 key→`localNaration()` 本地模板兜底，zh/en 各一套、按 variant 轮换措辞，refresh 离线也能换段）；prod 代理 `api/narrate.mjs`（照 `api/recommend.mjs`）。
- 组件 `src/pages/Character/GameMasterCard.jsx` + `GameMaster.css`，挂在角色页 `index.jsx` headline 与皮肤内容之间（两皮肤共用），传 tone-aware `tt`。ctx 从 char 组装：stage/momentum（复用 charView 的 growthStageText/momentumText）、totalMins、最投入技能、最接近的未解锁成就。绝不阻塞、绝不施压（ADHD 友好）。i18n 在 `gm.*`。
- **注意**：用户并行加了 tonePack（`useTonePack`/`makeToneT`，角色页 `tt`）与 Wish/伙伴「灯灯」祈愿系统——GM 目前是独立「说书人 📖」persona，未与灯灯耦合，日后可合并。
- **人设可切换（2026-07-05 扩展）**：`aiNarrate.js` 抽出通用 `runNarration(persona, ...)`，两个入口 `narrateJourney`(旅程旁白/角色页) 与 `narrateForeman`(厂长播报/工业页)；prod 代理 `api/narrate.mjs` 按 `persona` 切系统提示。工业页 HUD 下方加了一条工业风控制台日志「厂长播报」(`.ind-log`，等宽 teal，`narrateForeman` 生成，1 句，无 key 有本地兜底)。这套 persona 化就是为将来把叙事者接到「灯灯」预留的口子。

**工业页打磨（2026-07-05）**：产线条加传送带斜纹流动动画（`ind-conveyor` keyframes）+ HUD 顶行「运转中/待开工」状态胶囊（脉冲点，total>0 亮起）；均 `prefers-reduced-motion` 关闭。i18n `industry.online/idle`。

**纯逻辑单测已补齐（2026-07-06）**：给新写的纯逻辑补了 3 个测试文件（`industryData.test.js` / `skillTreeData.test.js` / `utils/ai/aiNarrate.test.js`，共 +29 测，全绿）。注意坑：`aiNarrate.js` 在 coverage-gated 的 `utils/**` 里，只测 local* 模板会让 functions/branches 跌破地板线——已把 `buildSystemPrompt/buildUserPayload/buildForemanSystem/buildForemanPayload` 也 export 并按 zh/en 双语测，coverage 反升（branches 36→43.6%、functions→50%）。全套 201 测过。config 阈值没动（其注释邀请「涨上去后调高」，但因用户并行工作可能加 utils，暂不收紧以免给对方添堵）。

**后续路线图**（用户认可的顺序）：1 角色卡✅ → 2 专注结算叙事卡✅ → 3 技能树/成长星图✅（两形态待二选一）→ 3.5 工业点数✅（含运转动画）→ 4 AI 游戏主持人旁白✅（说书人 + 厂长双人设）→ 纯逻辑单测✅。均未提交，工作区与用户并行的 Wish/伙伴/World map 系统共享 Sidebar/AppRoutes/translations/storageKeys。（接现有 AI 链，直接服务论文 RQ2 的 GenAI 整合创新点，见 [[focuslab-project]]）。另可选：结算卡覆盖「勾完所有任务」自动停止路径；streak live 倍率。

**Why:** 这是用户主动定的产品方向，且 RPG+GenAI 组合正好强化研究创新点。
**How to apply:** 继续做游戏化时按路线图推进；动 Character 相关代码前记得两套皮肤可能要二选一。

- **2026-08-24**：tonePack（`useTonePack`/`makeToneT`/角色页 `tt`）已整体删除，角色页直接用 `t`；GM「说书人 📖」persona 保留。
