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
    idle: "空着", pick: "挑一个", start: "开始专注", pause: "暂停",
    resume: "继续", stop: "结束", note: "记一条…", open: "打开主窗口",
    hide: "藏起来", noSession: "还没开始", noTasks: "任务库还空着",
  },
  en: {
    idle: "Empty", pick: "Pick one", start: "Start", pause: "Pause",
    resume: "Resume", stop: "End", note: "Jot something…", open: "Open app",
    hide: "Hide", noSession: "Not started", noTasks: "No tasks yet",
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
  const { expanded, showPanel, setExpanded, petHandlers } = usePetWindow();
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const wantFocusRef = useRef(false);

  // 启动时先要一份主进程缓存的快照，之后靠推送增量更新。
  // 少了这一步，桌宠窗重载后会一直空白到主窗口下次发布为止。
  useEffect(() => {
    desktop.hello().then((r) => r?.state && setState(r.state));
    return desktop.onState(setState);
  }, []);

  // 全局快捷键：展开并把光标放进输入框，直接开记。
  useEffect(() => desktop.onQuickCapture(() => {
    // 面板要等窗口先腾出地方（见 usePetWindow），这里只记个「待聚焦」，
    // 真正的 focus 交给下面那个 effect —— 输入框挂载的那一刻。
    wantFocusRef.current = true;
    setExpanded(true);
  }), [setExpanded]);

  useEffect(() => {
    if (!showPanel || !wantFocusRef.current) return;
    wantFocusRef.current = false;
    inputRef.current?.focus();
  }, [showPanel]);

  const app = state?.app ?? {};
  const focus = state?.focus ?? null;
  const t = T[app.lang === "en" ? "en" : "zh"];

  // 换皮：主窗口推过来的主题写到自己的 <html data-theme> 上，
  // theme.css 里那套变量就整窗跟着换（默认皮不带属性，与主窗口一致）。
  const theme = app.theme || "default";
  useEffect(() => {
    if (theme === "default") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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

  // 分心水位：主进程判定的（见 main.cjs 的「分心水位」一节）。
  // 瓶里少掉的正好是屏幕上多出来的——两边是同一摊水。
  // 但这只改「画出来的液面」：progress / seconds 一秒都没少，进度环照旧走真值，
  // 所以回到白名单以后水会一滴不差地涨回来。
  const watch = state?.watch ?? null;
  const spilling = !!watch?.spilling;
  const floodLevel = Math.min(Math.max(watch?.level ?? 0, 0), 1);
  const shownProgress = progress * (1 - floodLevel);
  // 瓶子空了就没什么可倒的了，水滴该停
  const pouring = spilling && shownProgress > 0.02;

  const titles = app.selectedTitles ?? [];
  const hasSelection = titles.length > 0;
  // 没在专注的时候，面板直接摆任务列表：点一下就选中，不用先回主窗口挑。
  const candidates = app.candidates ?? [];
  const selectedIds = app.selectedIds ?? [];

  const submitNote = () => {
    const text = draft.trim();
    if (!text) return;
    desktop.sendCommand({ type: "add-note", text });
    setDraft("");
  };

  return (
    <div className={`pet-shell${expanded ? " is-expanded" : ""}`}>
      {showPanel && (
        // data-pet-hit：光标落在这上面时窗口才接管鼠标，其余区域一律穿透给桌面
        <div className="pet-panel" data-pet-hit>
          <div className="pet-panel-head">
            <span className="pet-clock">{hasSession ? clock : t.noSession}</span>
            <button className="pet-icon-btn" onClick={() => desktop.hidePet()} title={t.hide}>×</button>
          </div>

          <div className="pet-tasks">
            {hasSession ? (
              // 已经在专注了：这时候列表是「正在做什么」的提示，不该还能改选择
              titles.map((title, i) => <div className="pet-task" key={i}>{title}</div>)
            ) : candidates.length ? (
              candidates.map((task) => {
                const on = selectedIds.includes(task.id);
                return (
                  <button
                    type="button"
                    className={`pet-task pet-task-pick${on ? " is-on" : ""}`}
                    key={task.id}
                    aria-pressed={on}
                    onClick={() => desktop.sendCommand({ type: "select-task", id: task.id })}
                  >
                    <span className="pet-task-dot" aria-hidden="true" />
                    <span className="pet-task-text">{task.text}</span>
                  </button>
                );
              })
            ) : (
              <div className="pet-task pet-task-empty">{t.noTasks}</div>
            )}
          </div>

          <div className="pet-actions">
            {!hasSession ? (
              <button
                className="pet-btn pet-btn-primary"
                disabled={!hasSelection}
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
      <div className={`pet-flask${spilling ? " is-spilling" : ""}`} data-pet-hit {...petHandlers}>
        {/* 环走的是真实进度，不跟着倒水掉——「你的专注没有被扣掉」这句话，
            让它在画面上有个说得出口的证据。 */}
        <ProgressRing progress={progress} running={isRunning} />
        <FlaskGraphic
          progress={shownProgress} params={app.flaskParams}
          hitLayer drainToNeck={spilling}
        />
        {pouring && (
          <div className="pet-pour" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span className="pet-drop" key={i} style={{ animationDelay: `${i * 0.17}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
