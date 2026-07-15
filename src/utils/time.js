// 时间格式化工具 —— 全站共用，避免各处内联拼接。
// 分组访问: clock.* | dates.* | calc.*
// 也可直接具名导入（向后兼容）。

const MS_PER_DAY = 86_400_000;
const TIME_FORMAT_OPTS = { hour: "2-digit", minute: "2-digit", hour12: false };

// 返回 "YYYY-MM-DD" 格式的今日日期字符串（用于循环任务重置判断等）
// 必须用本地年月日：toISOString() 是 UTC，在 UTC+8 的凌晨 0–8 点会返回昨天，
// 与同处逻辑里的 new Date().getDay()（本地星期几）错位，导致循环任务凌晨漏重置、
// DDL 弹窗/通知的「今日去重」失效。口径与 Calendar 的 dayKey 一致。
export function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Date 对象 → 本地 "YYYY-MM-DD"（口径同 getTodayStr，避免 UTC 偏移）
export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 今天 + n 天的本地日期字符串（n 可为负）。addDays(0)=今天，addDays(1)=明天。
export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// 从某时间戳到现在经过的秒数（四舍五入）
export function getElapsedSecs(startTs) {
  return Math.round((Date.now() - startTs) / 1000);
}

// 秒数 → "MM:SS"（计时器显示）
export function formatClock(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 秒数 → "1m 30s" / "45s" / "2m"（时长摘要）
// @param {number} secs - 秒数（注意：非分钟数。taskAttrUtils 的 formatMins 接收分钟数）
export function formatDuration(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// 秒数 → "1小时30分" / "30分钟" / "45秒"（分析页、详情页中文展示）
export function formatDurationChinese(secs) {
  if (!secs || secs <= 0) return "0分钟";
  if (secs < 60) return `${secs}秒`;
  if (secs < 3600) return `${Math.floor(secs / 60)}分钟`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

// 时间戳 → "14:30"（仅时刻，24小时制）
export function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", TIME_FORMAT_OPTS);
}

// 时间戳 → "今天" / "昨天" / "6月14日"（仅日期标签，不含时刻）
export function formatSessionDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - MS_PER_DAY;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (day === today) return "今天";
  if (day === yesterday) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 时间戳 → "刚刚" / "X分钟前" / "X小时前" / "昨天" / "X天前"
export function formatRelativeTime(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / MS_PER_DAY);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return `${Math.floor(days / 30)}个月前`;
}

// "YYYY-MM-DD" → 距今天数（正=未来，0=今天，负=已过期）
export function getDaysUntil(dueDateStr) {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  return Math.round((due - today) / MS_PER_DAY);
}

// ── 分组导出（namespace 访问） ──────────────────────────────────────────────
export const clock = { formatClock, formatDuration, formatDurationChinese };
export const dates = { formatTimestamp, formatSessionDate, formatRelativeTime, formatRecordDate, getTodayStr };
export const calc  = { getElapsedSecs };

// 时间戳 → "今天 14:30" / "昨天 14:30" / "6月14日 14:30"（记录时间）
export function formatRecordDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const isYesterday = (() => {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return (
      d.getDate() === y.getDate() &&
      d.getMonth() === y.getMonth() &&
      d.getFullYear() === y.getFullYear()
    );
  })();

  const time = d.toLocaleTimeString("zh-CN", TIME_FORMAT_OPTS);
  if (isToday) return `今天 ${time}`;
  if (isYesterday) return `昨天 ${time}`;
  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
