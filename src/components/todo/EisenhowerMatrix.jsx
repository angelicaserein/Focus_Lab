import React, { useMemo, useState } from "react";
import { useTodos } from "@/context/TodoContext";
import { useFocus } from "@/context/FocusContext";
import { useLanguage } from "@/context/LanguageContext";
import { assignMatrixPositions } from "@/utils/ai/aiMatrixAssign";
import { useMatrixDrag } from "@/hooks/task/useMatrixDrag";
import {
  clamp,
  scaleFor,
  isPlaced,
  PLANE_X_MIN,
  PLANE_X_MAX,
  PLANE_Y_MIN,
  PLANE_Y_MAX,
} from "@/utils/task/matrixGeometry";
import MatrixSortDialog from "./MatrixSortDialog";
import "./EisenhowerMatrix.css";

// 紧急/重要优先级平面（艾森豪威尔矩阵的连续版）：
//   不再是四个硬格子，而是一整块平面——任务可拖到任意位置。
//   横轴＝紧急度（左紧急、右不紧急），纵轴＝重要度（上重要、下不重要）。
//   背景红→蓝热力渐变：越靠左上越「热」（重要且紧急）。
//   落点写入 todo.matrixPos={x,y}（均为 0..1）；拖回底部托盘则清空定位。
//   卡片大小随落点变化：越靠左上越大——拖动时用指针事件驱动，
//   跟随光标的「幽灵卡」会实时缩放，边拖边变大/变小。
//   点击标签＝加入/移出本次专注（与左栏「已选任务」联动）。
//
// 拖拽细节抽到 useMatrixDrag，两步归类弹窗抽到 MatrixSortDialog，几何换算在 matrixGeometry。

function TaskTag({ todo, focused, settling, dragging, onActivate, onDelete, onPointerDown, onSort, sortCta, sortAria, deleteAria }) {
  return (
    <span
      className={`matrix-tag${focused ? " focused" : ""}${settling ? " settling" : ""}${dragging ? " dragging" : ""}`}
      onPointerDown={(e) => onPointerDown(e, todo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate(todo.id);
        }
      }}
      title={todo.text}
    >
      <span className="matrix-tag-text">{todo.text}</span>
      {onSort && (
        <button
          type="button"
          className="matrix-tag-sort"
          onClick={(e) => {
            e.stopPropagation();
            onSort(todo.id);
          }}
          aria-label={sortAria}
        >
          {sortCta}
        </button>
      )}
      <button
        type="button"
        className="matrix-tag-del"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        aria-label={deleteAria}
      >
        ×
      </button>
    </span>
  );
}

export default function EisenhowerMatrix() {
  const { todos, addTodo, updateTodoProps, deleteTodo } = useTodos();
  const { isFocused, toggleFocusTodo } = useFocus();
  const { t } = useLanguage();

  const [draft, setDraft] = useState("");
  const [settlingId, setSettlingId] = useState(null);
  // 「分一下」两步问答：sortId=正在归类的任务，sortUrgent=第一题答案（null 表示还在第一步）
  const [sortId, setSortId] = useState(null);
  const [sortUrgent, setSortUrgent] = useState(null);
  // AI 自动分配：aiBusy=正在请求，aiError=上次失败提示
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);

  // 拖拽：落在平面写落点并触发落座动画，拖回托盘清定位，轻点则切换专注选择
  const { drag, planeRef, trayRef, handlePointerDown } = useMatrixDrag({
    onPlace: (id, pos) => {
      updateTodoProps(id, { matrixPos: pos });
      setSettlingId(id);
    },
    onTray: (id) => updateTodoProps(id, { matrixPos: undefined }),
    onActivate: toggleFocusTodo,
  });

  // 未完成任务：有合法坐标者摆在平面上，其余进入底部「未分类」托盘
  const { placed, unplaced } = useMemo(() => {
    const placed = [];
    const unplaced = [];
    for (const todo of todos) {
      if (todo.completed) continue;
      (isPlaced(todo) ? placed : unplaced).push(todo);
    }
    return { placed, unplaced };
  }, [todos]);

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addTodo(text);
    setDraft("");
  };

  // 「分一下」两步问答
  const startSort = (id) => {
    setSortId(id);
    setSortUrgent(null);
  };
  const cancelSort = () => {
    setSortId(null);
    setSortUrgent(null);
  };
  // 第一步记下紧急度答案；第二步作答后收尾落位
  const answerSort = (value) => {
    if (sortUrgent === null) setSortUrgent(value);
    else finishSort(value);
  };
  // 把紧急/重要两答案换算成象限坐标并落位
  //   横轴：左＝紧急(0.27)、右＝不紧急(0.73)；纵轴：上＝重要(0.27)、下＝不重要(0.73)
  //   加轻微抖动，避免同象限多张卡完全重叠
  const finishSort = (important) => {
    if (!sortId) return;
    const jitter = () => (Math.random() - 0.5) * 0.12;
    const x = clamp((sortUrgent ? 0.27 : 0.73) + jitter(), PLANE_Y_MIN, PLANE_Y_MAX);
    const y = clamp((important ? 0.27 : 0.73) + jitter(), PLANE_Y_MIN, PLANE_Y_MAX);
    updateTodoProps(sortId, { matrixPos: { x, y } });
    setSettlingId(sortId);
    setSortId(null);
    setSortUrgent(null);
  };

  // AI 自动分配：把托盘里的未分类任务一次性交给模型估紧急/重要度，
  //   换算成落点写入 matrixPos。urgency→x（越紧急越靠左）、importance→y（越重要越靠上）。
  //   加轻微抖动，避免同分任务完全重叠；失败/无结果给一句温柔提示。
  const autoAssign = async () => {
    if (aiBusy || unplaced.length === 0) return;
    setAiBusy(true);
    setAiError(false);
    try {
      const tasks = unplaced.map((td) => ({ id: td.id, text: td.text, attrs: td.attrs }));
      const { positions } = await assignMatrixPositions(tasks);
      let applied = 0;
      const jitter = () => (Math.random() - 0.5) * 0.06;
      for (const td of unplaced) {
        const p = positions[td.id];
        if (!p) continue;
        const x = clamp(1 - p.urgency + jitter(), PLANE_X_MIN, PLANE_X_MAX);
        const y = clamp(1 - p.importance + jitter(), PLANE_Y_MIN, PLANE_Y_MAX);
        updateTodoProps(td.id, { matrixPos: { x, y } });
        applied++;
      }
      if (applied === 0) {
        // 调用成功但一条落点都没算出来：多半是模型返回被截断/解析为空
        console.warn("[matrixAssign] 空结果：模型未返回可用落点", { asked: unplaced.length, positions });
        setAiError(true);
      }
    } catch (e) {
      // API 调用本身抛错（网络/鉴权/模型报错）
      console.error("[matrixAssign] 调用失败", e);
      setAiError(true);
    } finally {
      setAiBusy(false);
    }
  };

  const sortTodo = sortId ? todos.find((td) => td.id === sortId) : null;

  const renderTag = (todo, sortable = false) => (
    <TaskTag
      key={todo.id}
      todo={todo}
      focused={isFocused(todo.id)}
      settling={settlingId === todo.id}
      dragging={drag?.id === todo.id}
      onActivate={toggleFocusTodo}
      onDelete={deleteTodo}
      onPointerDown={handlePointerDown}
      onSort={sortable ? startSort : undefined}
      sortCta={t("focus.matrix.sortCta")}
      sortAria={t("focus.matrix.sortAria", { text: todo.text })}
      deleteAria={t("focus.matrix.deleteAria", { text: todo.text })}
    />
  );

  const overPlane = drag?.zone === "plane";
  const overTray = drag?.zone === "tray";

  // 天平：整块平面架在正中的支点上，按卡片「加权重心」偏移向重的一侧倾倒。
  //   质量＝卡片大小（越靠左上越重）；重心越偏离中心，倾角越大。
  //   正在拖动的卡片也计入，于是拖动时板子实时跟着倒。
  const tilt = useMemo(() => {
    let mass = 0;
    let sx = 0;
    let sy = 0;
    const add = (x, y, m) => {
      mass += m;
      sx += m * x;
      sy += m * y;
    };
    for (const td of placed) {
      add(td.matrixPos.x, td.matrixPos.y, scaleFor(td.matrixPos.x, td.matrixPos.y));
    }
    if (drag && drag.zone === "plane") add(drag.fx, drag.fy, drag.scale);
    if (mass === 0) return { rx: 0, ry: 0 };
    const cx = sx / mass - 0.5; // 重心相对中心的水平偏移 (-0.5..0.5)
    const cy = sy / mass - 0.5; // 垂直偏移
    const GAIN = 13; // 每单位偏移对应的倾角（度）
    const cap = (v) => Math.max(-6, Math.min(6, v));
    // 载荷偏下 → 下沿沉；偏右 → 右沿沉（放哪边哪边压下去）
    return { rx: cap(-cy * GAIN), ry: cap(cx * GAIN) };
  }, [placed, drag]);

  return (
    <div className="matrix-container" aria-label={t("focus.matrix.title")}>
      <div className="matrix-header">
        <span className="matrix-title">
          {t("focus.matrix.title")}
          {/* 信息提示（help icon）：悬停/聚焦时说明整张热力图的含义 */}
          <span className="matrix-info">
            <button
              type="button"
              className="matrix-info-btn"
              aria-label={t("focus.matrix.infoAria")}
            >
              ?
            </button>
            <span className="matrix-info-tip" role="tooltip">
              {t("focus.matrix.info")}
            </span>
          </span>
        </span>
        <span className="matrix-hint">{t("focus.matrix.hint")}</span>
      </div>

      <form className="matrix-form" onSubmit={submit}>
        <input
          className="matrix-input"
          placeholder={t("focus.matrix.addPlaceholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={t("focus.matrix.addPlaceholder")}
        />
        <button type="submit" className="matrix-add">
          {t("focus.matrix.add")}
        </button>
      </form>

      <div className="matrix-board">
        <div
          ref={planeRef}
          className={`matrix-plane${overPlane ? " drag-over" : ""}`}
          style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
        >
          {placed.length === 0 && (
            <span className="matrix-plane-empty">{t("focus.matrix.dropHere")}</span>
          )}

          {placed.map((todo) => {
            // 越靠左上（重要且紧急）卡片越大：以到左上角的接近度换算缩放
            const weight = (1 - todo.matrixPos.x) * 0.5 + (1 - todo.matrixPos.y) * 0.5;
            const scale = scaleFor(todo.matrixPos.x, todo.matrixPos.y);
            return (
              <div
                key={todo.id}
                className="matrix-node"
                data-todo-id={todo.id}
                style={{
                  left: `${todo.matrixPos.x * 100}%`,
                  top: `${todo.matrixPos.y * 100}%`,
                  "--matrix-scale": scale.toFixed(3),
                  zIndex: Math.round(weight * 100),
                }}
                onAnimationEnd={() =>
                  setSettlingId((s) => (s === todo.id ? null : s))
                }
              >
                {renderTag(todo)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 未分类托盘：新建任务先落这里，拖入平面完成摆放 */}
      <div
        ref={trayRef}
        className={`matrix-tray${overTray ? " drag-over" : ""}`}
      >
        <div className="matrix-tray-head">
          <span className="matrix-tray-label">{t("focus.matrix.unclassified")}</span>
          {unplaced.length > 0 && (
            <button
              type="button"
              className="matrix-ai-assign"
              onClick={autoAssign}
              disabled={aiBusy}
              aria-label={t("focus.matrix.aiAssignAria")}
            >
              <span className="matrix-ai-assign-icon" aria-hidden="true">✨</span>
              {aiBusy ? t("focus.matrix.aiAssigning") : t("focus.matrix.aiAssign")}
            </button>
          )}
        </div>
        {aiError && (
          <span className="matrix-ai-error" role="status">
            {t("focus.matrix.aiAssignError")}
          </span>
        )}
        <div className="matrix-tray-tags">
          {unplaced.length > 0 ? (
            unplaced.map((todo) => renderTag(todo, true))
          ) : (
            <span className="matrix-cell-empty">{t("focus.matrix.trayEmpty")}</span>
          )}
        </div>
      </div>

      {/* 跟随光标的「幽灵卡」：实时缩放，越靠左上越大 */}
      {drag && (
        <div
          className="matrix-drag-ghost"
          style={{
            left: `${drag.x}px`,
            top: `${drag.y}px`,
            transform: `translate(-50%, -50%) scale(${drag.scale})`,
          }}
          aria-hidden="true"
        >
          <span className={`matrix-tag${isFocused(drag.id) ? " focused" : ""}`}>
            <span className="matrix-tag-text">{drag.text}</span>
          </span>
        </div>
      )}

      {/* 两步是非题：把「感觉放哪」拆成两个封闭问题，自动落到象限 */}
      {sortTodo && (
        <MatrixSortDialog
          todo={sortTodo}
          urgent={sortUrgent}
          onAnswer={answerSort}
          onBack={() => setSortUrgent(null)}
          onCancel={cancelSort}
          t={t}
        />
      )}
    </div>
  );
}
