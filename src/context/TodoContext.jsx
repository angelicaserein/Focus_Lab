import React, { useReducer, useEffect, useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

const STORAGE_KEY = "todos_v1";

// Action types
const ADD = "ADD";
const TOGGLE = "TOGGLE";
const DELETE = "DELETE";
const SET = "SET";

// reducer 管理 todos 状态。未来扩展点：可以增加 EDIT, MOVE, SET_PRIORITY 等动作。
function reducer(state, action) {
  switch (action.type) {
    case ADD: {
      const item = action.payload;
      return [item, ...state];
    }
    case TOGGLE: {
      return state.map((t) =>
        t.id === action.payload ? { ...t, completed: !t.completed } : t,
      );
    }
    case DELETE: {
      return state.filter((t) => t.id !== action.payload);
    }
    case SET: {
      return action.payload;
    }
    default:
      return state;
  }
}

const TodoContext = React.createContext(null);

export function TodoProvider({ children }) {
  // useLocalStorage 返回持久化 state 和 setter，但我们使用 useReducer 管理主状态，
  // 并将 reducer 的变化写回 localStorage。这样既有 reducer 的可扩展性，又封装了持久化逻辑。
  const [persisted, setPersisted] = useLocalStorage(STORAGE_KEY, []);

  const [todos, dispatch] = useReducer(reducer, persisted);

  // 当 todos 变化时，写回 localStorage
  useEffect(() => {
    setPersisted(todos);
  }, [todos, setPersisted]);

  // 便捷 action creators
  const addTodo = (text) => {
    const item = { id: Date.now().toString(), text, completed: false };
    dispatch({ type: ADD, payload: item });
  };

  const toggleTodo = (id) => dispatch({ type: TOGGLE, payload: id });
  const deleteTodo = (id) => dispatch({ type: DELETE, payload: id });

  const value = {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    dispatch,
  };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
}
