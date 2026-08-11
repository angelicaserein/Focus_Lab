// 烧瓶水位调试（仅开发环境）：直接把某只瓶子里的水量按秒写死。
//
// 真实水量是从专注记录（record.flaskId）现算的——要试「注满 3 只半」得真专注三个半小时，
// 没法调。所以这里存一张「覆盖表」：{ [flaskId]: secs }，读的时候盖在现算结果上面。
//
// 用覆盖值而不是补偿差值：调试时想的是「让这只瓶子有 2 小时水」，
// 而不是「在真实值上再加多少」；也不会因为期间真专注了一会儿就把设定值顶偏。
// 覆盖只影响烧瓶架的显示，不写进专注记录——历史与统计仍是真的。

// 归一化持久化值：只留 id 是非空字符串、秒数是有限非负数的项。
export function normalizeDebugFills(value) {
  const out = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [id, secs] of Object.entries(value)) {
    const n = Number(secs);
    if (id && Number.isFinite(n) && n >= 0) out[id] = Math.round(n);
  }
  return out;
}

// 设一只瓶子的覆盖水位（负数按 0 处理）。返回新对象，不改入参。
export function setDebugFill(fills, id, secs) {
  const n = Number(secs);
  return { ...normalizeDebugFills(fills), [id]: Math.max(0, Math.round(Number.isFinite(n) ? n : 0)) };
}

// 撤掉某只瓶子的覆盖，让它回到真实记录算出来的水位。
export function clearDebugFill(fills, id) {
  const next = normalizeDebugFills(fills);
  delete next[id];
  return next;
}

// 现算水位 + 覆盖表 → 页面实际显示的水位。覆盖表里有的，以覆盖为准。
export function mergeDebugFills(realFills, debugFills) {
  return { ...realFills, ...normalizeDebugFills(debugFills) };
}
