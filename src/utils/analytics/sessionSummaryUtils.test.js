import { describe, it, expect } from "vitest";
import {
  topTag,
  buildSessions,
  enrichDistractionSessions,
} from "@/utils/analytics/sessionSummaryUtils";

describe("topTag", () => {
  it("返回出现次数最多的标签", () => {
    expect(topTag([{ tag: "a" }, { tag: "b" }, { tag: "a" }])).toBe("a");
  });

  it("忽略没有 tag 的条目", () => {
    expect(topTag([{ tag: "x" }, {}, { tag: null }])).toBe("x");
  });

  it("空列表或全无 tag 时返回 null", () => {
    expect(topTag([])).toBeNull();
    expect(topTag([{}, { tag: undefined }])).toBeNull();
  });
});

describe("buildSessions", () => {
  it("按 sessionId 分组，firstTs 取组内最小 ts，整体按 firstTs 降序", () => {
    const items = [
      { sessionId: "old", ts: 100 },
      { sessionId: "new", ts: 500 },
      { sessionId: "old", ts: 50 }, // 更早，应把 old 的 firstTs 拉到 50
    ];
    const out = buildSessions(items, (i) => i);
    expect(out.map((s) => s.sessionId)).toEqual(["new", "old"]); // 500 在前
    expect(out.find((s) => s.sessionId === "old").firstTs).toBe(50);
  });

  it("keyFn 决定每条 item 的投影形状", () => {
    const out = buildSessions([{ sessionId: "s", ts: 1, tag: "手机" }], (i) => i.tag);
    expect(out[0].items).toEqual(["手机"]);
  });

  it("缺 sessionId 的条目归入 'unknown'", () => {
    const out = buildSessions([{ ts: 1 }], (i) => i);
    expect(out[0].sessionId).toBe("unknown");
  });
});

describe("enrichDistractionSessions", () => {
  // 数组按 firstTs 降序（新会话在前）；enrich 内 prev = arr[idx+1]（更早的会话）。
  const sessions = () => [
    { sessionId: "new", firstTs: 1000, items: [
      { ts: 30, tag: "手机" },
      { ts: 10, tag: "手机" },
      { ts: 20, tag: "走神" },
    ] },
    { sessionId: "old", firstTs: 500, items: [{ ts: 5, tag: "走神" }] },
  ];

  it("items 按 ts 升序编号 nth", () => {
    const out = enrichDistractionSessions(sessions(), { new: 1800, old: 1800 });
    expect(out[0].items.map((i) => i.nth)).toEqual([1, 2, 3]);
    expect(out[0].items.map((i) => i.ts)).toEqual([10, 20, 30]);
  });

  it("distractionRate = 次数 /（时长小时数），保留一位小数字符串", () => {
    const out = enrichDistractionSessions(sessions(), { new: 1800, old: 1800 });
    // new：3 次 / 0.5 小时 = 6.0
    expect(out[0].distractionRate).toBe("6.0");
  });

  it("时长为 0 或无分心时 distractionRate 为 null", () => {
    const out = enrichDistractionSessions(sessions(), { new: 0, old: 1800 });
    expect(out[0].distractionRate).toBeNull();
  });

  it("diffVsPrev 相对数组中下一个（更早）会话的分心次数", () => {
    const out = enrichDistractionSessions(sessions(), { new: 1800, old: 1800 });
    expect(out[0].diffVsPrev).toBe(2); // 3 - 1
    expect(out[1].diffVsPrev).toBeNull(); // 最早会话无 prev
  });

  it("bestTag 取会话内最高频标签", () => {
    const out = enrichDistractionSessions(sessions(), { new: 1800, old: 1800 });
    expect(out[0].bestTag).toBe("手机");
  });
});
