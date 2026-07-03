import { describe, it, expect } from "vitest";
import { parseTasksJson, sanitizeTaskAttrs, buildSchemaHint } from "./aiTasks";
import { TASK_ATTR_DEFAULTS } from "./taskAttrDefaults";

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

  it("接受已是数组的输入", () => {
    const out = parseTasksJson([{ text: "x" }, { foo: 1 }]);
    expect(out).toEqual([{ text: "x" }]);
  });
});

describe("sanitizeTaskAttrs", () => {
  it("保留合法的 select / multiselect / date / number 值", () => {
    const { attrs, dropped } = sanitizeTaskAttrs(
      { priority: "high", tags: ["deep_work", "reading"], dueDate: "2026-07-01", estimatedMins: "30", notes: "记得带U盘" },
      fullDb,
    );
    expect(attrs).toEqual({
      priority: "high",
      tags: ["deep_work", "reading"],
      dueDate: "2026-07-01",
      estimatedMins: 30,
      notes: "记得带U盘",
    });
    expect(dropped).toEqual([]);
  });

  it("剔除非法 option id 与坏日期，但列存在不算 dropped", () => {
    const { attrs, dropped } = sanitizeTaskAttrs(
      { priority: "bogus", tags: ["deep_work", "nope"], dueDate: "下周一" },
      fullDb,
    );
    expect(attrs).toEqual({ tags: ["deep_work"] });
    expect(dropped).toEqual([]);
  });

  it("目标库缺列时把字段计入 dropped", () => {
    const { attrs, dropped } = sanitizeTaskAttrs(
      { priority: "high", tags: ["deep_work"], notes: "x" },
      emptyDb,
    );
    expect(attrs).toEqual({});
    expect(dropped).toEqual(["优先级", "标签", "备注"]);
  });

  it("忽略未知属性 id", () => {
    const { attrs } = sanitizeTaskAttrs({ color: "red", priority: "low" }, fullDb);
    expect(attrs).toEqual({ priority: "low" });
  });
});

describe("buildSchemaHint", () => {
  it("空库只提示标题", () => {
    expect(buildSchemaHint(emptyDb)).toContain("只有任务标题");
  });

  it("含列时列出合法 option id", () => {
    const hint = buildSchemaHint(fullDb);
    expect(hint).toContain("priority");
    expect(hint).toContain('"high"');
    expect(hint).toContain("YYYY-MM-DD");
  });
});
