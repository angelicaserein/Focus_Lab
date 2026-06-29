import React from "react";
import "../FocusImmersive.css";
import PusheenScene from "../PusheenScene";
import ImmersiveChat from "./ImmersiveChat";
import ImmersiveUtils from "./ImmersiveUtils";
import ImmersiveCard from "./ImmersiveCard";
import ImmersiveFullscreen from "./ImmersiveFullscreen";
import { useFocusSession } from "../FocusSessionContext";

// 沉浸式专注遮罩：3D 模型背景 + 可拖动悬浮卡（含 DebugTweaks）+ AI 陪伴 + 工具栏。
// 所有 session 状态从 FocusSessionContext 读取，不接受外部 props。
export default function ImmersiveView() {
  const {
    isRunning, seconds, animEnabled,
    pomodoroMins = 25,
    chatMessages, chatSending, onChatSend,
    onAddNote, onDistraction, onProactiveDistraction, onReturnFromDistraction,
    isProactiveDistraction, proactiveDistractionStartTs,
    sessionNotes, sessionDistractionCount,
  } = useFocusSession();

  const flaskProgress = Math.min(seconds / (pomodoroMins * 60), 1);

  return (
    <div className="immersive-overlay">
      <div className="immersive-model-area">
        <PusheenScene animEnabled={animEnabled} />
      </div>

      <ImmersiveFullscreen />

      <ImmersiveCard flaskProgress={flaskProgress} />

      <ImmersiveChat
        messages={chatMessages}
        sending={chatSending}
        onSend={onChatSend}
      />

      <ImmersiveUtils
        onAddNote={onAddNote}
        onDistraction={onDistraction}
        onProactiveDistraction={onProactiveDistraction}
        onReturnFromDistraction={onReturnFromDistraction}
        isProactiveDistraction={isProactiveDistraction}
        proactiveDistractionStartTs={proactiveDistractionStartTs}
        isRunning={isRunning}
        sessionNotes={sessionNotes}
        sessionDistractionCount={sessionDistractionCount}
      />
    </div>
  );
}
