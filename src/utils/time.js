// 时间格式化工具 —— 全站共用，避免各处内联拼接。
// 分组访问: clock.* | dates.* | calc.*
// 也可直接具名导入（向后兼容）。

const MS_PER_DAY = 86_400_000;
const TIME_FORMAT_OPTS = { hour: "2-digit", minute: "2-digit", hour12: false };

// 带语言的格式化一律收 lang 参数，默认 "zh" —— 老调用点不传就是原来的中文行为，
// 已接入 i18n 的页面从 useLanguage() 把 lang 透下来即可。
// 时刻一律 24 小时制（两种语言都是），只有日期/时长的措辞随语言变。
const localeOf = (lang) => (lang === "en" ? "en-US" : "zh-CN");

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

// 秒数 → "1小时30分" / "30分钟" / "45秒"（分析页、详情页的长格式时长）
// en: "1h 30m" / "30 min" / "45 sec"
export function formatDurationChinese(secs, lang = "zh") {
  const en = lang === "en";
  if (!secs || secs <= 0) return en ? "0 min" : "0分钟";
  if (secs < 60) return en ? `${secs} sec` : `${secs}秒`;
  if (secs < 3600) {
    const m = Math.floor(secs / 60);
    return en ? `${m} min` : `${m}分钟`;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (en) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

// 时间戳 → "14:30"（仅时刻，24小时制；两种语言同形）
export function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString("zh-CN", TIME_FORMAT_OPTS);
}

// 时间戳 → "今天" / "昨天" / "6月14日"（仅日期标签，不含时刻）
// en: "Today" / "Yesterday" / "Jun 14"
export function formatSessionDate(ts, lang = "zh") {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - MS_PER_DAY;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const en = lang === "en";
  if (day === today) return en ? "Today" : "今天";
  if (day === yesterday) return en ? "Yesterday" : "昨天";
  if (en) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 时间戳 → "刚刚" / "X分钟前" / "X小时前" / "昨天" / "X天前"
// en: "just now" / "Xm ago" / "Xh ago" / "yesterday" / "Xd ago"
export function formatRelativeTime(ts, lang = "zh") {
  if (!ts) return "—";
  const en = lang === "en";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / MS_PER_DAY);
  if (mins < 1) return en ? "just now" : "刚刚";
  if (mins < 60) return en ? `${mins}m ago` : `${mins}分钟前`;
  if (hours < 24) return en ? `${hours}h ago` : `${hours}小时前`;
  if (days === 1) return en ? "yesterday" : "昨天";
  if (days < 7) return en ? `${days}d ago` : `${days}天前`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return en ? `${w}w ago` : `${w}周前`;
  }
  const mo = Math.floor(days / 30);
  return en ? `${mo}mo ago` : `${mo}个月前`;
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
// en: "Today 14:30" / "Yesterday 14:30" / "Jun 14, 14:30"
export function formatRecordDate(ts, lang = "zh") {
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

  const en = lang === "en";
  const time = d.toLocaleTimeString("zh-CN", TIME_FORMAT_OPTS);
  if (isToday) return `${en ? "Today" : "今天"} ${time}`;
  if (isYesterday) return `${en ? "Yesterday" : "昨天"} ${time}`;
  return d.toLocaleDateString(localeOf(lang), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 与上面「今天 14:30」保持同一制式，别在英文下冒出 AM/PM
  });
}
