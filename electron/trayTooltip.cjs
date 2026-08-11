// 托盘 tooltip 的文案计算。
//
// 单独拎出来只为一件事：能测。Electron 的 Tray 没有 getToolTip，装进 app 之后
// 这句话在自动化里一个字都读不出来（驱动脚本能验桌宠的一切，唯独验不了它），
// 只能靠人把鼠标停在托盘图标上看。纯函数化之后，格式、中英、以及那几个边界
// （没会话 / 暂停 / 倒计时超时 / 超过一小时）就都能在 vitest 里锁住了。
//
// 时间口径跟桌宠面板上的时钟保持一致（见 src/pet/PetApp.jsx）：
// 正计时显示已过时长，倒计时显示剩余，超时显示 `+超出多久`。
// 两处对不上的话，同一次专注在托盘和桌宠上会是两个数字。

function clock(totalSecs) {
  const total = Math.max(0, Math.round(totalSecs));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// state 是主进程手里那份合并后的快照（{ app, focus, watch }），可能是 null。
function formatTrayTooltip(state) {
  const f = state?.focus;
  const en = state?.app?.lang === "en";
  const base = "Focus Lab";

  const secs = Number(f?.seconds);
  const seconds = Number.isFinite(secs) ? Math.max(0, secs) : 0;
  // 没有会话，或会话还停在 0 秒没动过：托盘就是单纯的应用名，不显示 00:00。
  if (!f || (!f.isRunning && seconds === 0)) return base;

  const label = f.isRunning ? (en ? "Focusing" : "专注中") : (en ? "Paused" : "已暂停");

  const targetMins = Number(f.targetMins);
  const targetSecs = (Number.isFinite(targetMins) ? targetMins : 25) * 60;
  const remaining = targetSecs - seconds;
  const time = f.timerMode === "countdown"
    ? (remaining >= 0 ? clock(remaining) : `+${clock(-remaining)}`)
    : clock(seconds);

  return `${base} — ${label} ${time}`;
}

module.exports = { formatTrayTooltip };
