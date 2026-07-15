import { getDaysUntil } from "@/utils/time";
import { isActiveDeadline } from "@/utils/ddlUtils";

// 进站/PWA 启动时的「今天要做什么」提醒的纯函数。
// 把所有未完成任务按紧急度分到互斥的分组里（每条只落最靠前的一组），
// 既覆盖「逾期 / 今天到期 / 今日循环 / 高优先级 / 其他未完成」四种口径，
// 又不会同一条任务重复出现、造成 ADHD 用户过载。

// 「高优先级」＝艾森豪威尔矩阵里「重要且紧急」象限。
const HIGH_PRIORITY = "urgent_important";

// 「临近截止」预警窗口：到期前 1..SOON_DAYS 天自动提醒，无需手动加检查点。
const SOON_DAYS = 3;

// 遍历所有任务，收集今天值得提醒的待办，按分组返回。
// 返回 { overdue, dueToday, soon, recurring, highPriority, others, total }，
// 每组是 [{ todo, daysLeft }]（daysLeft 仅截止相关组有值，其余为 null）。
export function collectTodayTasks(todos) {
  const todayDow = new Date().getDay();
  const overdue = [];
  const dueToday = [];
  const soon = [];
  const recurring = [];
  const highPriority = [];
  const others = [];

  for (const todo of todos) {
    if (todo.completed) continue;

    const active = isActiveDeadline(todo);
    const daysLeft = active ? getDaysUntil(todo.attrs.dueDate) : null;

    if (active && daysLeft < 0) {
      overdue.push({ todo, daysLeft });
    } else if (active && daysLeft === 0) {
      dueToday.push({ todo, daysLeft });
    } else if (active && daysLeft <= SOON_DAYS) {
      soon.push({ todo, daysLeft });
    } else if (todo.recurringDays?.includes(todayDow)) {
      recurring.push({ todo, daysLeft: null });
    } else if (todo.attrs?.priority === HIGH_PRIORITY) {
      highPriority.push({ todo, daysLeft: null });
    } else {
      others.push({ todo, daysLeft });
    }
  }

  const total =
    overdue.length +
    dueToday.length +
    soon.length +
    recurring.length +
    highPriority.length +
    others.length;

  return { overdue, dueToday, soon, recurring, highPriority, others, total };
}
