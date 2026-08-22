import { describe, it, expect } from "vitest";
import {
  HOUR_PX,
  dayKey,
  groupRecordsByDay,
  groupActivitiesByDay,
  buildMonthGrid,
  buildWeekRow,
  buildDayView,
  formatTime,
  formatCellDuration,
  startOfWeek,
} from "./calendarLayout";

// 用本地时间构造时间戳，和被测函数一致（全部走本地日历口径，避免 UTC 偏移）
const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo, d, h, mi).getTime();

// 造一条专注记录；同一 sessionId 视为一次专注
const rec = (over = {}) => ({
  id: over.id ?? `r-${Math.random()}`,
  sessionId: over.sessionId,
  taskText: over.taskText ?? "写论文",
  outcome: over.outcome ?? "completed",
  durationSecs: over.durationSecs ?? 1500,
  startedAt: over.startedAt ?? at(2026, 6, 1, 9, 0),
  coinsEarned: over.coinsEarned ?? 0,
  distractionCount: over.distractionCount ?? 0,
  scenarioTitle: over.scenarioTitle,
});

// 造一条使用记录（加 / 完成 / 删任务，都没开计时器）
const act = (type, ts, text = "倒垃圾") => ({
  id: `a-${type}-${ts}-${Math.random()}`,
  type,
  ts,
  text,
});

describe("dayKey", () => {
  it("按本地时区输出零填充的 YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 6, 1))).toBe("2026-07-01");
    expect(dayKey(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});

describe("groupRecordsByDay", () => {
  it("把记录按本地自然日归组", () => {
    const map = groupRecordsByDay([
      rec({ startedAt: at(2026, 6, 1, 9) }),
      rec({ startedAt: at(2026, 6, 1, 22) }),
      rec({ startedAt: at(2026, 6, 2, 8) }),
    ]);
    expect(map.get("2026-07-01")).toHaveLength(2);
    expect(map.get("2026-07-02")).toHaveLength(1);
  });
});

describe("groupActivitiesByDay", () => {
  it("把使用记录按本地自然日归组", () => {
    const map = groupActivitiesByDay([
      act("add", at(2026, 6, 1, 8)),
      act("complete", at(2026, 6, 1, 23, 59)),
      act("delete", at(2026, 6, 2, 0, 1)),
    ]);
    expect(map.get("2026-07-01")).toHaveLength(2);
    expect(map.get("2026-07-02")).toHaveLength(1);
  });
});

describe("buildMonthGrid", () => {
  const dayMap = groupRecordsByDay([
    // 7/1 一次会话 20 分钟 → level 1（<25 分钟）
    rec({ sessionId: "s1", startedAt: at(2026, 6, 1, 9), durationSecs: 20 * 60 }),
  ]);
  const cells = buildMonthGrid(2026, 6, dayMap, "2026-07-01");

  it("恒返回 42 格并从含 1 号那周的周一起排", () => {
    expect(cells).toHaveLength(42);
    // 2026-07-01 是周三，周一在其前两天 → 6/29
    expect(cells[0].key).toBe("2026-06-29");
    expect(cells[0].inMonth).toBe(false);
  });

  it("标注 inMonth / isToday / 热度等级与会话数", () => {
    const jul1 = cells.find((c) => c.key === "2026-07-01");
    expect(jul1.inMonth).toBe(true);
    expect(jul1.isToday).toBe(true);
    expect(jul1.secs).toBe(20 * 60);
    expect(jul1.level).toBe(1); // 20 分钟落在第 1 档
    expect(jul1.sessionCount).toBe(1);
  });

  it("空白天热度为 0", () => {
    const jul2 = cells.find((c) => c.key === "2026-07-02");
    expect(jul2.secs).toBe(0);
    expect(jul2.level).toBe(0);
  });

  it("没专注但有使用记录的日子带上 actCount", () => {
    const actMap = groupActivitiesByDay([
      act("complete", at(2026, 6, 2, 10)),
      act("add", at(2026, 6, 2, 11)),
    ]);
    const withAct = buildMonthGrid(2026, 6, dayMap, "2026-07-01", actMap);
    const jul2 = withAct.find((c) => c.key === "2026-07-02");
    expect(jul2.secs).toBe(0);
    expect(jul2.actCount).toBe(2);
    // 不传 actMap 时退化为 0，不影响旧调用
    expect(cells.find((c) => c.key === "2026-07-02").actCount).toBe(0);
  });
});

describe("buildDayView", () => {
  it("无记录时返回空轨道", () => {
    const view = buildDayView([], false);
    expect(view.sessions).toEqual([]);
    expect(view.marks).toEqual([]);
    expect(view.height).toBe(0);
    expect(view.nowTop).toBeNull();
  });

  // coins / distractions 是会话级数字，结算时被复制到本会话的每条记录上。
  // 这里用「每条都带同一个值」的真实形状：求和会得到 3 倍，取 max 才是对的。
  it("同一会话内多任务合并，coins/distractions 取会话值不叠加、tone 取完成优先", () => {
    const view = buildDayView(
      [
        rec({ sessionId: "s", taskText: "A", outcome: "ended", durationSecs: 3600, coinsEarned: 600, distractionCount: 2, startedAt: at(2026, 6, 1, 9) }),
        rec({ sessionId: "s", taskText: "B", outcome: "completed", durationSecs: 3600, coinsEarned: 600, distractionCount: 2, startedAt: at(2026, 6, 1, 9) }),
        rec({ sessionId: "s", taskText: "C", outcome: "completed", durationSecs: 3600, coinsEarned: 600, distractionCount: 2, startedAt: at(2026, 6, 1, 9) }),
      ],
      false,
    );
    expect(view.sessions).toHaveLength(1);
    const s = view.sessions[0];
    expect(s.tasks.map((t) => t.text)).toEqual(["A", "B", "C"]);
    expect(s.tone).toBe("completed"); // 只要有一项完成即视为完成
    expect(s.coins).toBe(600);
    expect(s.distractions).toBe(2);
  });

  // 「逐一勾完」路径：每条任务在自己结算的那一刻落一条记录，秒数递增。
  // 金币在会话收尾时按最终秒数发一次，所以显示的也该是最后那条。
  it("逐一勾完的会话取最后一条的金币，而不是各条相加", () => {
    const view = buildDayView(
      [
        rec({ sessionId: "s", taskText: "A", durationSecs: 300, coinsEarned: 300, startedAt: at(2026, 6, 1, 9) }),
        rec({ sessionId: "s", taskText: "B", durationSecs: 900, coinsEarned: 900, startedAt: at(2026, 6, 1, 9) }),
      ],
      false,
    );
    expect(view.sessions[0].coins).toBe(900);
  });

  it("全部移除的会话记为 removed", () => {
    const view = buildDayView(
      [rec({ sessionId: "s", outcome: "removed", startedAt: at(2026, 6, 1, 9) })],
      false,
    );
    expect(view.sessions[0].tone).toBe("removed");
  });

  it("时间重叠的会话分到不同轨道列", () => {
    const view = buildDayView(
      [
        rec({ sessionId: "a", durationSecs: 3600, startedAt: at(2026, 6, 1, 9, 0) }),
        rec({ sessionId: "b", durationSecs: 3600, startedAt: at(2026, 6, 1, 9, 30) }),
      ],
      false,
    );
    const lanes = view.sessions.map((s) => s.lane);
    expect(new Set(lanes).size).toBe(2); // 两条重叠会话不在同一列
    expect(view.sessions[0].lanes).toBe(2);
  });

  it("只有使用记录、没有专注时也排出轨道", () => {
    const view = buildDayView([], false, [
      act("complete", at(2026, 6, 1, 9, 0), "交表"),
      act("add", at(2026, 6, 1, 14, 0), "买菜"),
    ]);
    expect(view.sessions).toEqual([]);
    expect(view.marks).toHaveLength(2);
    expect(view.startHour).toBe(9);
    // 9:00 那条落在轨道顶端，14:00 那条在 5 小时之后
    expect(view.marks[0].top).toBe(0);
    expect(view.marks[1].top).toBeCloseTo(5 * HOUR_PX, 5);
    expect(view.counts).toEqual({ complete: 1, add: 1 });
  });

  it("时间范围同时覆盖专注与晚于它的使用记录", () => {
    const view = buildDayView(
      [rec({ sessionId: "s", durationSecs: 1800, startedAt: at(2026, 6, 1, 9, 0) })],
      false,
      [act("delete", at(2026, 6, 1, 16, 20), "退掉的课")],
    );
    expect(view.startHour).toBe(9);
    expect(view.height).toBeGreaterThanOrEqual(7 * HOUR_PX); // 至少排到 16 点之后
    expect(view.marks[0].top).toBeCloseTo(7 * HOUR_PX + 20 * (HOUR_PX / 60), 5);
  });

  it("同类动作挤在 5 分钟内并成一条，跨类型不合并", () => {
    const view = buildDayView([], false, [
      act("add", at(2026, 6, 1, 9, 0), "写引言"),
      act("add", at(2026, 6, 1, 9, 2), "写方法"),
      act("add", at(2026, 6, 1, 9, 3), "写结论"),
      act("complete", at(2026, 6, 1, 9, 4), "写引言"),
    ]);
    expect(view.marks).toHaveLength(2);
    expect(view.marks[0].count).toBe(3);
    expect(view.marks[0].text).toBe("写引言"); // 展示首条，其余进 texts
    expect(view.marks[0].texts).toHaveLength(3);
    expect(view.marks[1].type).toBe("complete");
    expect(view.counts).toEqual({ add: 3, complete: 1 });
  });

  it("时刻挨太近的记录被顺次下推，轨道跟着长高", () => {
    const view = buildDayView([], false, [
      act("add", at(2026, 6, 1, 9, 0)),
      act("complete", at(2026, 6, 1, 9, 1)),
      act("delete", at(2026, 6, 1, 9, 2)),
    ]);
    const tops = view.marks.map((m) => m.top);
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(26);
    }
    expect(view.height).toBeGreaterThanOrEqual(tops[tops.length - 1]);
    expect(view.marks[2].shifted).toBe(true);
  });

  it("非当天不给当前时刻线", () => {
    const view = buildDayView(
      [rec({ sessionId: "s", startedAt: at(2026, 6, 1, 9) })],
      false,
    );
    expect(view.nowTop).toBeNull();
  });
});

describe("startOfWeek / buildWeekRow", () => {
  it("周日属于上一周（周一开头）", () => {
    expect(dayKey(startOfWeek(new Date(2026, 7, 2)))).toBe("2026-07-27"); // 周日
    expect(dayKey(startOfWeek(new Date(2026, 7, 3)))).toBe("2026-08-03"); // 周一
  });

  it("从周一起给七格，跨月也不置灰，并带上当天时长", () => {
    const dayMap = groupRecordsByDay([
      rec({ sessionId: "s1", startedAt: at(2026, 7, 3, 9), durationSecs: 1500 }),
    ]);
    const cells = buildWeekRow(new Date(2026, 6, 27), dayMap, "2026-07-27");
    expect(cells).toHaveLength(7);
    expect(cells[0].key).toBe("2026-07-27");
    expect(cells[6].key).toBe("2026-08-02");
    expect(cells.every((c) => c.inMonth)).toBe(true);
    expect(cells[0].isToday).toBe(true);
    expect(buildWeekRow(new Date(2026, 7, 3), dayMap, "")[0].secs).toBe(1500);
  });
});

describe("formatCellDuration", () => {
  it("不足一分钟不显示，其余压成短标签", () => {
    expect(formatCellDuration(0)).toBe("");
    expect(formatCellDuration(45)).toBe("");
    expect(formatCellDuration(1500)).toBe("25m");
    expect(formatCellDuration(3600)).toBe("1h");
    expect(formatCellDuration(4800)).toBe("1h20");
    expect(formatCellDuration(3660)).toBe("1h01");
  });
});

describe("formatTime", () => {
  it("输出 24 小时制 HH:MM", () => {
    expect(formatTime(at(2026, 6, 1, 9, 5))).toBe("09:05");
    expect(formatTime(at(2026, 6, 1, 21, 30))).toBe("21:30");
  });
});
