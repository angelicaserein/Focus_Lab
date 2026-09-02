# 独立边界情况清单（先于阅读 AI 测试写下）

方法：只读实现代码，自己推「应该做什么」，列出正常输入 / 期望输出 / 边界。
之后再打开 AI 写的测试逐条对照，缺口补测。日期：2026-09-01。

## 1. 专注时长 —— `src/utils/records/focusRecords.js`

`isRecordable(secs)` / `MIN_RECORD_SECS = 10`
- 正常：15 → true；5 → false
- 阈值：**恰好 10 → true**（`>=`，不是 `>`）；9.999 → false
- 0 → false；负数 −5 → false
- 非数字：`"12"` → true（走 Number 转换）；`null` → Number(null)=0 → false；
  `undefined` / `"abc"` → NaN，任何比较都 false → false

`sessionMaxSecsMap` / `totalFocusSecs`
- 同 sessionId 多任务取 max 不求和（40s 两条 ≠ 80s）
- 无 sessionId 的旧记录退化用 r.id 各算一次
- 空数组 → 0；durationSecs 为 0 的记录 → 0 而不是 NaN
- **durationSecs 为负**（时钟回拨）：Math.max 会保留 0 起点? 不 —— 初值是 `map.get(key) ?? 0`，
  所以负数会被 0 顶掉 → 单条 −5 的记录算成 0。这是隐性行为，值得钉死。

`computeFocusStats`
- 空数组 → totalSecs/todaySecs/sessionCount/longest/avg 全 0，avg 不能是 NaN（除零）
- avgSecs 用 Math.round，分母是**会话数**不是记录数：同会话两条 60s → avg=60 不是 30
- longestSecs 取的是**单条记录**最大值，与去重后的会话时长口径不同
- taskBreakdown 按 taskText 聚合、**求和**（与会话去重口径不同，同会话多条会叠加）、只取前 6
- chartData 固定 7 项，今天在最右 isToday

`buildFocusRecord`
- startedAt 缺省时按 `Date.now() - durationSecs*1000` 反推
- durationSecs=0 时 startedAt ≈ now

`filterSinceSession`
- sessionStartTs 为 null/0/undefined → 返回 []（不是全量）
- 边界：ts **恰等于** sessionStartTs 的条目要被包含（`>=`）

## 2. 分心 —— `distractionStats.js` / `useDistractionTracking.js`

`distractionOverview`
- 空数组 → total 0、avgPerSession 0（不能 NaN）、**ratePerHour = null**（不是 0/Infinity）
- focusSecs=0（有分心但那个 session 没有专注记录）→ ratePerHour = null
- 分母只算「记录过分心的会话」的时长
- 各类型分别计数：proactive / app / page / 其它（reactive 不进任何一组，但算进 total）
- `durationSecs` 缺失或 null → 按 0 累加，不能 NaN
- 无 sessionId 的分心：不进 sessionIds，但仍算 total → avgPerSession 分母可能为 0
- **极短来回切换**：durationSecs=0 的多条要各自计数（次数照算，秒数为 0）

`sessionDurationMap`
- 无 sessionId 的记录跳过；同 session 取 max

`distractionTagRanking`
- 无 tag / tag 为空串 → 归 `__untagged__`
- 次数相同时未标注排最后
- 空输入 → []

`distractionDailyTrend`
- 固定返回 days 项，缺数据补 0，升序
- 范围外（更早 / 未来）的记录被丢弃
- 边界：**今天 00:00:00 整**的记录要落进今天那格；days=0 → []；days=1 → 只有今天
- 跨月 label 为 M/D

`reducer`（分心状态机）—— 极短时间来回切换的核心
- idle → START_PROACTIVE → proactive-running；再 START_PROACTIVE 由 hook 拦截（phase 判断），
  reducer 本身不拦，会重置 proactiveStartTs（潜在重复计时）
- END_PROACTIVE → proactive-pending 且 **proactiveId/proactiveStartTs 被清空**
- 未知 action → 原样返回 state（不崩）
- RECORD_REACTIVE 会把进行中的主动分心状态**冲掉**（因为展开的是 initialPhaseState）
- TAG/UNDO/DISMISS/FLUSH → 一律回 initial

`enrichDistractionSessions`（sessionSummaryUtils）
- durationSecs=0 → distractionRate = null（不是 Infinity）
- items 为空 → rate null、diffVsPrev null
- 最老的一次会话没有 prev → diffVsPrev null
- rate 是 toFixed(1) 的**字符串**不是数字
- nth 按 ts 升序从 1 起编

## 3. AI 解析任务 —— `src/utils/ai/aiTasks.js`

`parseTasksJson(raw)`
- 正常：带代码围栏的 JSON 数组 → [{text, attrs}]
- 前后有解释性文字 → 仍能定位首个 `[` 到最后 `]`
- 缺字段：无 text → 丢弃；text 非字符串（数字 / null / 对象）→ 丢弃；text 全空白 → 丢弃
- text 前后空白 → trim
- 元素是 null / 字符串 / 数字 → 丢弃不崩
- 非数组输入（对象 / 空串 / null / undefined / 纯文字）→ []
- **已是数组的输入也要归一化**成 {text, attrs}（注释里点名的历史 bug）
- 未知字段（如 `foo`、`estimate`）被忽略，只留 KNOWN_ATTR_IDS
- 值为 null/undefined 的已知字段不进 attrs
- 中英文混排 / emoji / 引号书名号等奇怪符号原样保留（不做转义或剥离）

`sanitizeTaskAttrs(proposed, database)`
- 库没有该列 → 进 dropped（中文列名），且**去重**
- 未知 id（不在 KNOWN_ATTR_IDS）→ 静默忽略，**不进 dropped**
- select：option 不合法 → undefined（该字段整体不落）
- multiselect：非数组的单值会被包成数组；过滤后为空 → undefined
- date：必须严格 `YYYY-MM-DD`；`2026-9-1`、`2026/09/01`、Date 对象、时间戳 → undefined
- number：`"12"` → 12；`""` → Number("")=0 会通过（可疑）；`"abc"`/NaN/Infinity → undefined
- text/notes：非字符串 String() 转换后 trim，空串 → undefined
- database 为 null/undefined、attrs 缺失 → 全 dropped，不崩
- proposedAttrs 缺省 → { attrs:{}, dropped:[] }

`parseQuestionsJson(raw, max)`
- 选项 < 2 的题丢掉；选项多于 4 截断到 4
- default 不在 options → 退回 options[0]；default 缺失 / 非字符串 → options[0]
- 题数超过 max 截断（默认 3）
- question 非字符串 / 空白 → 丢
- 选项里的非字符串 / 空白项先被过滤，**过滤后不足 2 条整题也要丢**
- 非数组输入 → []

`buildSchemaHint(database, t)`
- 空库 / 无 attrs / database=null → 「只有任务标题」那句
- 只列 KNOWN_ATTR_IDS 里且库里真有的列，自定义列不列出
- t 缺省不崩（key 原样返回）
- select 列要把 option id 和文案都写进去

`todayHint(now)`
- 用**本地**时区，不是 UTC（凌晨会差一天）
- weekday 取「日一二三四五六」[getDay()]，周日 → "日"

`extractTasksFromText`
- 空串 / 纯空白 / null / undefined → 直接 []，不调 AI
- 无 key → 示例任务，中文输入给中文、英文输入给英文
- 示例任务只在库里有对应列时才带 priority / tags

`refineTask`
- task 为 null / text 空白 → []

---

## 第 2 步：与 AI 已写测试的逐条对照结果（2026-09-01）

审查范围：5 个实现文件 / 5 个测试文件，原有 77 条用例（全仓 761 条的约 10%）。
补齐后这 5 个文件 141 条，另新建 `aiClient.test.js` 10 条 + 回归 2 条，共新增 76 条。

### AI 已覆盖得不错的
- `filterSinceSession` 的三种空值与 `ts === start` 卡点
- 会话墙钟取 max 不求和（多任务不叠加）这条核心口径，两个文件都测了
- `parseTasksJson` 的围栏剥离、前后解释文字、「已是数组也要归一化」这条历史 bug
- 分心率 `null`（而非 Infinity）、未标注排最后
- `time.test.js` 顶部明确写了「不照着实现反算 expected」，断言全是字面值——没有抄公式的情况

### 缺口（已补）
1. **`isRecordable` / `MIN_RECORD_SECS` 完全没测**——而它是「记账门槛 = 发币门槛」的
   唯一判据（FocusContext / useSessionStop / useAutoStopOnEmpty 三处都靠它）。
   补了阈值 10 卡点、0、负数、`"15"` / `null` / `""` / `undefined` / `NaN`。
2. 时长为 0 / 负数时的聚合行为（负数被 `?? 0` 顶掉记成 0）没测。
3. `computeFocusStats` 的「今天 00:00:00 整」日界、以及 longest / taskBreakdown
   与会话去重是三套不同口径，都没测。
4. `distractionOverview`：分母只算「有分心记录的会话」这条口径没有被真正验证
   （原用例的 durationBySession 里没有多余会话）；`page` 类型整组没测；
   `durationSecs` 缺失 / 为 null；无 sessionId 的分心；极短来回切换（多条 0 秒）。
5. `distractionDailyTrend`：日界整点、未来时间戳、days=1、跨月 label。
6. `toDistractionItem` 整个函数没测。
7. reducer 只测了单向迁移，没测「来回切换」：重复 START 顶掉起点、running 中记被动分心
   会冲掉主动段、重复 END。
8. `sanitizeTaskAttrs`：multiselect 收单值、select 收数组、日期各种近似写法、
   number 分支、`database` 为 null。
9. `parseQuestionsJson`：选项超 4 截断、选项含非字符串、default 类型不对、max 参数。
10. `buildSchemaHint`：库形状异常、自定义列不外泄、`t` 真的被调用。
11. `todayHint`：星期日（getDay()=0）与本地深夜不跨天。

### 弱断言（已改强）
- `sessionSummaryUtils.test.js` 的「时长为 0 **或无分心** 时 rate 为 null」：
  标题声称两件事，实际只验了时长为 0 那一半。已补「items 为空」「会话不在
  durationBySession 里」两条，并加了 rate 是字符串、不足一小时按小时折算、
  不就地改动入参。

### 独立检查抓到的真 bug（已修）
`aiClient.extractJson` 取「首个 `[` → **最后一个** `]`」。模型在 JSON 后面补的那句人话里
只要出现一个 `]` 或 `}`（脚注 `[1]`、清单编号、颜文字），切片就多框进那段人话，
`JSON.parse` 抛错后兜底返回 `null` → **一整批任务/反问静默变成空数组**，用户看到的是
「AI 一条都没拆出来」。原有用例「容忍数组前后的解释性文字」恰好用了不含括号的收尾文案，
因此永远发现不了。修法：收尾括号从最后一个往前退着试（上限 20 次）。
影响面是 5 个 AI 模块共用的解析口，而这个函数此前没有任何直接测试。
