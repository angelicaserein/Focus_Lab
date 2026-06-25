import React, { createContext, useContext, useState } from "react";

// 沉浸态上下文：聚合会话、AI 对话、以及沉浸视图专属的调试状态，
// 供 ImmersiveView 及其子组件消费，避免从 FocusPage 一路透传十多个 props。
const ImmersiveContext = createContext(null);

export function ImmersiveProvider({ session, chat, children }) {
  // 调试 / 视图微调状态（仅沉浸视图使用，开发环境才出现调试面板）
  const [debugMode, setDebugMode] = useState(false);
  const [debugProgress, setDebugProgress] = useState(0.5);
  const [animEnabled, setAnimEnabled] = useState(true);
  const [cardVisible, setCardVisible] = useState(true);

  const value = {
    // 会话
    isRunning: session.isRunning,
    seconds: session.seconds,
    selectedTodos: session.selectedTodos,
    availableTodos: session.availableTodos,
    onSettle: session.settleTask,
    onAddFocus: session.addToFocus,
    onCreateFocus: session.createAndFocus,
    onReplaceFocus: session.replaceFocus,
    onTogglePause: session.togglePause,
    onReset: session.resetTimer,
    onStop: session.handleStop,
    // AI 对话
    chatMessages: chat.messages,
    chatSending: chat.sending,
    onChatSend: chat.sendUserMessage,
    // 调试视图状态
    debugMode,
    setDebugMode,
    debugProgress,
    setDebugProgress,
    animEnabled,
    setAnimEnabled,
    cardVisible,
    setCardVisible,
  };

  return (
    <ImmersiveContext.Provider value={value}>
      {children}
    </ImmersiveContext.Provider>
  );
}

export function useImmersive() {
  const ctx = useContext(ImmersiveContext);
  if (!ctx) throw new Error("useImmersive must be used within ImmersiveProvider");
  return ctx;
}
