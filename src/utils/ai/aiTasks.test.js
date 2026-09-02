import { describe, it, expect } from "vitest";
import {
  parseTasksJson,
  parseQuestionsJson,
  sanitizeTaskAttrs,
  buildSchemaHint,
  buildSystemPrompt,
  todayHint,
} from "@/utils/ai/aiTasks";
import { TASK_ATTR_DEFAULTS } from "@/utils/task/taskAttrDefaults";

// 一个含全部约定列的「经典」库
const fullDb = { id: "d1", name: "任务", attrs: TASK_ATTR_DEFAULTS.map((a) => ({ ...a })) };
// 空库（只有标题）
const emptyDb = { id: "d0", name: "空库", attrs: [] };

describe("parseTasksJson", () => {
  it("解析裸 JSON 数组并归一成 { text, attrs }", () => {
    const out = parseTasksJson('[{"text":"写报告","priority":"high"}]');
    expect(out).toEqual([{ text: "写报告", attrs: { priority: "high" } }]);
  });

  it("剥掉 ```json 代码围栏", () => {
    const raw = "```json\n[{\"text\":\"回邮件\"}]\n```";
    expect(parseTasksJson(raw)).toEqual([{ text: "回邮件", attrs: {} }]);
  });

  it("容忍数组前后的解释性文字", () => {
    const raw = '好的，这是任务：[{"text":"买菜"}] 希望有帮助';
    expect(parseTasksJson(raw).map((t) => t.text)).toEqual(["买菜"]);
  });

  it("非法 JSON 兜底为空数组", () => {
    expect(parseTasksJson("not json at all")).toEqual([]);
    expect(parseTasksJson("[unclosed")).toEqual([]);
  });

  it("非字符串/非数组输入返回空数组", () => {
    expect(parseTasksJson(null)).toEqual([]);
    expect(parseTasksJson(42)).toEqual([]);
  });

  it("丢弃缺 text 或 text 为空的元素", () => {
    const out = parseTasksJson('[{"text":"有效"},{"priority":"low"},{"text":"  "}]');
    expect(out.map((t) => t.text)).toEqual(["有效"]);
  });

  // 已是数组的输入也要走同一道归一化：两条分支出来的形状必须一样，
  // 否则属性平铺在顶层、落库时读 attrs 的那一侧什么都拿不到。
  it("接受已是数组的输入，且照样归一成 { text, attrs }", () => {
    const out = parseTasksJson([{ text: "x" }, { foo: 1 }]);
    expect(out).toEqual([{ text: "x", attrs: {} }]);
  });

  it("已是数组时，顶层的已知属性同样折进 attrs", () => {
    const out = parseTasksJson([{ text: " 写论文 ", priority: "urgent", dueDate: "2026-08-30" }]);
    expect(out).toEqual([
      { text: "写论文", attrs: { priority: "urgent", dueDate: "2026-08-30" } },
    ]);
  });
});

describe("sanitizeTaskAttrs", () => {
  it("保留合法的 select / multiselect / date / text 值", () => {
    const { attrs, dropped } = sanitizeTaskAttrs(
      { priority: "urgent_important", tags: ["project", "fun"], dueDate: "2026-07-01", notes: "记得带U盘" },
      fullDb,
    );
    expect(attrs).toEqual({
      priority: "urgent_important",
      tags: ["project", "fun"],
      dueDate: "2026-07-01",
      notes: "记得带U盘",
    });
    expect(dropped).toEqual([]);
  });

  it("剔除非法 option id 与坏日期，但列存在不算 dropped", () => {
    const { attrs, dropped } = sanitizeTaskAttrs(
      { priority: "bogus", tags: ["project", "nope"], dueDate: "下周一" },
      fullDb,
    );
    expect(attrs).toEqual({ tags: ["project"] });
    expect(dropped).toEqual([]);
  });

  it("目标库缺列时把字段计入 dropped", () => {
    const { attrs, dropped } = sanitizeTaskAttrs(
      { priority: "high", tags: ["project"], notes: "x" },
      emptyDb,
    );
    expect(attrs).toEqual({});
    expect(dropped).toEqual(["优先级", "标签", "备注"]);
  });

  it("忽略未知属性 id", () => {
    const { attrs } = sanitizeTaskAttrs({ color: "red", priority: "trivial" }, fullDb);
    expect(attrs).toEqual({ priority: "trivial" });
  });
});

describe("buildSchemaHint", () => {
  it("空库只提示标题", () => {
    expect(buildSchemaHint(emptyDb)).toContain("只有任务标题");
  });

  it("含列时列出合法 option id", () => {
    const hint = buildSchemaHint(fullDb);
    expect(hint).toContain("priority");
    expect(hint).toContain('"urgent_important"');
    expect(hint).toContain("YYYY-MM-DD");
  });
});

describe("todayHint", () => {
  it("按本地时区给出日期与中文星期", () => {
    // 2026-08-14 是星期五
    expect(todayHint(new Date(2026, 7, 14, 9, 30))).toEqual({ date: "2026-08-14", weekday: "五" });
  });
});

describe("buildSystemPrompt", () => {
  it("把今天的日期写进 prompt，模型才能换算相对日期", () => {
    const p = buildSystemPrompt("每个任务只需输出 text。", { date: "2026-08-14", weekday: "五" });
    expect(p).toContain("今天是 2026-08-14（星期五）");
    expect(p).toContain("每个任务只需输出 text。");
  });
});

describe("buildSystemPrompt 与拆分偏好", () => {
  const today = { date: "2026-08-14", weekday: "五" };

  it("没给 rulesHint 时用内置的默认粒度段", () => {
    const p = buildSystemPrompt("", today);
    expect(p).toContain("粒度规则：");
    expect(p).toContain("拆成 2–4 条");
  });

  it("给了 rulesHint 就整段换掉，不再残留默认粒度", () => {
    const p = buildSystemPrompt("", today, "粒度规则：\n- 拆到最细。");
    expect(p).toContain("- 拆到最细。");
    expect(p).not.toContain("拆成 2–4 条");
  });

  it("不再含「宁可少拆」这类保守指令——拆多拆少由用户偏好说了算", () => {
    expect(buildSystemPrompt("", today)).not.toContain("宁可少拆");
    expect(buildSystemPrompt("", today, "粒度规则：\n- 拆到最细。")).not.toContain("宁可少拆");
  });
});

describe("parseQuestionsJson", () => {
  it("解析选择题，并保留合法的默认答案", () => {
    const raw = '[{"question":"要拆步骤吗？","options":["不拆","拆成几步"],"default":"拆成几步"}]';
    expect(parseQuestionsJson(raw)).toEqual([
      { question: "要拆步骤吗？", options: ["不拆", "拆成几步"], default: "拆成几步" },
    ]);
  });

  it("default 不在 options 里就退回第一项", () => {
    const raw = '[{"question":"要拆吗？","options":["A","B"],"default":"C"}]';
    expect(parseQuestionsJson(raw)[0].default).toBe("A");
  });

  it("丢掉选项不足两个、或没有题干的条目", () => {
    const raw = '[{"question":"只有一个选项","options":["A"]},{"options":["A","B"]}]';
    expect(parseQuestionsJson(raw)).toEqual([]);
  });

  it("最多留 3 题，非法输入兜底为空数组", () => {
    const one = '{"question":"q","options":["A","B"]}';
    expect(parseQuestionsJson(`[${Array(5).fill(one).join(",")}]`)).toHaveLength(3);
    expect(parseQuestionsJson("not json")).toEqual([]);
  });
});

// ── 以下为独立审查补充的边界用例（2026-09-01）─────────────────────────────
// 依据 docs/test-edge-cases.md：模型输出缺字段 / 类型不对 / 中英混排与奇怪符号。

describe("parseTasksJson：脏输出不崩", () => {
  it("数组里混 null / 字符串 / 数字元素时逐个跳过", () => {
    const out = parseTasksJson('[null, "写报告", 42, {"text":"真任务"}]');
    expect(out).toEqual([{ text: "真任务", attrs: {} }]);
  });

  it("text 类型不对（数字 / 数组 / 对象 / null）一律丢弃", () => {
    expect(parseTasksJson('[{"text":123},{"text":["a"]},{"text":{}},{"text":null}]')).toEqual([]);
  });

  it("已知字段的值为 null 时不落进 attrs", () => {
    const out = parseTasksJson('[{"text":"x","priority":null,"tags":null,"dueDate":"2026-09-01"}]');
    expect(out[0].attrs).toEqual({ dueDate: "2026-09-01" });
  });

  it("未知字段被丢掉，只留约定的四个 id", () => {
    const out = parseTasksJson(
      '[{"text":"x","priority":"urgent","estimate":30,"emoji":"🔥","notes":"n","tags":["a"],"dueDate":"2026-09-01"}]',
    );
    expect(Object.keys(out[0].attrs).sort()).toEqual(["dueDate", "notes", "priority", "tags"]);
  });

  it("中英混排 / emoji / 全角符号原样保留，只 trim 首尾空白", () => {
    const raw = '[{"text":"  给 Prof. Zhang 发邮件 ✉️（附件《方案 v2》）—— 明天 9:00 前  "}]';
    expect(parseTasksJson(raw)[0].text).toBe("给 Prof. Zhang 发邮件 ✉️（附件《方案 v2》）—— 明天 9:00 前");
  });

  it("全角空白与换行组成的 text 视为空，丢弃", () => {
    expect(parseTasksJson('[{"text":"\n\t  "}]')).toEqual([]);
  });

  it("模型把数组包在对象里时，仍能取出内层数组", () => {
    // extractJson 取首个 '[' 到最后一个 ']'，这种常见跑偏还救得回来
    expect(parseTasksJson('{"tasks":[{"text":"买菜"}]}').map((t) => t.text)).toEqual(["买菜"]);
  });

  it("空数组 / 空字符串 / undefined / 对象 都归成空数组", () => {
    expect(parseTasksJson("[]")).toEqual([]);
    expect(parseTasksJson("")).toEqual([]);
    expect(parseTasksJson(undefined)).toEqual([]);
    expect(parseTasksJson({ text: "x" })).toEqual([]);
  });
});

describe("sanitizeTaskAttrs：类型不对时的清洗", () => {
  it("multiselect 收到单个字符串时包成数组", () => {
    expect(sanitizeTaskAttrs({ tags: "project" }, fullDb).attrs).toEqual({ tags: ["project"] });
  });

  it("multiselect 全是非法值时整个字段不落", () => {
    expect(sanitizeTaskAttrs({ tags: ["nope", "bogus"] }, fullDb).attrs).toEqual({});
    expect(sanitizeTaskAttrs({ tags: [] }, fullDb).attrs).toEqual({});
  });

  it("select 收到数组 / 数字时不落（只认单个合法 option id）", () => {
    expect(sanitizeTaskAttrs({ priority: ["urgent"] }, fullDb).attrs).toEqual({});
    expect(sanitizeTaskAttrs({ priority: 1 }, fullDb).attrs).toEqual({});
  });

  it("日期必须严格 YYYY-MM-DD，别的写法一概不落", () => {
    for (const bad of ["2026-9-1", "2026/09/01", "26-09-01", "2026-09-01T00:00:00", 1756684800000]) {
      expect(sanitizeTaskAttrs({ dueDate: bad }, fullDb).attrs).toEqual({});
    }
    expect(sanitizeTaskAttrs({ dueDate: "2026-09-01" }, fullDb).attrs).toEqual({ dueDate: "2026-09-01" });
  });

  it("text 列：非字符串转字符串，纯空白不落", () => {
    expect(sanitizeTaskAttrs({ notes: 123 }, fullDb).attrs).toEqual({ notes: "123" });
    expect(sanitizeTaskAttrs({ notes: "  " }, fullDb).attrs).toEqual({});
    expect(sanitizeTaskAttrs({ notes: " 记得带 U 盘 " }, fullDb).attrs).toEqual({ notes: "记得带 U 盘" });
  });

  it("number 列：数字串转数字，非数值不落", () => {
    const numDb = { attrs: [{ id: "notes", type: "number" }] };
    expect(sanitizeTaskAttrs({ notes: "12" }, numDb).attrs).toEqual({ notes: 12 });
    expect(sanitizeTaskAttrs({ notes: 0 }, numDb).attrs).toEqual({ notes: 0 });
    expect(sanitizeTaskAttrs({ notes: "abc" }, numDb).attrs).toEqual({});
    expect(sanitizeTaskAttrs({ notes: Infinity }, numDb).attrs).toEqual({});
  });

  it("database 为空 / 无 attrs 时不崩，字段全部计入 dropped", () => {
    expect(sanitizeTaskAttrs({ priority: "urgent" }, null)).toEqual({ attrs: {}, dropped: ["优先级"] });
    expect(sanitizeTaskAttrs({ dueDate: "2026-09-01" }, {})).toEqual({ attrs: {}, dropped: ["截止日期"] });
  });

  it("不传 proposedAttrs 时返回空结果", () => {
    expect(sanitizeTaskAttrs(undefined, fullDb)).toEqual({ attrs: {}, dropped: [] });
  });

  it("未知 id 被静默忽略，不进 dropped（只有「库里缺这一列」才提示用户）", () => {
    expect(sanitizeTaskAttrs({ color: "red", estimate: 30 }, emptyDb).dropped).toEqual([]);
  });
});

describe("parseQuestionsJson：脏输出", () => {
  it("选项多于 4 个时截断到 4；default 落在被截掉的那个就退回第一项", () => {
    const raw = '[{"question":"q","options":["A","B","C","D","E"],"default":"E"}]';
    const out = parseQuestionsJson(raw);
    expect(out[0].options).toEqual(["A", "B", "C", "D"]);
    expect(out[0].default).toBe("A");
  });

  it("选项里的非字符串 / 空白项先被过滤，滤完不足两个整题丢掉", () => {
    expect(parseQuestionsJson('[{"question":"q","options":["A",null,3,"  "]}]')).toEqual([]);
    const out = parseQuestionsJson('[{"question":"q","options":["A",null," B "]}]');
    expect(out[0].options).toEqual(["A", "B"]);
  });

  it("default 缺失或类型不对时退回第一项", () => {
    const base = '{"question":"q","options":["A","B"]';
    expect(parseQuestionsJson(`[${base}}]`)[0].default).toBe("A");
    expect(parseQuestionsJson(`[${base},"default":7}]`)[0].default).toBe("A");
    expect(parseQuestionsJson(`[${base},"default":"  B  "}]`)[0].default).toBe("B");
  });

  it("题干首尾空白被 trim；纯空白题干丢掉", () => {
    expect(parseQuestionsJson('[{"question":"  要拆吗？  ","options":["A","B"]}]')[0].question)
      .toBe("要拆吗？");
    expect(parseQuestionsJson('[{"question":"   ","options":["A","B"]}]')).toEqual([]);
  });

  it("max 可以调小；已是数组的输入也走同一套清洗", () => {
    const q = { question: "q", options: ["A", "B"] };
    expect(parseQuestionsJson([q, q, q], 1)).toHaveLength(1);
    expect(parseQuestionsJson([q, q])).toEqual([
      { question: "q", options: ["A", "B"], default: "A" },
      { question: "q", options: ["A", "B"], default: "A" },
    ]);
  });
});

describe("buildSchemaHint：库形状异常与自定义列", () => {
  it("database 为 null / undefined / 无 attrs 时退回「只有标题」", () => {
    expect(buildSchemaHint(null)).toContain("只有任务标题");
    expect(buildSchemaHint(undefined)).toContain("只有任务标题");
    expect(buildSchemaHint({})).toContain("只有任务标题");
  });

  it("自定义列不写进 prompt（免得模型给它瞎填）", () => {
    const db = { attrs: [{ id: "energy", name: "精力", type: "select", options: [{ id: "low" }] }] };
    const hint = buildSchemaHint(db);
    expect(hint).toContain("只有任务标题");
    expect(hint).not.toContain("energy");
  });

  it("只列出库里真实存在的那几列", () => {
    const db = { attrs: [{ id: "dueDate", nameKey: "k.due", type: "date" }] };
    const hint = buildSchemaHint(db, (k) => `【${k}】`);
    expect(hint).toContain("dueDate（【k.due】）");
    expect(hint).not.toContain("priority");
    expect(hint).not.toContain("notes");
  });

  it("列名走 t 翻译：不传 t 时 key 原样出现，而不是 undefined", () => {
    expect(buildSchemaHint({ attrs: [{ id: "notes", nameKey: "tasks.attr.notes", type: "text" }] }))
      .toContain("notes（tasks.attr.notes）");
  });
});

describe("todayHint 的时区与星期", () => {
  it("星期日取「日」（getDay() 为 0 的那一格）", () => {
    // 2026-08-16 是星期日
    expect(todayHint(new Date(2026, 7, 16, 12, 0))).toEqual({ date: "2026-08-16", weekday: "日" });
  });

  it("当地深夜也不会跨到第二天（不能用 UTC）", () => {
    expect(todayHint(new Date(2026, 7, 16, 23, 59, 59)).date).toBe("2026-08-16");
  });

  it("月 / 日补零到两位", () => {
    expect(todayHint(new Date(2026, 0, 5)).date).toBe("2026-01-05");
  });
});

describe("parseTasksJson：收尾人话带括号（回归）", () => {
  // 对应 aiClient.extractJson 的真 bug：修之前这两条都会静默返回 []，
  // 也就是模型明明拆出了任务，用户界面上却一条都没有。
  it("解释性收尾里含 ] 时不该丢掉整批任务", () => {
    const raw = '好的，我拆成了两条：[{"text":"买菜"},{"text":"回邮件"}] 以上（见清单[1]）';
    expect(parseTasksJson(raw).map((t) => t.text)).toEqual(["买菜", "回邮件"]);
  });

  it("反问输出同理", () => {
    const raw = '[{"question":"要拆吗？","options":["不拆","拆"]}] 就问这些吧 :]';
    expect(parseQuestionsJson(raw)).toHaveLength(1);
  });
});
