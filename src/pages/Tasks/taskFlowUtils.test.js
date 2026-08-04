import { describe, it, expect } from "vitest";
import { bucketTasks, stickyBuckets, makeWeightOf } from "@/pages/Tasks/taskFlowUtils";

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

const today = new Date().toISOString().slice(0, 10);

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
