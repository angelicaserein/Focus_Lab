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
