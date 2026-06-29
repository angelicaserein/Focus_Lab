import { useEffect } from "react";
import { collectDueReminders } from "../utils/ddlUtils";
import { showNotification, notifyPermission } from "../utils/notify";
import { getTodayStr } from "../utils/time";
import { STORAGE_KEYS } from "../utils/storageKeys";

// 应用加载时，若启用了通知且有「今日到期」的 DDL 提醒，弹一次系统通知（每天至多一次）。
//
// 与应用内弹窗（DDLReminderModal）相互独立、互补：
//   • 弹窗   → 用户正打开着应用时的前台展示；
//   • 通知   → 覆盖「页面在后台标签页 / 窗口最小化」的场景，系统层弹出。
// 各自用独立的「今日已触发」标记，互不影响。
export default function useDDLNotify({ todos, checkpointsMap, enabled }) {
  useEffect(() => {
    if (!enabled || notifyPermission() !== "granted") return;
    if (localStorage.getItem(STORAGE_KEYS.DDL_NOTIFIED) === getTodayStr()) return;

    const due = collectDueReminders(todos, checkpointsMap);
    if (due.length === 0) return;

    const first = due[0];
    const extra = due.length > 1 ? ` 等 ${due.length} 项` : "";
    showNotification("📅 今日 DDL 提醒", {
      body: `${first.todo.text} → ${first.checkpoint.message}${extra}`,
      tag: "ddl-due",
    });
    localStorage.setItem(STORAGE_KEYS.DDL_NOTIFIED, getTodayStr());
    // 仅挂载时执行一次（与弹窗一致，避免数据变动反复触发）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
