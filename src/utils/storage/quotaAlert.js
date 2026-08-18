// localStorage 写满了的警报。
//
// 配额是按 origin 算的一整份（5MB，Chromium 系 10MiB），所有 key 共用；
// 满了以后 setItem 抛 QuotaExceededError，**整条写入失败**，盘上留的是上一次的旧值。
//
// 危险的不是「满」，是「满了没人知道」：写入方原本各自 catch 掉往控制台打一行，
// 界面照常显示保存成功，用户要等到某天导出备份才发现专注记录停在几个月前。
// 所以所有写入路径的 catch 都往这里报一声，由 StorageQuotaBanner 摆到用户脸上。
//
// 只管配额这一种错。JSON 序列化失败、key 名写错之类仍归调用方自己处理。

let state = { failed: false, count: 0, keys: [] };
const listeners = new Set();

/**
 * 是不是配额溢出。
 * name 是标准写法；code 22 / 1014 是老浏览器（含 Safari 私密模式、旧 Firefox）的遗留编号，
 * 它们同样表示「写不进去了」，漏判就等于漏报一整类用户。
 */
export function isQuotaError(e) {
  if (!e || typeof e !== "object") return false;
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014
  );
}

function emit() {
  for (const fn of listeners) fn(state);
}

/**
 * 报告一次写入失败。非配额错误原样忽略（返回 false），调用方据此决定要不要继续按普通错误处理。
 * key 用于告诉用户是哪份数据没存上。
 */
export function reportStorageError(e, key) {
  if (!isQuotaError(e)) return false;
  const keys = state.keys.includes(key) ? state.keys : [...state.keys, key].slice(-8);
  // count 每次失败都涨：banner 靠它区分「用户关掉的那次」和「关掉之后又失败了」，
  // 不然关一次就等于永久静音，接下来丢的数据照样无声无息。
  state = { failed: true, count: state.count + 1, keys };
  emit();
  return true;
}

export function getQuotaState() {
  return state;
}

export function subscribeQuota(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 仅供测试：把警报清回未触发状态。 */
export function resetQuotaState() {
  state = { failed: false, count: 0, keys: [] };
  emit();
}
