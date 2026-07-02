import { getDaysUntil } from "./time";

// DDL（截止日期）提醒相关的纯函数。
// 供 DDLContext（badge）、DDLReminders 页面、DDLReminderModal 弹窗共用，
// 保证倒计时文案 / 到期判断 / 今日提醒列表三处逻辑完全一致。

// 距截止天数 → 倒计时文案。days 为 null（无截止日）时返回空串。
export function countdownLabel(days) {
  if (days === null) return "";
  if (days < 0) return `已过期 ${-days} 天`;
  if (days === 0) return "今天截止";
  if (days === 1) return "明天截止";
  return `还有 ${days} 天`;
}

// 距截止天数 → 倒计时样式类（overdue / urgent / ""）。
export function countdownClass(days) {
  if (days === null) return "";
  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  return "";
}

// "YYYY-MM-DD" → 本地化的到期日期文案
export function formatDueDate(str, t) {
  if (!str) return "";
  const [, m, d] = str.split("-");
  return t("ddl.due", { m: parseInt(m), d: parseInt(d) });
}

// 提醒节点是否"今日到期"：未完成 且 剩余天数已进入提醒窗口。
export function isCheckpointDue(cp, daysLeft) {
  return !cp.done && daysLeft !== null && daysLeft <= cp.daysBeforeDeadline;
}

// 任务的日期是否「真正的截止日期」：填了日期 且 截止开关没关闭。
// dueDateActive 缺省（老数据 / 新填日期）视为开启，只有显式 false 才算关闭。
// 这是主页截止图、DDL 提醒、Sidebar 角标判断「是否 DDL」的单一标准。
export function isActiveDeadline(todo) {
  return !!todo.attrs?.dueDate && todo.attrs?.dueDateActive !== false;
}

// 遍历所有任务，收集今日到期的提醒节点。
// 作为 Sidebar badge / DDL 页今日提醒 / 弹窗列表的单一数据源。
// 返回 [{ todo, checkpoint, daysLeft }]。
export function collectDueReminders(todos, checkpointsMap) {
  const result = [];
  for (const todo of todos) {
    if (todo.completed || !isActiveDeadline(todo)) continue;
    const cps = checkpointsMap[todo.id] || [];
    const daysLeft = getDaysUntil(todo.attrs.dueDate);
    for (const cp of cps) {
      if (isCheckpointDue(cp, daysLeft)) {
        result.push({ todo, checkpoint: cp, daysLeft });
      }
    }
  }
  return result;
}
