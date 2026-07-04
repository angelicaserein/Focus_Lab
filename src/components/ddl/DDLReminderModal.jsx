import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/context/TodoContext";
import { useDDL } from "@/context/DDLContext";
import { useLanguage } from "@/context/LanguageContext";
import usePrefs from "@/hooks/common/usePrefs";
import useDDLNotify from "@/hooks/useDDLNotify";
import { getTodayStr } from "@/utils/time";
import { collectDueReminders, countdownLabel, countdownClass } from "@/utils/ddlUtils";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import "./DDLReminderModal.css";

// 调试预览用的示例到期节点：当没有任何真实到期提醒时，强制打开（调试）会用它
// 填充弹窗，让人直观看到"如果有提醒会长什么样"。形状与 collectDueReminders 一致。
const MOCK_PREVIEW_ITEMS = [
  { todo: { id: "mock-1", text: "期末论文" }, checkpoint: { id: "mock-cp-1", message: "完成初稿" }, daysLeft: 2 },
  { todo: { id: "mock-2", text: "项目答辩" }, checkpoint: { id: "mock-cp-2", message: "准备 PPT" }, daysLeft: -1 },
  { todo: { id: "mock-3", text: "课程作业" }, checkpoint: { id: "mock-cp-3", message: "整理文献" }, daysLeft: 0 },
];

export default function DDLReminderModal() {
  const { todos } = useTodos();
  const { checkpointsMap, toggleCheckpointDone, modalForcedOpen, setModalForcedOpen } = useDDL();
  const { notifyEnabled } = usePrefs();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // 后台/最小化时由系统通知兜底（每天一次），与下方前台弹窗互补
  useDDLNotify({ todos, checkpointsMap, enabled: notifyEnabled });

  const [open, setOpen] = useState(false);

  // 自动弹出：有到期节点 且 今天还没关过
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEYS.DDL_MODAL_DISMISSED);
    if (dismissed === getTodayStr()) return;
    const hasDue = collectDueReminders(todos, checkpointsMap).length > 0;
    if (hasDue) setOpen(true);
  // 仅在挂载时执行一次
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOpen = open || modalForcedOpen;

  const dueItems = React.useMemo(
    () => collectDueReminders(todos, checkpointsMap),
    [todos, checkpointsMap]
  );

  // 调试强制打开且没有真实到期项时，用示例数据预览"有提醒"的样子
  const isPreview = modalForcedOpen && dueItems.length === 0;
  const items = isPreview ? MOCK_PREVIEW_ITEMS : dueItems;

  const dismiss = () => {
    // 强制打开（调试）时关闭不写今日已关闭记录
    if (!modalForcedOpen) {
      localStorage.setItem(STORAGE_KEYS.DDL_MODAL_DISMISSED, getTodayStr());
    }
    setOpen(false);
    setModalForcedOpen(false);
  };

  const goToFocus = () => {
    dismiss();
    navigate("/focus");
  };

  if (!isOpen) return null;

  return (
    <div className="ddl-modal-overlay" onClick={dismiss}>
      <div className="ddl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ddl-modal-header">
          <span className="ddl-modal-icon">📅</span>
          <div>
            <div className="ddl-modal-title">{t("ddl.modal.title")}</div>
            <div className="ddl-modal-sub">
              {dueItems.length > 0
                ? t("ddl.modal.sub", { count: dueItems.length })
                : t("ddl.modal.debugPreview")}
            </div>
          </div>
        </div>

        {items.length > 0 ? (
          <ul className="ddl-modal-list">
            {items.map(({ todo, checkpoint, daysLeft }) => (
              <li key={checkpoint.id} className="ddl-modal-item">
                <button
                  className="ddl-modal-check"
                  onClick={() => !isPreview && toggleCheckpointDone(todo.id, checkpoint.id)}
                  title={t("ddl.markDone")}
                >
                  ○
                </button>
                <div className="ddl-modal-item-body">
                  <span className="ddl-modal-task">{todo.text}</span>
                  <span className="ddl-modal-arrow">→</span>
                  <span className="ddl-modal-msg">{checkpoint.message}</span>
                </div>
                <span className={`ddl-modal-tag ${countdownClass(daysLeft)}`}>
                  {countdownLabel(daysLeft, t)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ddl-modal-empty">
            {t("ddl.modal.empty")}
          </div>
        )}

        <div className="ddl-modal-actions">
          <button className="ddl-modal-go" onClick={goToFocus}>
            {t("ddl.modal.goto")}
          </button>
          <button className="ddl-modal-dismiss" onClick={dismiss}>
            {t("ddl.modal.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
