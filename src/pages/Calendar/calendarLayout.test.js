import { describe, it, expect } from "vitest";
import {
  dayKey,
  groupRecordsByDay,
  buildMonthGrid,
  buildDayView,
  formatTime,
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
});

describe("buildDayView", () => {
  it("无记录时返回空轨道", () => {
    const view = buildDayView([], false);
    expect(view.sessions).toEqual([]);
    expect(view.height).toBe(0);
    expect(view.nowTop).toBeNull();
  });

  it("同一会话内多任务合并，coins/distractions 累加、tone 取完成优先", () => {
    const view = buildDayView(
      [
        rec({ sessionId: "s", taskText: "A", outcome: "ended", durationSecs: 3600, coinsEarned: 5, distractionCount: 1, startedAt: at(2026, 6, 1, 9) }),
        rec({ sessionId: "s", taskText: "B", outcome: "completed", durationSecs: 3600, coinsEarned: 3, distractionCount: 2, startedAt: at(2026, 6, 1, 9) }),
      ],
      false,
    );
    expect(view.sessions).toHaveLength(1);
    const s = view.sessions[0];
    expect(s.tasks.map((t) => t.text)).toEqual(["A", "B"]);
    expect(s.tone).toBe("completed"); // 只要有一项完成即视为完成
    expect(s.coins).toBe(8);
    expect(s.distractions).toBe(3);
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

  it("非当天不给当前时刻线", () => {
    const view = buildDayView(
      [rec({ sessionId: "s", startedAt: at(2026, 6, 1, 9) })],
      false,
    );
    expect(view.nowTop).toBeNull();
  });
});

describe("formatTime", () => {
  it("输出 24 小时制 HH:MM", () => {
    expect(formatTime(at(2026, 6, 1, 9, 5))).toBe("09:05");
    expect(formatTime(at(2026, 6, 1, 21, 30))).toBe("21:30");
  });
});
