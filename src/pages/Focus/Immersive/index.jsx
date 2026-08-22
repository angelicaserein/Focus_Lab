import React from "react";
import "../FocusImmersive.css";
import PusheenScene from "@/pages/Focus/PusheenScene";
import ImmersiveChat from "@/pages/Focus/Immersive/ImmersiveChat";
import ImmersiveUtils from "@/pages/Focus/Immersive/ImmersiveUtils";
import ImmersiveCard from "@/pages/Focus/Immersive/ImmersiveCard";
import ImmersiveFullscreen from "@/pages/Focus/Immersive/ImmersiveFullscreen";
import { useFocusSession } from "@/pages/Focus/FocusSessionContext";

// 沉浸式专注遮罩：3D 模型背景 + 可拖动悬浮卡（含 DebugTweaks）+ AI 陪伴 + 工具栏。
// 所有 session 状态从 FocusSessionContext 读取，不接受外部 props。
export default function ImmersiveView() {
  const {
    isRunning, seconds, animEnabled,
    targetMins = 25,
    chatMessages, chatSending, onChatSend,
    onAddNote, onDistraction, onProactiveDistraction, onReturnFromDistraction,
    isProactiveDistraction, proactiveDistractionStartTs,
    sessionNotes, sessionDistractionCount,
    onOpenBrowser,
  } = useFocusSession();

  // 正计时：注满目标时长；倒计时：满容量=倒计时时长。两者都随已过秒数从空到满。
  const flaskProgress = Math.min(seconds / (targetMins * 60), 1);

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
        onOpenBrowser={onOpenBrowser}
      />
    </div>
  );
}
