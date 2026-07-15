import { describe, it, expect } from "vitest";
import { collectTodayTasks } from "@/utils/taskReminderUtils";
import { addDays } from "@/utils/time";

// 构造一个带截止日的任务
const withDue = (id, days, extra = {}) => ({
  id,
  text: id,
  completed: false,
  attrs: { dueDate: addDays(days) },
  ...extra,
});

describe("collectTodayTasks", () => {
  it("按紧急度把任务分到互斥分组，且每条只落一组", () => {
    const todayDow = new Date().getDay();
    const todos = [
      withDue("overdue", -2),
      withDue("today", 0),
      withDue("soon", 2),
      withDue("far", 30),
      { id: "recurring", text: "r", completed: false, recurringDays: [todayDow] },
      { id: "high", text: "h", completed: false, attrs: { priority: "urgent_important" } },
      { id: "plain", text: "p", completed: false },
    ];

    const g = collectTodayTasks(todos);

    expect(g.overdue.map((x) => x.todo.id)).toEqual(["overdue"]);
    expect(g.dueToday.map((x) => x.todo.id)).toEqual(["today"]);
    expect(g.soon.map((x) => x.todo.id)).toEqual(["soon"]);
    expect(g.recurring.map((x) => x.todo.id)).toEqual(["recurring"]);
    expect(g.highPriority.map((x) => x.todo.id)).toEqual(["high"]);
    // 远期截止 + 无截止普通任务都进 others
    expect(g.others.map((x) => x.todo.id).sort()).toEqual(["far", "plain"]);
    expect(g.total).toBe(7);
  });

  it("已完成任务不计入；截止相关分组带 daysLeft", () => {
    const g = collectTodayTasks([
      withDue("done", 0, { completed: true }),
      withDue("od", -1),
    ]);
    expect(g.total).toBe(1);
    expect(g.overdue[0].daysLeft).toBe(-1);
  });

  it("dueDateActive=false 的日期不算截止，落入 others", () => {
    const g = collectTodayTasks([
      { id: "x", text: "x", completed: false, attrs: { dueDate: addDays(0), dueDateActive: false } },
    ]);
    expect(g.dueToday).toHaveLength(0);
    expect(g.others.map((x) => x.todo.id)).toEqual(["x"]);
  });
});
