import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  countdownLabel,
  countdownClass,
  formatDueDate,
  isCheckpointDue,
  isActiveDeadline,
  collectDueReminders,
} from "@/utils/ddlUtils";

// 假翻译函数：把 key 和插值原样拼出来，断言「传了哪个 key、带了什么参数」，
// 而不去耦合具体文案（文案改了不该弄红这些测试）。
const t = (key, params) =>
  params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(",")})` : key;

const todo = (over = {}) => ({
  id: "t1",
  text: "写论文",
  completed: false,
  attrs: { dueDate: "2026-06-20" },
  ...over,
});

const cp = (over = {}) => ({ id: "c1", done: false, daysBeforeDeadline: 3, ...over });

describe("countdownLabel", () => {
  it("无截止日（null）返回空串", () => {
    expect(countdownLabel(null, t)).toBe("");
  });

  it("过期时传正数天数给 overdue 文案", () => {
    expect(countdownLabel(-3, t)).toBe("ddl.countdown.overdue(days=3)");
  });

  it("今天 / 明天用各自的专属文案，不带天数", () => {
    expect(countdownLabel(0, t)).toBe("ddl.countdown.today");
    expect(countdownLabel(1, t)).toBe("ddl.countdown.tomorrow");
  });

  it("两天及以上用通用天数文案", () => {
    expect(countdownLabel(2, t)).toBe("ddl.countdown.days(days=2)");
  });
});

describe("countdownClass", () => {
  it("无截止日无样式", () => {
    expect(countdownClass(null)).toBe("");
  });

  it("过期为 overdue", () => {
    expect(countdownClass(-1)).toBe("overdue");
  });

  it("3 天内（含今天）为 urgent", () => {
    expect(countdownClass(0)).toBe("urgent");
    expect(countdownClass(3)).toBe("urgent");
  });

  it("4 天及以上无样式", () => {
    expect(countdownClass(4)).toBe("");
  });
});

describe("formatDueDate", () => {
  it("空值返回空串", () => {
    expect(formatDueDate("", t)).toBe("");
    expect(formatDueDate(null, t)).toBe("");
  });

  it("拆出月/日并去掉前导零", () => {
    expect(formatDueDate("2026-06-09", t)).toBe("ddl.due(m=6,d=9)");
  });
});

describe("isCheckpointDue", () => {
  it("已完成的节点不再提醒", () => {
    expect(isCheckpointDue(cp({ done: true }), 0)).toBe(false);
  });

  it("无截止日（daysLeft 为 null）不提醒", () => {
    expect(isCheckpointDue(cp(), null)).toBe(false);
  });

  it("进入提醒窗口即到期（含边界当天）", () => {
    expect(isCheckpointDue(cp({ daysBeforeDeadline: 3 }), 3)).toBe(true);
    expect(isCheckpointDue(cp({ daysBeforeDeadline: 3 }), 1)).toBe(true);
  });

  it("窗口外不提醒", () => {
    expect(isCheckpointDue(cp({ daysBeforeDeadline: 3 }), 4)).toBe(false);
  });

  it("已过期（负数天）仍然提醒", () => {
    expect(isCheckpointDue(cp({ daysBeforeDeadline: 3 }), -2)).toBe(true);
  });
});

describe("isActiveDeadline", () => {
  it("没填日期就不是 DDL", () => {
    expect(isActiveDeadline({ attrs: {} })).toBe(false);
    expect(isActiveDeadline({})).toBe(false);
  });

  it("填了日期且开关缺省（老数据）视为开启", () => {
    expect(isActiveDeadline(todo())).toBe(true);
  });

  it("只有显式 false 才算关闭", () => {
    expect(isActiveDeadline(todo({ attrs: { dueDate: "2026-06-20", dueDateActive: false } }))).toBe(false);
    expect(isActiveDeadline(todo({ attrs: { dueDate: "2026-06-20", dueDateActive: true } }))).toBe(true);
  });
});

describe("collectDueReminders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 14, 10, 0, 0)); // 距 2026-06-20 还有 6 天
  });
  afterEach(() => vi.useRealTimers());

  it("已完成的任务整个跳过", () => {
    const list = collectDueReminders([todo({ completed: true })], { t1: [cp({ daysBeforeDeadline: 30 })] });
    expect(list).toEqual([]);
  });

  it("关掉截止开关的任务不提醒", () => {
    const t2 = todo({ attrs: { dueDate: "2026-06-20", dueDateActive: false } });
    expect(collectDueReminders([t2], { t1: [cp({ daysBeforeDeadline: 30 })] })).toEqual([]);
  });

  it("没有节点的任务不产出提醒", () => {
    expect(collectDueReminders([todo()], {})).toEqual([]);
  });

  it("只收窗口内的节点，并带上剩余天数", () => {
    const list = collectDueReminders([todo()], {
      t1: [
        cp({ id: "near", daysBeforeDeadline: 7 }), // 6 <= 7 命中
        cp({ id: "far", daysBeforeDeadline: 3 }), // 6 > 3 不命中
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0].checkpoint.id).toBe("near");
    expect(list[0].daysLeft).toBe(6);
    expect(list[0].todo.id).toBe("t1");
  });

  it("同一任务的多个命中节点各产出一条", () => {
    const list = collectDueReminders([todo()], {
      t1: [cp({ id: "a", daysBeforeDeadline: 7 }), cp({ id: "b", daysBeforeDeadline: 10 })],
    });
    expect(list.map((r) => r.checkpoint.id)).toEqual(["a", "b"]);
  });

  it("跨多个任务汇总", () => {
    const t2 = todo({ id: "t2", attrs: { dueDate: "2026-06-15" } });
    const list = collectDueReminders([todo(), t2], {
      t1: [cp({ daysBeforeDeadline: 7 })],
      t2: [cp({ daysBeforeDeadline: 1 })],
    });
    expect(list.map((r) => r.todo.id)).toEqual(["t1", "t2"]);
  });
});
