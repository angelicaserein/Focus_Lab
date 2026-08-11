import { describe, it, expect } from "vitest";
import {
  FLASK_FULL_SECS,
  bottlesOf,
  normalizeShelf,
  shelfFillSecs,
  shelfStats,
} from "@/pages/Flasks/flaskShelf";

const rec = (o) => ({ id: crypto.randomUUID(), durationSecs: 0, ...o });

describe("shelfFillSecs", () => {
  it("同一次会话的多条记录只算一次（取最大时长，不叠加）", () => {
    const secs = shelfFillSecs([
      rec({ sessionId: "s1", flaskId: "a", durationSecs: 600 }),
      rec({ sessionId: "s1", flaskId: "a", durationSecs: 900 }),
    ]);
    expect(secs).toEqual({ a: 900 });
  });

  it("不同会话累加，各烧瓶各记各的", () => {
    const secs = shelfFillSecs([
      rec({ sessionId: "s1", flaskId: "a", durationSecs: 900 }),
      rec({ sessionId: "s2", flaskId: "a", durationSecs: 300 }),
      rec({ sessionId: "s3", flaskId: "b", durationSecs: 60 }),
    ]);
    expect(secs).toEqual({ a: 1200, b: 60 });
  });

  it("没有 flaskId 的旧记录不入账", () => {
    expect(shelfFillSecs([rec({ sessionId: "s1", durationSecs: 900 })])).toEqual({});
  });

  it("无 sessionId 的记录各算一次会话（退化到记录自身 id）", () => {
    const secs = shelfFillSecs([
      rec({ flaskId: "a", durationSecs: 100 }),
      rec({ flaskId: "a", durationSecs: 200 }),
    ]);
    expect(secs).toEqual({ a: 300 });
  });
});

describe("shelfStats", () => {
  it("一次会话只算一次专注，取会话里最晚的时间当「最近一次」", () => {
    const stats = shelfStats([
      rec({ sessionId: "s1", flaskId: "a", durationSecs: 600, endedAt: 100 }),
      rec({ sessionId: "s1", flaskId: "a", durationSecs: 900, endedAt: 300 }),
    ]);
    expect(stats.a).toEqual({ secs: 900, sessions: 1, lastAt: 300 });
  });

  it("多次会话：次数累加，最近一次取最晚的那次", () => {
    const stats = shelfStats([
      rec({ sessionId: "s1", flaskId: "a", durationSecs: 900, endedAt: 100 }),
      rec({ sessionId: "s2", flaskId: "a", durationSecs: 300, endedAt: 900 }),
      rec({ sessionId: "s3", flaskId: "b", durationSecs: 60, endedAt: 500 }),
    ]);
    expect(stats.a).toEqual({ secs: 1200, sessions: 2, lastAt: 900 });
    expect(stats.b).toEqual({ secs: 60, sessions: 1, lastAt: 500 });
  });

  it("没有 endedAt 的旧记录退到 startedAt", () => {
    const stats = shelfStats([rec({ sessionId: "s1", flaskId: "a", startedAt: 42 })]);
    expect(stats.a.lastAt).toBe(42);
  });
});

describe("bottlesOf", () => {
  it("空瓶：一只都没满，末尾那只从零开始接", () => {
    expect(bottlesOf(0)).toMatchObject({ full: 0, partial: 0, total: 1 });
  });

  it("半小时＝正在接的那只到一半", () => {
    const b = bottlesOf(FLASK_FULL_SECS / 2);
    expect(b.full).toBe(0);
    expect(b.partial).toBeCloseTo(0.5);
  });

  it("溢出的部分流进下一只同形状的瓶子", () => {
    const b = bottlesOf(FLASK_FULL_SECS + FLASK_FULL_SECS / 4);
    expect(b.full).toBe(1); // 第一只已满
    expect(b.partial).toBeCloseTo(0.25); // 第二只接了四分之一
    expect(b.total).toBe(2);
  });

  it("整点注满时，满瓶数进位、新的一只从零开始", () => {
    const b = bottlesOf(FLASK_FULL_SECS * 3);
    expect(b).toMatchObject({ full: 3, partial: 0, total: 4 });
  });
});

describe("normalizeShelf", () => {
  const item = { id: "a", name: "x", preset: "round", params: { bodyHalf: 30 }, savedAt: 1 };

  it("空存档＝空架子", () => {
    expect(normalizeShelf(null)).toEqual({ items: [], activeId: null });
    expect(normalizeShelf({ items: "oops" })).toEqual({ items: [], activeId: null });
  });

  it("activeId 指向已不在架上的瓶子时退到第一只", () => {
    expect(normalizeShelf({ items: [item], activeId: "gone" }).activeId).toBe("a");
  });

  it("丢弃缺 id / 缺参数的坏条目", () => {
    const { items } = normalizeShelf({ items: [item, { id: "b" }, { params: {} }, null] });
    expect(items.map((i) => i.id)).toEqual(["a"]);
  });

  it("认不出的预设名退回默认，不至于渲染时崩掉", () => {
    const { items } = normalizeShelf({ items: [{ ...item, preset: "hexagon" }] });
    expect(items[0].preset).toBe("round");
  });
});
