---
name: nijigen-companion-wish
description: 二游式伙伴系统（无损祈愿/图鉴/世界地图）——2026-08-04 起「灯灯/Lumi」角色形象已删除、换成无名抽象暖光，系统骨架保留
metadata: 
  node_type: memory
  type: project
  originSessionId: c47b6344-a2c6-43f0-a6ef-b9ec624117be
  modified: 2026-08-04T04:17:49.687Z
---

**⚠️ 2026-08-04 重大变更：用户要求「把灯灯这个形象从整个项目当中删除」，选定「只删立绘、系统换皮留着」。** 已落地——`Companion.jsx` 从"有脸方块灯灵"改成**无名抽象暖光球**（三层同心圆 halo/core/glow，无眼睛无角色，props 接口不变，5 处调用点全不动）；祈愿/图鉴/技能树光环/世界地图/AI 叙述人设**系统全保留**，只把用户可见/AI 会说出的专有名「灯灯/Lumi」中性化成「这盏灯/暖光 / the light / lamp-light」。内部函数名 `buildLumiSystem/localLumi/narrateLumi`、persona `"lumi"`、存储键 `COMPANION_*`、i18n key 前缀 `companion.*` **刻意保留**（不可见，避免大范围重命名）。**别再把「灯灯/Lumi」这个角色形象加回来。** 生态缸(鱼)是独立系统，本次未动。下面是历史记录（其中「灯灯」立绘/命名描述均已作废，系统仍在）。

---

用户 2026-07-05 要求「参考市面上火的二游完善项目」。四个方向全都要（常驻伙伴立绘 / 无损祈愿+图鉴 / 世界观+区域地图 / 结算+温柔委托打磨）。

**核心取舍红线（关键）：借二游的「皮」，避开二游的「钩子」。** 二游让人爽的部分（立绘陪伴、揭晓仪式、收集探索）对 ADHD 友好；让人焦虑/上瘾的部分恰恰要避开——**体力/树脂上限、每日签到连续、限定池 FOMO、数值等级/氪金 一律不做**，因为直接违背 [[adhd-no-judgmental-numbers]]。

**已落地（第一条纵切，build+6 单测+Playwright 全绿）：**
- 世界观地基 + 数据层 `src/data/companion/companionData.js`（伙伴/立绘皮肤/祈愿池/`drawWish` 纯函数，有 `.test.js`）。伙伴叫「灯灯 / Lumi」，一盏永不评判的暖灯灵。
- 可复用立绘组件 `src/components/companion/Companion.jsx`(+css)：纯 SVG 手绘（无外部图片，CSP 安全），props `mood/outfit/size/say/floating`，4 心情表情，尊重 `prefers-reduced-motion`。
- 祈愿+图鉴页 `src/pages/Wish/`，路由 `/wish`，侧边栏「祈愿/Wishing」(Sparkles 图标，Daily 区技能树下方)。**无损设计**：花金币(`WISH_COST=120`)只抽「还没遇见的」→必是新东西=纯进度无重复挫败；**收齐后停用祈愿**（不再扣币，避免净亏，星尘路径仅留作兜底）；刻意不显示「已收集 X/Y」分母。图鉴分「立绘(可佩戴)/回忆」两组，未遇见=剪影「尚未相遇」。
- 复用了金币：给 `RewardContext` 加了 `spendCoins(amount)` 原语。新存储键 `COMPANION_COLLECTION`/`COMPANION_OUTFIT`。
- 结算卡 `SessionRewardCard` 顶部让灯灯登场（cheer 表情+一句话），读佩戴的 outfit。
- i18n 全在 `companion.*` / `wish.*`（en+zh）。

**四个剩余方向到 2026-07-06 已全部落地：** ①世界观+区域地图→`src/pages/World/`（scenario→可探索区域，纯衍生，灯灯当向导；2026-07-06 补 `worldData.test.js` 12 用例覆盖 computeRegions 排序/wilds/待发现 等，与同类数据层惯例对齐）。**2026-07-10 与情景模式联动**：用户嫌地图"纯装饰、不知道干嘛"，遂把地图 SVG 节点+区域卡都做成入口——点一片区域=`navigate("/focus", { state: { scenarioId }})` 带该情景进专注（沿用 [[ScenarioItem/ScenarioRecommend 的快速启动约定]]，专注页 `useScenarioFromRoute` 接收）；未探索区域也可点=「第一次去踩点」。**注意：地图整个从「情景 Scenario」推导——没有情景就只剩「研究所」据点+「未定之野」wilds，会让人觉得"啥也没有/点不了"**。因此 wilds 也做成入口（点=`clearActiveScenario()`+`navigate("/focus")` 无情景自由探索），保证零情景时也有东西可点。含键盘可达+hover/focus 反馈+reduced-motion；顺手修了区域卡进度条误用不存在的 `r.p`（应 `r.progress`，原本填充宽度是 NaN）。新增 i18n `world.tapHint`/`world.enter`。②温柔委托→`src/pages/Home/`（`commissionsData.js`+`TodayQuests.jsx`+`TodayQuests.css`，已接进 `Home/index.jsx` 顶部，i18n 在 `home.quests.*`/`commission.*`，`commissionsData.test.js` 6 用例；今日小任务由「今天专注」自动判定打勾，无连续/无 X-of-Y/跳过无损。注：CSS+Home 接线+i18n 是 2026-07-06 收尾补齐的，此前只有半成品组件）③常驻伙伴进专注页→`FocusConsole.jsx` 顶部「focus-greeter」问候带（灯灯立绘+一句台词，非沉浸态）④**灯灯说 AI 动态台词（2026-07-06 本会话落地）**：给 [[rpg-gamification]] 的 `aiNarrate.js` 加第三人设 `lumi`（`buildLumiSystem/buildLumiPayload/localLumi`，第一人称「我」对「你」说 1 句短话，ctx={mood,taskCount,scenarioName}），入口 `narrateLumi`；代理 `api/narrate.mjs` 用 `PERSONA` 表按 persona 分流（journey/foreman/lumi）。可复用 hook `src/hooks/companion/useLumiSpeech.js`：**本地 i18n `companionLine` 即时顶上→有 key/prod 时异步升级成 AI 句**，永不阻塞、`companion.refresh` 可换一句、AI 句带 Sparkles「AI」小徽标。目前只接在专注页问候带（World/TodayQuests/SessionRewardCard 的灯灯仍念静态 `companion.line.*`，日后可同法接入）。灯灯与角色页「说书人📖」现共用 aiNarrate 三模式框架但各自 persona，仍未合并。

**Why:** 二游机制大半踩 ADHD 红线，必须逐条筛，别整包照抄。
**How to apply:** 四方向已全落地，守住「皮/钩子」红线；伙伴静态台词/立绘扩展改 companionData + i18n 即可（组件纯展示），要给别处灯灯也接 AI 就复用 `useLumiSpeech`（传 {t,lang,mood,taskCount,scenarioName}）。
