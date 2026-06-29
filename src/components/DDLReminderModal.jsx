import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTodos } from "../context/TodoContext";
import { useDDL } from "../context/DDLContext";
import usePrefs from "../hooks/usePrefs";
import useDDLNotify from "../hooks/useDDLNotify";
import { getTodayStr } from "../utils/time";
import { collectDueReminders, countdownLabel, countdownClass } from "../utils/ddlUtils";
import { STORAGE_KEYS } from "../utils/storageKeys";
import "./DDLReminderModal.css";

export default function DDLReminderModal() {
  const { todos } = useTodos();
  const { checkpointsMap, toggleCheckpointDone, modalForcedOpen, setModalForcedOpen } = useDDL();
  const { notifyEnabled } = usePrefs();
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

  const dismiss = () => {
    // 强制打开（调试）时关闭不写今日已关闭记录
    if (!modalForcedOpen) {
      localStorage.setItem(STORAGE_KEYS.DDL_MODAL_DISMISSED, getTodayStr());
    }
    setOpen(false);
    setModalForcedOpen(false);
  };

  const goToDDL = () => {
    dismiss();
    navigate("/ddl");
  };

  if (!isOpen) return null;

  return (
    <div className="ddl-modal-overlay" onClick={dismiss}>
      <div className="ddl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ddl-modal-header">
          <span className="ddl-modal-icon">📅</span>
          <div>
            <div className="ddl-modal-title">今日 DDL 提醒</div>
            <div className="ddl-modal-sub">
              {dueItems.length > 0
                ? `${dueItems.length} 个提醒节点今日到期`
                : "（调试预览）"}
            </div>
          </div>
        </div>

        {dueItems.length > 0 ? (
          <ul className="ddl-modal-list">
            {dueItems.map(({ todo, checkpoint, daysLeft }) => (
              <li key={checkpoint.id} className="ddl-modal-item">
                <button
                  className="ddl-modal-check"
                  onClick={() => toggleCheckpointDone(todo.id, checkpoint.id)}
                  title="标记为完成"
                >
                  ○
                </button>
                <div className="ddl-modal-item-body">
                  <span className="ddl-modal-task">{todo.text}</span>
                  <span className="ddl-modal-arrow">→</span>
                  <span className="ddl-modal-msg">{checkpoint.message}</span>
                </div>
                <span className={`ddl-modal-tag ${countdownClass(daysLeft)}`}>
                  {countdownLabel(daysLeft)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ddl-modal-empty">
            （这里会列出所有今日到期的提醒节点）
          </div>
        )}

        <div className="ddl-modal-actions">
          <button className="ddl-modal-go" onClick={goToDDL}>
            前往 DDL 页面
          </button>
          <button className="ddl-modal-dismiss" onClick={dismiss}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
