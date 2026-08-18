import { describe, it, expect } from "vitest";
import {
  searchAll,
  toPageEntries,
  toTaskEntries,
  toMemoEntries,
  toScenarioEntries,
  splitHighlight,
} from "@/components/search/searchIndex";

const TODOS = [
  { id: "t1", text: "给鱼缸换水", completed: false, createdAt: 300 },
  { id: "t2", text: "水彩练习", completed: true, createdAt: 200,
    attrs: { tags: ["爱好"], notes: "买颜料" } },
  { id: "t3", text: "写论文", completed: false, createdAt: 100,
    attrs: { notes: "先查水文资料" } },
];

const MEMOS = [
  { id: "m1", text: "买水草", ts: 20, source: "memo" },
  { id: "m2", text: "开会记录", ts: 10, source: "focus", tags: ["水项目"] },
];

const SCENARIOS = [
  { id: "s1", title: "图书馆", description: "安静、断网", createdAt: 5 },
];

describe("searchAll", () => {
  it("空输入返回空数组", () => {
    expect(searchAll("", { tasks: toTaskEntries(TODOS) })).toEqual([]);
    expect(searchAll("   ", { tasks: toTaskEntries(TODOS) })).toEqual([]);
  });

  it("按 页面/任务/备忘/情景 的固定顺序分组", () => {
    const res = searchAll("水", {
      pages: [{ id: "/aquarium", title: "生态缸", to: "/aquarium", haystack: "生态缸 水" }],
      tasks: toTaskEntries(TODOS),
      memos: toMemoEntries(MEMOS),
      scenarios: toScenarioEntries(SCENARIOS),
    });
    expect(res.map((g) => g.kind)).toEqual(["page", "task", "memo"]);
  });

  it("标题开头命中 > 标题中间命中 > 仅附属文本命中", () => {
    const [group] = searchAll("水", { tasks: toTaskEntries(TODOS) });
    // t2「水彩练习」开头命中；t1「给鱼缸换水」中间命中；t3 只在 notes 里有「水文」
    expect(group.items.map((i) => i.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("同分时新的排前面", () => {
    const [group] = searchAll("练习", {
      tasks: toTaskEntries([
        { id: "old", text: "练习A", createdAt: 1 },
        { id: "new", text: "练习B", createdAt: 9 },
      ]),
    });
    expect(group.items.map((i) => i.id)).toEqual(["new", "old"]);
  });

  it("大小写与首尾空格不影响匹配", () => {
    const entries = toTaskEntries([{ id: "x", text: "Read Paper", createdAt: 1 }]);
    expect(searchAll("  read PAPER ", { tasks: entries })[0].items).toHaveLength(1);
  });

  it("每组截断到 limitPerKind，但 total 记录真实命中数", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `n${i}`, text: `水 ${i}`, createdAt: i,
    }));
    const [group] = searchAll("水", { tasks: toTaskEntries(many) }, { limitPerKind: 3 });
    expect(group.items).toHaveLength(3);
    expect(group.total).toBe(8);
  });

  it("无命中的分组不出现在结果里", () => {
    const res = searchAll("图书馆", {
      tasks: toTaskEntries(TODOS),
      scenarios: toScenarioEntries(SCENARIOS),
    });
    expect(res.map((g) => g.kind)).toEqual(["scenario"]);
  });

  it("缺省数据源不报错", () => {
    expect(searchAll("水", {})).toEqual([]);
  });
});

describe("条目映射", () => {
  it("任务带上 database 名、完成态与高亮 state", () => {
    const [e] = toTaskEntries([TODOS[0]], () => "默认库");
    expect(e).toMatchObject({
      id: "t1", title: "给鱼缸换水", sub: "默认库", done: false,
      to: "/tasks", state: { highlight: "t1" },
    });
  });

  it("任务的标签和备注都进 haystack", () => {
    const [, e2] = toTaskEntries(TODOS);
    expect(e2.haystack).toContain("爱好");
    expect(e2.haystack).toContain("买颜料");
  });

  it("备忘保留 source 以便标出处", () => {
    const entries = toMemoEntries(MEMOS);
    expect(entries.map((e) => e.source)).toEqual(["memo", "focus"]);
  });

  it("备忘的标签可被搜到", () => {
    const [group] = searchAll("水项目", { memos: toMemoEntries(MEMOS) });
    expect(group.items[0].id).toBe("m2");
  });

  it("情景的描述可被搜到", () => {
    const [group] = searchAll("断网", { scenarios: toScenarioEntries(SCENARIOS) });
    expect(group.items[0].id).toBe("s1");
  });

  it("页面把两种语言的名字都收进 haystack", () => {
    const tAll = (key) => (key === "nav.focus" ? ["Focus", "专注"] : []);
    const [e] = toPageEntries(
      [{ to: "/focus", labelKey: "nav.focus", sectionKey: "nav.section.daily" }],
      (k) => (k === "nav.focus" ? "专注" : "每日"),
      tAll,
    );
    expect(e.title).toBe("专注");
    expect(e.sub).toBe("每日");
    expect(e.haystack).toContain("focus");
    expect(e.haystack).toContain("专注");
  });
});

describe("splitHighlight", () => {
  it("切成 前/命中/后 三段", () => {
    expect(splitHighlight("给鱼缸换水", "换")).toEqual(["给鱼缸", "换", "水"]);
  });

  it("命中在开头或结尾时空段保留", () => {
    expect(splitHighlight("水彩", "水")).toEqual(["", "水", "彩"]);
    expect(splitHighlight("水彩", "彩")).toEqual(["水", "彩", ""]);
  });

  it("忽略大小写但保留原文大小写", () => {
    expect(splitHighlight("Read Paper", "paper")).toEqual(["Read ", "Paper", ""]);
  });

  it("标题里没有则返回 null（命中来自备注）", () => {
    expect(splitHighlight("写论文", "水文")).toBeNull();
    expect(splitHighlight("写论文", "")).toBeNull();
  });
});
