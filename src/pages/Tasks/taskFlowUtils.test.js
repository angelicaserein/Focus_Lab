import { describe, it, expect } from "vitest";
import { bucketTasks, stickyBuckets, makeWeightOf, daysUntil } from "@/pages/Tasks/taskFlowUtils";

const weightOf = makeWeightOf({
  options: [
    { id: "high", sortWeight: 3 },
    { id: "low", sortWeight: 1 },
  ],
});

const todo = (id, over = {}) => ({
  id,
  text: id,
  completed: false,
  createdAt: 1,
  attrs: {},
  ...over,
});

// 本地年月日，不能用 toISOString()——那是 UTC，在 UTC+8 的凌晨 0–8 点会给出昨天，
// 让这里所有「今天到期」的用例在半夜跑 CI 时随机变红。口径同 utils/time.js 的 getTodayStr。
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const today = localDateStr();

describe("stickyBuckets：冻结卡片落位", () => {
  it("首次调用等同于普通分堆", () => {
    const list = [
      todo("a", { attrs: { dueDate: today } }),
      todo("b"),
      todo("c", { completed: true }),
    ];
    const { buckets } = stickyBuckets(bucketTasks(list, weightOf), new Map());
    expect(buckets.today.map((t) => t.id)).toEqual(["a"]);
    expect(buckets.anytime.map((t) => t.id)).toEqual(["b"]);
    expect(buckets.done.map((t) => t.id)).toEqual(["c"]);
  });

  it("勾完成的任务留在原堆原位，不当场跳进已完成", () => {
    const list = [todo("a"), todo("b")];
    const first = stickyBuckets(bucketTasks(list, weightOf), new Map());

    const after = [todo("a", { completed: true }), todo("b")];
    const { buckets } = stickyBuckets(bucketTasks(after, weightOf), first.placement);
    expect(buckets.anytime.map((t) => t.id)).toEqual(["a", "b"]);
    expect(buckets.done).toEqual([]);
  });

  it("改属性导致换堆时也维持原位（截止日改到今天不会立刻上浮）", () => {
    const list = [todo("a"), todo("b")];
    const first = stickyBuckets(bucketTasks(list, weightOf), new Map());

    const after = [todo("a"), todo("b", { attrs: { dueDate: today } })];
    const { buckets } = stickyBuckets(bucketTasks(after, weightOf), first.placement);
    expect(buckets.today).toEqual([]);
    expect(buckets.anytime.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("落位表清空后按当前数据重排（「整理一下」）", () => {
    const after = [todo("a", { completed: true }), todo("b")];
    const { buckets } = stickyBuckets(bucketTasks(after, weightOf), new Map());
    expect(buckets.anytime.map((t) => t.id)).toEqual(["b"]);
    expect(buckets.done.map((t) => t.id)).toEqual(["a"]);
  });

  it("新任务按当前数据落位，老任务位置不受影响", () => {
    const first = stickyBuckets(bucketTasks([todo("a")], weightOf), new Map());
    const { buckets, placement } = stickyBuckets(
      bucketTasks([todo("a"), todo("n", { attrs: { dueDate: today } })], weightOf),
      first.placement,
    );
    expect(buckets.anytime.map((t) => t.id)).toEqual(["a"]);
    expect(buckets.today.map((t) => t.id)).toEqual(["n"]);
    expect(placement.get("a")).toEqual(first.placement.get("a"));
  });

  it("重复调用是幂等的（StrictMode 下重复渲染不会打乱顺序）", () => {
    const list = [todo("a"), todo("b", { attrs: { priority: "high" } })];
    const once = stickyBuckets(bucketTasks(list, weightOf), new Map());
    const twice = stickyBuckets(bucketTasks(list, weightOf), once.placement);
    expect(twice.buckets.anytime.map((t) => t.id)).toEqual(
      once.buckets.anytime.map((t) => t.id),
    );
  });
});


// 日期解析的时区口径。"YYYY-MM-DD" 交给 new Date() 会按 UTC 午夜解释，
// 在西半球那一刻还是前一天——所有截止日整体差一天。这几条在任何时区都必须成立。
describe("daysUntil：按本地日历算天数", () => {
  it("今天的日期是 0，与本地时区无关", () => {
    expect(daysUntil(localDateStr())).toBe(0);
  });

  it("明天是 1、昨天是 -1", () => {
    const shift = (n) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return localDateStr(d);
    };
    expect(daysUntil(shift(1))).toBe(1);
    expect(daysUntil(shift(-1))).toBe(-1);
    expect(daysUntil(shift(30))).toBe(30);
  });

  it("空值与坏值都回 null，不抛", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil("")).toBeNull();
    expect(daysUntil("不是日期")).toBeNull();
  });
});
