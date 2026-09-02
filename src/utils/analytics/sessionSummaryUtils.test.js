import { describe, it, expect } from "vitest";
import {
  topTag,
  buildSessions,
  enrichDistractionSessions,
  toDistractionItem,
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

  // 原用例标题说「时长为 0 或无分心」，实际只验了时长为 0 那一半；补上另一半，
  // 并把「会话根本不在 durationBySession 里」这条也钉住（?? 0 的兜底）。
  it("时长为 0 / 会话缺时长时 distractionRate 为 null（不是 Infinity）", () => {
    const out = enrichDistractionSessions(sessions(), { new: 0, old: 1800 });
    expect(out[0].distractionRate).toBeNull();
    expect(enrichDistractionSessions(sessions(), {})[0].distractionRate).toBeNull();
  });

  it("会话里一条分心都没有时，rate / diffVsPrev / bestTag 全为 null", () => {
    const out = enrichDistractionSessions(
      [
        { sessionId: "new", firstTs: 1000, items: [] },
        { sessionId: "old", firstTs: 500, items: [{ ts: 5, tag: "走神" }] },
      ],
      { new: 1800, old: 1800 },
    );
    expect(out[0].items).toEqual([]);
    expect(out[0].distractionRate).toBeNull();
    expect(out[0].diffVsPrev).toBeNull(); // 有 prev，但自己 0 条也不给差值
    expect(out[0].bestTag).toBeNull();
  });

  it("rate 是保留一位小数的字符串，不是数字", () => {
    // 1 次 / (1800/3600=0.5 小时) = 2 → "2.0"
    const out = enrichDistractionSessions(sessions(), { new: 1800, old: 1800 });
    expect(out[1].distractionRate).toBe("2.0");
    expect(typeof out[1].distractionRate).toBe("string");
  });

  it("不足一小时的零头也按小时折算（5 次 / 5 分钟 = 60.0）", () => {
    const out = enrichDistractionSessions(
      [{ sessionId: "s", firstTs: 1, items: Array.from({ length: 5 }, (_, i) => ({ ts: i })) }],
      { s: 300 },
    );
    expect(out[0].distractionRate).toBe("60.0");
  });

  it("原 items 不被就地改动（nth 只加在拷贝上）", () => {
    const input = sessions();
    enrichDistractionSessions(input, { new: 1800, old: 1800 });
    expect(input[0].items[0].nth).toBeUndefined();
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

describe("toDistractionItem", () => {
  it("缺字段的旧记录：type 兜底 reactive，其余补 null 而不是 undefined", () => {
    expect(toDistractionItem({ id: "d1", ts: 100 })).toEqual({
      id: "d1",
      ts: 100,
      tag: null,
      note: null,
      type: "reactive",
      durationSecs: null,
      endTs: null,
      appLabel: null,
      pagePath: null,
      pageLabel: null,
    });
  });

  it("桌面端 app 记录的起止与程序名原样带出", () => {
    const out = toDistractionItem({
      id: "d2", ts: 100, endTs: 400, type: "app",
      tag: "微信", durationSecs: 300, appLabel: "微信", appName: "WeChat.exe",
    });
    expect(out).toMatchObject({ type: "app", endTs: 400, durationSecs: 300, appLabel: "微信" });
    expect(out).not.toHaveProperty("appName"); // 明细行用不到 exe 名，不外带
  });

  it("旧的 page 记录带出路径与页面名", () => {
    expect(toDistractionItem({ id: "d3", ts: 1, type: "page", pagePath: "/tasks", pageLabel: "任务库" }))
      .toMatchObject({ type: "page", pagePath: "/tasks", pageLabel: "任务库" });
  });

  it("durationSecs 为 0 要保留 0，不能被兜底成 null", () => {
    expect(toDistractionItem({ id: "d4", ts: 1, durationSecs: 0 }).durationSecs).toBe(0);
  });
});
