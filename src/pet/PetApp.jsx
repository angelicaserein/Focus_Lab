import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    hide: "藏起来", collapse: "收起面板", noSession: "还没开始", noTasks: "任务库还空着",
    saved: "已记下", pending: (n) => `${n} 条待办`,
  },
  en: {
    idle: "Empty", pick: "Pick one", start: "Start", pause: "Pause",
    resume: "Resume", stop: "End", note: "Jot something…", open: "Open app",
    hide: "Hide", collapse: "Collapse", noSession: "Not started", noTasks: "No tasks yet",
    saved: "Saved", pending: (n) => `${n} to-do${n === 1 ? "" : "s"}`,
  },
};

// 空值常量：`?? []` / `?? {}` 每次渲染都是新引用，会让下面的 memo 白设。
const EMPTY = [];
const EMPTY_OBJ = {};

// 「已记下」这行字挂多久
const SAVED_HINT_MS = 1800;

export default function PetApp() {
  const [state, setState] = useState(null);
  const { expanded, setExpanded, petHandlers } = usePetWindow();
  // 草稿放在这一层而不是面板里：面板收起时会整个卸载，草稿存在里面的话，
  // 「打一半的记录 → 顺手按了 Esc / 切去别的程序」就白打了。
  const [draft, setDraft] = useState("");
  // 「叫起来就直接开记」这一路的两件东西：
  //   wantFocusRef —— 真正的开关。只有快捷键那一路才置位，用完即清，
  //                   免得平时点开面板也把光标抢进输入框。
  //   focusNonce   —— 面板已经展开着时再按一次快捷键，光靠 ref 是不会重新
  //                   触发 effect 的，用它推一下。
  const wantFocusRef = useRef(false);
  const [focusNonce, setFocusNonce] = useState(0);

  // 启动时先要一份主进程缓存的快照，之后靠推送增量更新。
  // 少了这一步，桌宠窗重载后会一直空白到主窗口下次发布为止。
  useEffect(() => {
    desktop.hello().then((r) => r?.state && setState(r.state));
    return desktop.onState(setState);
  }, []);

  // 全局快捷键：展开并把光标放进输入框，直接开记。
  useEffect(() => desktop.onQuickCapture(() => {
    wantFocusRef.current = true;
    setExpanded(true);
    setFocusNonce((n) => n + 1);
  }), [setExpanded]);

  const collapse = useCallback(() => setExpanded(false), [setExpanded]);

  // Esc 收起面板。桌宠没有标题栏、没有「外面」可以点，不给一条键盘上的退路的话，
  // 展开之后就只能拿鼠标去够烧瓶。
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => { if (e.key === "Escape") collapse(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, collapse]);

  // 失焦（用户回去用别的程序了）也收起：面板压着人家的窗口，没道理一直摊在那儿。
  // 但草稿还没提交时不收——那多半是「去别处看一眼再回来接着打」。
  const draftRef = useRef("");
  draftRef.current = draft;
  useEffect(() => desktop.onPetBlur(() => {
    if (!draftRef.current.trim()) collapse();
  }), [collapse]);

  const app = state?.app ?? EMPTY_OBJ;
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
  // 瓶里少掉的就是屏幕上多出来的——同一摊水，同一个 level。
  // 但这只改「画出来的液面」：progress / seconds 一秒都没少，
  // 所以回到白名单以后水会一滴不差地涨回来。
  const watch = state?.watch ?? null;
  const spilling = !!watch?.spilling;
  const floodLevel = Math.min(Math.max(watch?.level ?? 0, 0), 1);
  const shownProgress = progress * (1 - floodLevel);
  // 瓶子空了就没什么可倒的了，水滴该停
  const pouring = spilling && shownProgress > 0.02;

  // 副标题：专注中显示场景，待机时显示还有多少条没做完。
  // 这两条数据主窗口本来就一直推着，只是以前没人用。
  const pendingCount = app.pendingCount ?? 0;
  const subtitle = hasSession
    ? (app.scenarioTitle || null)
    : (pendingCount > 0 ? t.pending(pendingCount) : null);

  const submitNote = useCallback((text) => {
    desktop.sendCommand({ type: "add-note", text });
    setDraft("");
  }, []);

  const sendCommand = useCallback((cmd) => desktop.sendCommand(cmd), []);
  const hide = useCallback(() => desktop.hidePet(), []);

  return (
    <div className={`pet-shell${expanded ? " is-expanded" : ""}`}>
      {expanded && (
        <PetPanel
          t={t}
          clock={clock}
          subtitle={subtitle}
          hasSession={hasSession}
          isRunning={isRunning}
          titles={app.selectedTitles ?? EMPTY}
          candidates={app.candidates ?? EMPTY}
          selectedIds={app.selectedIds ?? EMPTY}
          draft={draft}
          onDraftChange={setDraft}
          onSubmitNote={submitNote}
          focusNonce={focusNonce}
          wantFocusRef={wantFocusRef}
          onCollapse={collapse}
          onHide={hide}
          onCommand={sendCommand}
        />
      )}

      <PetFlask
        progress={shownProgress}
        params={app.flaskParams}
        spilling={spilling}
        pouring={pouring}
        handlers={petHandlers}
      />
    </div>
  );
}

// 烧瓶单独拎出来做 memo：分心期间主进程每 200ms 推一次水位，
// 但在输入框里打字的每一次按键也会重渲染 PetApp——两边互不相干，别互相拖着跑。
const PetFlask = React.memo(function PetFlask({ progress, params, spilling, pouring, handlers }) {
  return (
    // data-pet-hit 标在这里，但整个方块并不接管鼠标：真正可命中的只有 svg 里
    // 那份 .flask-hit 轮廓（见 PetApp.css），方块的四角照旧穿透给桌面。
    <div className={`pet-flask${spilling ? " is-spilling" : ""}`} data-pet-hit {...handlers}>
      <FlaskGraphic progress={progress} params={params} hitLayer drainToNeck={spilling} />
      {pouring && (
        <div className="pet-pour" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span className="pet-drop" key={i} style={{ animationDelay: `${i * 0.17}s` }} />
          ))}
        </div>
      )}
    </div>
  );
});

// 面板同样 memo：水位每 200ms 变一次，而面板里的东西（时钟、任务、按钮）
// 一秒最多变一次。主进程推水位时复用的是同一个 app / focus 对象，
// 所以这里的 props 引用不变，整块面板一帧都不用重画。
const PetPanel = React.memo(function PetPanel({
  t, clock, subtitle, hasSession, isRunning, titles, candidates, selectedIds,
  draft, onDraftChange, onSubmitNote, focusNonce, wantFocusRef, onCollapse, onHide, onCommand,
}) {
  const inputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const hasSelection = titles.length > 0 || selectedIds.length > 0;

  // 快捷键叫起来的那一次：面板此刻刚画出来，光标直接落进输入框。
  // 平时点开面板不走这里（wantFocusRef 是 false），不然鼠标党每次展开都得先按一下 Esc。
  useEffect(() => {
    if (!wantFocusRef?.current) return;
    wantFocusRef.current = false;
    inputRef.current?.focus();
  }, [focusNonce, wantFocusRef]);

  // 「已记下」挂一会儿就撤。卸载时要清掉，否则收起面板会撞上 setState-on-unmounted。
  useEffect(() => {
    if (!saved) return undefined;
    const id = setTimeout(() => setSaved(false), SAVED_HINT_MS);
    return () => clearTimeout(id);
  }, [saved]);

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSubmitNote(text);
    // 记一条之后什么都不会变（记录进的是主窗口的备忘），不给个回执的话
    // 完全看不出发生过什么，只会让人怀疑是不是没记上。
    setSaved(true);
  };

  return (
    // data-pet-hit：光标落在这上面时窗口才接管鼠标，其余区域一律穿透给桌面
    <div className="pet-panel" data-pet-hit>
      <div className="pet-panel-head">
        <div className="pet-head-main">
          <span className="pet-clock">{hasSession ? clock : t.noSession}</span>
          {subtitle && <span className="pet-sub">{subtitle}</span>}
        </div>
        <div className="pet-head-btns">
          <button className="pet-icon-btn" onClick={onCollapse} title={`${t.collapse} (Esc)`} aria-label={t.collapse}>–</button>
          <button className="pet-icon-btn" onClick={onHide} title={t.hide} aria-label={t.hide}>×</button>
        </div>
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
                title={task.text}
                onClick={() => onCommand({ type: "select-task", taskId: task.id })}
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
            onClick={() => onCommand({ type: "start" })}
          >
            {hasSelection ? t.start : t.pick}
          </button>
        ) : (
          <>
            <button
              className="pet-btn pet-btn-primary"
              onClick={() => onCommand({ type: "toggle-pause" })}
            >
              {isRunning ? t.pause : t.resume}
            </button>
            <button className="pet-btn" onClick={() => onCommand({ type: "stop" })}>
              {t.stop}
            </button>
          </>
        )}
      </div>

      <form className="pet-note" onSubmit={submit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t.note}
          aria-label={t.note}
        />
      </form>

      <div className="pet-foot">
        <button className="pet-link" onClick={() => onCommand({ type: "open-main" })}>
          {t.open}
        </button>
        <span className={`pet-saved${saved ? " is-on" : ""}`} aria-live="polite">
          {saved ? t.saved : ""}
        </span>
      </div>
    </div>
  );
});
