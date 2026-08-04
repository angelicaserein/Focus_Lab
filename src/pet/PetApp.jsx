import React, { useEffect, useRef, useState } from "react";
import { FlaskGraphic } from "@/pages/Focus/FocusFlask";
import { formatClock } from "@/utils/time";
import desktop from "@/utils/desktop/desktopBridge";
import usePetWindow from "@/pet/usePetWindow";

// 桌宠：桌面上那只烧瓶。就是沉浸式专注页里的同一只（复用 FlaskGraphic），
// 形状也跟着设置页的参数走——主窗口会把 flaskParams 一起推过来。
//
// 它没有情绪、不会饿也不会枯萎。烧瓶只有一个状态量：装到哪儿了。
// 不专注的时候它就是空的，仅此而已，不表达任何评价。

// 桌宠的文案量很小，没必要把整个 i18n 字典拉进这个窗口的 bundle。
const T = {
  zh: {
    idle: "空着", pick: "去挑个任务", start: "开始专注", pause: "暂停",
    resume: "继续", stop: "结束", note: "记一条…", open: "打开主窗口",
    hide: "藏起来", noSession: "还没开始",
  },
  en: {
    idle: "Empty", pick: "Pick a task", start: "Start", pause: "Pause",
    resume: "Resume", stop: "End", note: "Jot something…", open: "Open app",
    hide: "Hide", noSession: "Not started",
  },
};

// 烧瓶外圈的进度环。半径贴着烧瓶画布外沿，从正上方顺时针走。
function ProgressRing({ progress, running }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  return (
    <svg className={`pet-ring${running ? " is-running" : ""}`} viewBox="0 0 140 140" aria-hidden="true">
      <circle className="pet-ring-track" cx="70" cy="70" r={R} />
      <circle
        className="pet-ring-fill" cx="70" cy="70" r={R}
        strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
      />
    </svg>
  );
}

export default function PetApp() {
  const [state, setState] = useState(null);
  const { expanded, setExpanded, petHandlers } = usePetWindow();
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  // 启动时先要一份主进程缓存的快照，之后靠推送增量更新。
  // 少了这一步，桌宠窗重载后会一直空白到主窗口下次发布为止。
  useEffect(() => {
    desktop.hello().then((r) => r?.state && setState(r.state));
    return desktop.onState(setState);
  }, []);

  // 全局快捷键：展开并把光标放进输入框，直接开记。
  useEffect(() => desktop.onQuickCapture(() => {
    setExpanded(true);
    // 展开是异步改窗口尺寸，等一帧再聚焦，否则输入框还没渲染出来
    requestAnimationFrame(() => inputRef.current?.focus());
  }), [setExpanded]);

  const app = state?.app ?? {};
  const focus = state?.focus ?? null;
  const t = T[app.lang === "en" ? "en" : "zh"];

  const seconds = focus?.seconds ?? 0;
  const targetSecs = (focus?.targetMins ?? 25) * 60;
  // 与沉浸层同一个口径：正/倒计时都是「已过时长 / 目标时长」，从空到满。
  const progress = focus ? Math.min(seconds / targetSecs, 1) : 0;
  const isRunning = !!focus?.isRunning;
  const hasSession = !!focus && (seconds > 0 || isRunning);

  const remaining = targetSecs - seconds;
  const clock = focus?.timerMode === "countdown"
    ? (remaining >= 0 ? formatClock(remaining) : `+${formatClock(-remaining)}`)
    : formatClock(seconds);

  const titles = app.selectedTitles ?? [];
  const hasSelection = titles.length > 0;

  const submitNote = () => {
    const text = draft.trim();
    if (!text) return;
    desktop.sendCommand({ type: "add-note", text });
    setDraft("");
  };

  return (
    <div className={`pet-shell${expanded ? " is-expanded" : ""}`}>
      {expanded && (
        // data-pet-hit：光标落在这上面时窗口才接管鼠标，其余区域一律穿透给桌面
        <div className="pet-panel" data-pet-hit>
          <div className="pet-panel-head">
            <span className="pet-clock">{hasSession ? clock : t.noSession}</span>
            <button className="pet-icon-btn" onClick={() => desktop.hidePet()} title={t.hide}>×</button>
          </div>

          <div className="pet-tasks">
            {hasSelection
              ? titles.map((title, i) => <div className="pet-task" key={i}>{title}</div>)
              : <div className="pet-task pet-task-empty">{t.pick}</div>}
          </div>

          <div className="pet-actions">
            {!hasSession ? (
              <button
                className="pet-btn pet-btn-primary"
                onClick={() => desktop.sendCommand({ type: "start" })}
              >
                {hasSelection ? t.start : t.pick}
              </button>
            ) : (
              <>
                <button
                  className="pet-btn pet-btn-primary"
                  onClick={() => desktop.sendCommand({ type: "toggle-pause" })}
                >
                  {isRunning ? t.pause : t.resume}
                </button>
                <button className="pet-btn" onClick={() => desktop.sendCommand({ type: "stop" })}>
                  {t.stop}
                </button>
              </>
            )}
          </div>

          <form
            className="pet-note"
            onSubmit={(e) => { e.preventDefault(); submitNote(); }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.note}
              aria-label={t.note}
            />
          </form>

          <button
            className="pet-link"
            onClick={() => desktop.sendCommand({ type: "open-main" })}
          >
            {t.open}
          </button>
        </div>
      )}

      {/* data-pet-hit 标在这里，但整个方块并不接管鼠标：真正可命中的只有 svg 里
          那份 .flask-hit 轮廓（见 PetApp.css），方块的四角照旧穿透给桌面。 */}
      <div className="pet-flask" data-pet-hit {...petHandlers}>
        <ProgressRing progress={progress} running={isRunning} />
        <FlaskGraphic progress={progress} params={app.flaskParams} hitLayer />
      </div>
    </div>
  );
}
