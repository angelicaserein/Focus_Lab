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

// "YYYY-MM-DD" → "M月D日截止"
export function formatDueDate(str) {
  if (!str) return "";
  const [, m, d] = str.split("-");
  return `${parseInt(m)}月${parseInt(d)}日截止`;
}

// 提醒节点是否"今日到期"：未完成 且 剩余天数已进入提醒窗口。
export function isCheckpointDue(cp, daysLeft) {
  return !cp.done && daysLeft !== null && daysLeft <= cp.daysBeforeDeadline;
}

// 遍历所有任务，收集今日到期的提醒节点。
// 作为 Sidebar badge / DDL 页今日提醒 / 弹窗列表的单一数据源。
// 返回 [{ todo, checkpoint, daysLeft }]。
export function collectDueReminders(todos, checkpointsMap) {
  const result = [];
  for (const todo of todos) {
    if (todo.completed || !todo.attrs?.dueDate) continue;
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
