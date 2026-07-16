import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getTodayStr,
  toDateStr,
  addDays,
  getElapsedSecs,
  formatClock,
  formatDuration,
  formatDurationChinese,
  formatSessionDate,
  formatRelativeTime,
  formatRecordDate,
  getDaysUntil,
} from "@/utils/time";

// 依赖「现在」的用例一律冻结系统时间，断言字面值——
// 若照着实现反算 expected，测试会跟着 bug 一起错，等于没测。
// 基准：2026-06-14 14:30:00（本地时间构造，与被测函数的本地口径一致）。
const NOW = new Date(2026, 5, 14, 14, 30, 0);

const freezeAt = (d = NOW) => {
  vi.useFakeTimers();
  vi.setSystemTime(d);
};

describe("getTodayStr", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  it("返回本地年月日，月/日补零", () => {
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(getTodayStr()).toBe("2026-01-05");
  });

  // 回归：曾用 toISOString() 取日期，UTC+8 的凌晨 0–8 点会返回昨天，
  // 导致循环任务凌晨漏重置、DDL「今日去重」失效（见 commit 43213b7）。
  it("凌晨仍返回今天，不因 UTC 偏移退回昨天", () => {
    vi.setSystemTime(new Date(2026, 5, 14, 0, 30, 0));
    expect(getTodayStr()).toBe("2026-06-14");
  });

  it("深夜不提前跳到次日", () => {
    vi.setSystemTime(new Date(2026, 5, 14, 23, 59, 59));
    expect(getTodayStr()).toBe("2026-06-14");
  });
});

describe("toDateStr", () => {
  it("Date → 本地 YYYY-MM-DD", () => {
    expect(toDateStr(new Date(2026, 10, 3, 9, 0, 0))).toBe("2026-11-03");
  });

  it("用本地年月日而非 UTC：凌晨不退回前一天", () => {
    expect(toDateStr(new Date(2026, 5, 14, 0, 5, 0))).toBe("2026-06-14");
  });
});

describe("addDays", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  it("0 = 今天，1 = 明天，-1 = 昨天", () => {
    expect(addDays(0)).toBe("2026-06-14");
    expect(addDays(1)).toBe("2026-06-15");
    expect(addDays(-1)).toBe("2026-06-13");
  });

  it("跨年正确进位", () => {
    vi.setSystemTime(new Date(2026, 11, 31, 10, 0, 0));
    expect(addDays(1)).toBe("2027-01-01");
  });

  it("跨月回退正确借位", () => {
    vi.setSystemTime(new Date(2026, 6, 1, 10, 0, 0));
    expect(addDays(-1)).toBe("2026-06-30");
  });
});

describe("getElapsedSecs", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  it("按秒四舍五入", () => {
    expect(getElapsedSecs(Date.now() - 5000)).toBe(5);
    expect(getElapsedSecs(Date.now() - 5400)).toBe(5);
    expect(getElapsedSecs(Date.now() - 5600)).toBe(6);
  });

  it("同一时刻为 0", () => {
    expect(getElapsedSecs(Date.now())).toBe(0);
  });
});

describe("formatClock", () => {
  it("分秒都补零到两位", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(9)).toBe("00:09");
    expect(formatClock(90)).toBe("01:30");
  });

  it("超过 60 分钟不进位到小时，分钟继续累加", () => {
    expect(formatClock(3600)).toBe("60:00");
    expect(formatClock(3661)).toBe("61:01");
  });
});

describe("formatDuration", () => {
  it("不足 1 分钟只显示秒", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
  });

  it("整分钟省略秒", () => {
    expect(formatDuration(120)).toBe("2m");
  });

  it("有余秒时分秒都显示", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });
});

describe("formatDurationChinese", () => {
  it("0 / 负数 / 空值都归为「0分钟」", () => {
    expect(formatDurationChinese(0)).toBe("0分钟");
    expect(formatDurationChinese(-10)).toBe("0分钟");
    expect(formatDurationChinese(undefined)).toBe("0分钟");
  });

  it("不足 1 分钟显示秒", () => {
    expect(formatDurationChinese(45)).toBe("45秒");
  });

  it("不足 1 小时显示分钟（向下取整）", () => {
    expect(formatDurationChinese(90)).toBe("1分钟");
    expect(formatDurationChinese(3599)).toBe("59分钟");
  });

  it("满 1 小时显示时分，整点省略分", () => {
    expect(formatDurationChinese(5400)).toBe("1小时30分");
    expect(formatDurationChinese(3600)).toBe("1小时");
  });
});

describe("formatSessionDate", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  it("同一自然日为「今天」，与时刻无关", () => {
    expect(formatSessionDate(new Date(2026, 5, 14, 0, 1, 0).getTime())).toBe("今天");
    expect(formatSessionDate(new Date(2026, 5, 14, 23, 59, 0).getTime())).toBe("今天");
  });

  it("前一个自然日为「昨天」", () => {
    expect(formatSessionDate(new Date(2026, 5, 13, 22, 0, 0).getTime())).toBe("昨天");
  });

  it("更早的日期显示「X月X日」", () => {
    expect(formatSessionDate(new Date(2026, 5, 10, 9, 0, 0).getTime())).toBe("6月10日");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const ago = (ms) => Date.now() - ms;

  it("空值返回破折号", () => {
    expect(formatRelativeTime(0)).toBe("—");
    expect(formatRelativeTime(null)).toBe("—");
  });

  it("不足 1 分钟为「刚刚」", () => {
    expect(formatRelativeTime(ago(30_000))).toBe("刚刚");
  });

  it("分钟 / 小时 / 天 / 周 / 月 逐级降级", () => {
    expect(formatRelativeTime(ago(5 * MIN))).toBe("5分钟前");
    expect(formatRelativeTime(ago(3 * HOUR))).toBe("3小时前");
    expect(formatRelativeTime(ago(1 * DAY))).toBe("昨天");
    expect(formatRelativeTime(ago(3 * DAY))).toBe("3天前");
    expect(formatRelativeTime(ago(10 * DAY))).toBe("1周前");
    expect(formatRelativeTime(ago(60 * DAY))).toBe("2个月前");
  });

  it("各档边界仍留在下界档位", () => {
    expect(formatRelativeTime(ago(59 * MIN))).toBe("59分钟前");
    expect(formatRelativeTime(ago(23 * HOUR))).toBe("23小时前");
  });
});

describe("formatRecordDate", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  it("今天带「今天」前缀和 24 小时制时刻", () => {
    expect(formatRecordDate(new Date(2026, 5, 14, 9, 5, 0).getTime())).toBe("今天 09:05");
  });

  it("昨天带「昨天」前缀", () => {
    expect(formatRecordDate(new Date(2026, 5, 13, 18, 0, 0).getTime())).toBe("昨天 18:00");
  });

  it("更早的记录不带今天/昨天前缀", () => {
    const out = formatRecordDate(new Date(2026, 5, 1, 12, 0, 0).getTime());
    expect(out).not.toMatch(/今天|昨天/);
  });

  it("跨年的同月同日不误判为今天", () => {
    // 只比日/月会把去年的 6-14 当成今天，故实现里必须同时比年份。
    const out = formatRecordDate(new Date(2025, 5, 14, 14, 30, 0).getTime());
    expect(out).not.toMatch(/今天|昨天/);
  });
});

describe("getDaysUntil", () => {
  beforeEach(() => freezeAt());
  afterEach(() => vi.useRealTimers());

  it("无截止日返回 null", () => {
    expect(getDaysUntil(null)).toBe(null);
    expect(getDaysUntil("")).toBe(null);
  });

  it("今天为 0，未来为正，过期为负", () => {
    expect(getDaysUntil("2026-06-14")).toBe(0);
    expect(getDaysUntil("2026-06-15")).toBe(1);
    expect(getDaysUntil("2026-06-13")).toBe(-1);
    expect(getDaysUntil("2026-06-21")).toBe(7);
  });

  // 当前时刻 14:30，但比较前把今天归零到 00:00；
  // 否则「明天」会因不足 24 小时被算成 0 天。
  it("按自然日比较，不受当前时刻影响", () => {
    vi.setSystemTime(new Date(2026, 5, 14, 23, 50, 0));
    expect(getDaysUntil("2026-06-15")).toBe(1);
  });
});
