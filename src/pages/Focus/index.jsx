import React from "react";
import useFocusChat from "../../hooks/useFocusChat";
import useFocusSession from "./useFocusSession";
import { ImmersiveProvider } from "./ImmersiveContext";
import ImmersiveView from "./ImmersiveView";
import FocusConsole from "./FocusConsole";
import "./Focus.css";

export default function FocusPage() {
  const session = useFocusSession();
  const chat = useFocusChat();

  return (
    <>
      {session.isImmersive && (
        <ImmersiveProvider session={session} chat={chat}>
          <ImmersiveView />
        </ImmersiveProvider>
      )}

      <FocusConsole
        selectedTodos={session.selectedTodos}
        hasSelection={session.hasSelection}
        canReset={session.hasSelection && session.seconds > 0}
        onStart={session.handleStart}
        onReset={session.resetTimer}
        onStop={session.handleStop}
        onRemoveFocus={session.removeFocusTodo}
        chatMessages={chat.messages}
        onChatClear={chat.clearChat}
      />
    </>
  );
}
