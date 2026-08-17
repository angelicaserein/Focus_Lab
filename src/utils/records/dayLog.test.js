import { describe, it, expect } from "vitest";
import {
  ACTIVITY_ORDER,
  focusQuality,
  buildDayEntries,
  groupDays,
} from "@/utils/records/dayLog";

// 时间基准：2026-06-14（周日）本地时间。跨日用例显式换到 6-13。
const at = (h, m = 0, d = 14) => new Date(2026, 5, d, h, m, 0).getTime();

// 一条专注记录。分心字段是「整段会话的快照」，同一会话的多条记录上是同一份，
// 所以下面刻意在同一 sessionId 的两条记录里写相同的值（口径见 toSessionEntry）。
const rec = (over = {}) => ({
  taskId: "t1",
  taskText: "写论文",
  durationSecs: 1800,
  startedAt: at(10),
  sessionId: "s1",
  outcome: "completed",
  coinsEarned: 30,
  distractionCount: 0,
  distractionSecs: 0,
  ...over,
});

const act = (over = {}) => ({
  id: "a1",
  type: "add",
  ts: at(9),
  taskId: "t9",
  text: "买菜",
  ...over,
});

describe("focusQuality", () => {
  it("没分心时不给评价（返回 null，而不是「完美」）", () => {
    expect(focusQuality(0, 3600)).toBeNull();
  });

  it("净专注为 0 或负时也不评价 —— 除数无意义", () => {
    expect(focusQuality(5, 0)).toBeNull();
    expect(focusQuality(5, -10)).toBeNull();
  });

  it("按每小时分心次数分三档", () => {
    // 1 次 / 1 小时 = 1.0，落在 deep 的闭区间上界
    expect(focusQuality(1, 3600).cls).toBe("deep");
    // 3 次 / 1 小时 = 3.0，落在 good 的闭区间上界
    expect(focusQuality(3, 3600).cls).toBe("good");
    expect(focusQuality(4, 3600).cls).toBe("scattered");
  });

  it("档位由密度而非绝对次数决定：10 次分心摊到 10 小时仍是 deep", () => {
    expect(focusQuality(10, 36000).cls).toBe("deep");
  });

  it("给的是 i18n key 不是文案（这层不知道当前语言）", () => {
    expect(focusQuality(1, 3600).labelKey).toBe("history.quality.deep");
  });
});

describe("buildDayEntries", () => {
  it("会话卡与使用记录混排，最近的在最上面", () => {
    const entries = buildDayEntries(
      [rec({ startedAt: at(10) })],
      [act({ ts: at(9) }), act({ id: "a2", type: "delete", ts: at(15) })],
    );
    expect(entries.map((e) => e.kind)).toEqual(["activity", "session", "activity"]);
    expect(entries.map((e) => e.ts)).toEqual([at(15), at(10), at(9)]);
  });

  it("同一会话的多条记录合成一张卡，金币累加", () => {
    const entries = buildDayEntries([
      rec({ taskId: "t1", coinsEarned: 30 }),
      rec({ taskId: "t2", coinsEarned: 20 }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("session");
    expect(entries[0].records).toHaveLength(2);
    expect(entries[0].coins).toBe(50);
  });

  it("分心取最大值而非累加 —— 它是整段会话的快照，每条记录上都是同一份", () => {
    const entries = buildDayEntries([
      rec({ taskId: "t1", distractionCount: 3, distractionSecs: 120 }),
      rec({ taskId: "t2", distractionCount: 3, distractionSecs: 120 }),
    ]);
    expect(entries[0].distractionCount).toBe(3);
    expect(entries[0].distractionSecs).toBe(120);
  });

  it("净专注 = 会话时长 - 分心时长，且不会为负", () => {
    const [e] = buildDayEntries([rec({ durationSecs: 600, distractionSecs: 100 })]);
    expect(e.netSecs).toBe(500);

    const [weird] = buildDayEntries([rec({ durationSecs: 60, distractionSecs: 999 })]);
    expect(weird.netSecs).toBe(0);
  });

  it("结束时刻取整段最晚的一条", () => {
    const [e] = buildDayEntries([
      rec({ taskId: "t1", endedAt: at(10, 30) }),
      rec({ taskId: "t2", endedAt: at(11, 15) }),
    ]);
    expect(e.endedAt).toBe(at(11, 15));
  });

  it("旧记录没有 endedAt 时按「开始 + 时长」反推", () => {
    const [e] = buildDayEntries([rec({ startedAt: at(10), durationSecs: 1800 })]);
    expect(e.endedAt).toBe(at(10, 30));
  });

  it("endedAt 早于 startedAt 的脏数据不会让卡片倒着长", () => {
    const [e] = buildDayEntries([
      rec({ startedAt: at(10), durationSecs: 0, endedAt: at(8) }),
    ]);
    expect(e.endedAt).toBe(at(10));
  });

  it("情境标题取整段里第一条有值的", () => {
    const [e] = buildDayEntries([
      rec({ taskId: "t1", scenarioTitle: undefined }),
      rec({ taskId: "t2", scenarioTitle: "图书馆" }),
      rec({ taskId: "t3", scenarioTitle: "咖啡馆" }),
    ]);
    expect(e.scenarioTitle).toBe("图书馆");
  });

  it("挤在 5 分钟内的同类使用记录并成一条（倒脑子一次加十条不刷屏）", () => {
    const entries = buildDayEntries(
      [],
      [
        act({ id: "a1", ts: at(9, 0), text: "买菜" }),
        act({ id: "a2", ts: at(9, 2), text: "还书" }),
        act({ id: "a3", ts: at(9, 30), text: "订票" }),
      ],
    );
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.mark.count)).toEqual([1, 2]);
  });

  it("没有使用记录时可以只传 records", () => {
    expect(buildDayEntries([rec()])).toHaveLength(1);
  });

  it("两边都空时返回空数组", () => {
    expect(buildDayEntries([], [])).toEqual([]);
  });
});

describe("groupDays", () => {
  it("按自然日分组，新的一天在前", () => {
    const days = groupDays([
      rec({ startedAt: at(10, 0, 13) }),
      rec({ startedAt: at(10, 0, 14) }),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].sortTs).toBeGreaterThan(days[1].sortTs);
    expect(days[0].records[0].startedAt).toBe(at(10, 0, 14));
  });

  it("同一天的专注与使用记录落进同一组", () => {
    const days = groupDays([rec({ startedAt: at(10) })], [act({ ts: at(9) })]);
    expect(days).toHaveLength(1);
    expect(days[0].records).toHaveLength(1);
    expect(days[0].activities).toHaveLength(1);
  });

  it("只有使用记录、没专注的日子照样成组 —— 那天确实做了事", () => {
    const days = groupDays([], [act({ ts: at(9, 0, 13) })]);
    expect(days).toHaveLength(1);
    expect(days[0].records).toEqual([]);
    expect(days[0].activities).toHaveLength(1);
  });

  it("分组 key 按年/月/日拆，跨月同号不会撞在一起", () => {
    const days = groupDays([
      rec({ startedAt: new Date(2026, 4, 14, 10).getTime() }),
      rec({ startedAt: new Date(2026, 5, 14, 10).getTime() }),
    ]);
    expect(days).toHaveLength(2);
  });

  it("标题跟随语言", () => {
    const [zh] = groupDays([rec()], [], "zh");
    const [en] = groupDays([rec()], [], "en");
    expect(zh.label).toBe("2026年6月14日");
    expect(en.label).toBe("June 14, 2026");
  });

  it("两边都空时返回空数组", () => {
    expect(groupDays([], [])).toEqual([]);
  });
});

describe("ACTIVITY_ORDER", () => {
  it("完成在前、撤销垫底", () => {
    expect(ACTIVITY_ORDER[0]).toBe("complete");
    expect(ACTIVITY_ORDER[ACTIVITY_ORDER.length - 1]).toBe("uncomplete");
  });
});
