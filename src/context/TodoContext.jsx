import "@/types";
import React, { useReducer, useEffect, useRef, useContext } from "react";
import { loadVersioned, WRAPPER_VERSION } from "@/utils/storage/storage";
import useUndoDelete from "@/hooks/common/useUndoDelete";
import { useActivityLog } from "@/context/ActivityContext";
import usePersistedWrite from "@/hooks/common/usePersistedWrite";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { getTodayStr } from "@/utils/time";

// Action types
const ADD = "ADD";
const TOGGLE = "TOGGLE";
const DELETE = "DELETE";
const DELETE_MANY = "DELETE_MANY";
const SET_DONE_MANY = "SET_DONE_MANY";
const DELETE_BY_DB = "DELETE_BY_DB";
const EDIT = "EDIT";
const RESTORE = "RESTORE";
const SET = "SET";
const TOGGLE_RECURRING = "TOGGLE_RECURRING";
const UPDATE_PROPS = "UPDATE_PROPS";
const SET_ATTR_VALUE = "SET_ATTR_VALUE";

function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      return [action.payload, ...state];
    }
    case TOGGLE: {
      return state.map((t) =>
        t.id === action.payload ? { ...t, completed: !t.completed } : t,
      );
    }
    case DELETE: {
      return state.filter((t) => t.id !== action.payload);
    }
    case DELETE_MANY: {
      const ids = new Set(action.payload);
      return state.filter((t) => !ids.has(t.id));
    }
    case SET_DONE_MANY: {
      const { ids, done } = action.payload;
      const set = new Set(ids);
      return state.map((t) =>
        set.has(t.id) && t.completed !== done ? { ...t, completed: done } : t,
      );
    }
    case DELETE_BY_DB: {
      return state.filter((t) => (t.databaseId ?? "default") !== action.payload);
    }
    case EDIT: {
      const { id, text } = action.payload;
      return state.map((t) => (t.id === id ? { ...t, text } : t));
    }
    case RESTORE: {
      const { item, index } = action.payload;
      const next = state.slice();
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    }
    case SET: {
      return action.payload;
    }
    case TOGGLE_RECURRING: {
      const today = getTodayStr();
      const { id, days } = action.payload;
      return state.map(t => {
        if (t.id !== id) return t;
        if (!days?.length) {
          const { recurringDays, lastResetDate, ...rest } = t;
          return rest;
        }
        return { ...t, recurringDays: days, lastResetDate: today };
      });
    }
    case UPDATE_PROPS: {
      const { id, props } = action.payload;
      return state.map(t => t.id === id ? { ...t, ...props } : t);
    }
    case SET_ATTR_VALUE: {
      const { id, attrId, value } = action.payload;
      return state.map(t => {
        if (t.id !== id) return t;
        const attrs = { ...(t.attrs ?? {}) };
        const isEmpty = value === null || value === undefined ||
          (Array.isArray(value) && !value.length) ||
          value === "";
        if (isEmpty) {
          delete attrs[attrId];
        } else {
          attrs[attrId] = value;
        }
        if (Object.keys(attrs).length) return { ...t, attrs };
        const { attrs: _drop, ...rest } = t;
        return rest;
      });
    }
    default:
      return state;
  }
}

const TodoContext = React.createContext(null);

export function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(
    reducer,
    null,
    () => loadVersioned(STORAGE_KEYS.TODOS, WRAPPER_VERSION),
  );

  usePersistedWrite(STORAGE_KEYS.TODOS, todos);

  // 使用记录：任务的增 / 删 / 完成都记一笔时刻，时间轴才看得到没专注的那些事
  const { logActivity, logActivities, dropActivity, dropActivitiesForTasks } = useActivityLog();

  // 保持 todosRef 指向最新 todos，供 visibilitychange 回调读取（避免 stale closure）
  const todosRef = useRef(todos);
  useEffect(() => { todosRef.current = todos; }, [todos]);

  useEffect(() => {
    // mount 时及页面重新可见时检查循环任务是否需要重置，
    // 防止 app 在后台跨过午夜后遗漏重置。
    function resetRecurring() {
      const today = getTodayStr();
      const todayDow = new Date().getDay();
      const current = todosRef.current;
      const needsReset = current.some(
        t => t.recurringDays?.includes(todayDow) && t.lastResetDate !== today
      );
      if (!needsReset) return;
      dispatch({
        type: SET,
        payload: current.map(t =>
          t.recurringDays?.includes(todayDow) && t.lastResetDate !== today
            ? { ...t, completed: false, lastResetDate: today }
            : t
        ),
      });
    }

    resetRecurring();

    const onVisible = () => {
      if (document.visibilityState === "visible") resetRecurring();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addTodo = (text, { recurringDays = null, databaseId = "default" } = {}) => {
    const t = text.trim();
    if (!t) return;
    const today = getTodayStr();
    const item = {
      id: crypto.randomUUID(),
      text: t,
      completed: false,
      createdAt: Date.now(),
      databaseId,
      ...(recurringDays?.length && { recurringDays, lastResetDate: today }),
    };
    dispatch({ type: ADD, payload: item });
    logActivity("add", { taskId: item.id, text: item.text });
    return item;
  };

  // 删除某 database 时连带清掉其下所有任务（由 Tasks 页在 deleteDatabase 时调用）
  const deleteTodosByDatabase = (databaseId) =>
    dispatch({ type: DELETE_BY_DB, payload: databaseId });

  // log:false 供专注结算调用 —— 那次完成已经写进专注记录，时间轴上不必再多一个点。
  const toggleTodo = (id, { log = true } = {}) => {
    const todo = todos.find((t) => t.id === id);
    dispatch({ type: TOGGLE, payload: id });
    if (log && todo) {
      logActivity(todo.completed ? "uncomplete" : "complete", { taskId: id, text: todo.text });
    }
  };

  const toggleRecurring = (id, days) => dispatch({ type: TOGGLE_RECURRING, payload: { id, days } });

  const editTodo = (id, text) => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: EDIT, payload: { id, text: t } });
  };

  const updateTodoProps = (id, props) => {
    dispatch({ type: UPDATE_PROPS, payload: { id, props } });
  };

  const setTodoAttr = (id, attrId, value) => {
    dispatch({ type: SET_ATTR_VALUE, payload: { id, attrId, value } });
  };

  const { pendingDelete, deleteFn: deleteTodo, undoDelete } = useUndoDelete({
    items: todos,
    dispatch,
    onDelete: (id, item) => logActivity("delete", { taskId: id, text: item.text }),
    // meta 即那条删除记录的 id：撤销时一并撤掉
    onRestore: (_item, meta) => dropActivity(meta),
  });

  /**
   * 批量删除（表格视图全选后一次删掉、倒脑子撤回）。一次 dispatch 删完，
   * 不走 useUndoDelete —— 那个只记得住最后一条。
   * undoAdd:true 表示「当作没发生过」：不记删除，反而把这些任务的新增记录
   * 一并抹掉，时间轴上不留痕。
   */
  const deleteTodos = (ids, { undoAdd = false } = {}) => {
    const set = new Set(ids ?? []);
    const hit = todos.filter((t) => set.has(t.id));
    if (!hit.length) return 0;
    dispatch({ type: DELETE_MANY, payload: [...set] });
    if (undoAdd) {
      dropActivitiesForTasks(hit.map((t) => t.id), "add");
    } else {
      logActivities("delete", hit.map((t) => ({ taskId: t.id, text: t.text })));
    }
    return hit.length;
  };

  /**
   * 批量勾选 / 取消勾选（表格视图的批量条）。一次 dispatch + 一次记录写入，
   * 而不是逐条 toggleTodo —— 那样每条都要重建一遍整个任务数组和整条时间轴。
   */
  const setTodosDone = (ids, done) => {
    const set = new Set(ids ?? []);
    const hit = todos.filter((t) => set.has(t.id) && t.completed !== done);
    if (!hit.length) return 0;
    dispatch({ type: SET_DONE_MANY, payload: { ids: [...set], done } });
    logActivities(done ? "complete" : "uncomplete", hit.map((t) => ({ taskId: t.id, text: t.text })));
    return hit.length;
  };

  const value = {
    todos,
    addTodo,
    toggleTodo,
    toggleRecurring,
    editTodo,
    updateTodoProps,
    setTodoAttr,
    deleteTodo,
    deleteTodos,
    setTodosDone,
    deleteTodosByDatabase,
    pendingDelete,
    undoDelete,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
