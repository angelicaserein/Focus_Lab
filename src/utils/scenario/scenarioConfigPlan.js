// ──────────────────────────────────────────────────────────────
//  把「AI 建议的情境配置」（用自然语言 label 表达）落成一份可执行方案。
//
//  AI 只吐 label（见 aiScenarioConfig.js），不认 id——这样它既能命中已有选项，
//  也能自由提出全新选项（「自由度高一点」的关键：不局限于现有那几个）。
//  本模块把 label 解析成 id：
//    · 设备 / 交流规则：命中已有则复用其 id；没有则安排「新建」（预生成 id）。
//    · 任务类型：只映射到任务库现有标签（此处不能凭空造标签），命中不了就标记未匹配。
//
//  纯函数、无副作用：返回「要新建哪些选项」+「最终 settings」+「给用户看的预览」。
//  调用方（ScenarioConfigAssistant）先展示预览，用户点「应用」时才执行 newOptions
//  写入与 settings 更新。genId 可注入以便测试确定性。
// ──────────────────────────────────────────────────────────────

const norm = (s) => (s ?? "").trim().toLowerCase();

// 在 options 里按 label 找（忽略大小写与首尾空格）。
function findByLabel(options, label) {
  const key = norm(label);
  return (options ?? []).find((o) => norm(o.label) === key) ?? null;
}

// cfg: { devices: string[], communication: string, taskTypes: string[], note?: string }
// ctx: { deviceOptions, commOptions, tagOptions, baseSettings, genId? }
export function planScenarioConfig(cfg, ctx = {}) {
  const {
    deviceOptions = [],
    commOptions = [],
    tagOptions = [],
    baseSettings = {},
    genId = () => crypto.randomUUID(),
  } = ctx;

  const newOptions = { devices: [], communication: [] };

  // 去重后逐个解析设备 label → id（命中复用 / 未命中新建）。
  const seenDev = new Set();
  const devicePreview = [];
  const deviceIds = [];
  for (const label of dedupeLabels(cfg?.devices)) {
    if (seenDev.has(norm(label))) continue;
    seenDev.add(norm(label));
    const existing = findByLabel(deviceOptions, label);
    if (existing) {
      deviceIds.push(existing.id);
      devicePreview.push({ label: existing.label, isNew: false });
    } else {
      const id = genId();
      newOptions.devices.push({ id, label });
      deviceIds.push(id);
      devicePreview.push({ label, isNew: true });
    }
  }

  // 交流规则为单选：取第一个非空。
  let communicationId = "";
  let commPreview = null;
  const commLabel = (cfg?.communication ?? "").trim();
  if (commLabel) {
    const existing = findByLabel(commOptions, commLabel);
    if (existing) {
      communicationId = existing.id;
      commPreview = { label: existing.label, isNew: false };
    } else {
      const id = genId();
      newOptions.communication.push({ id, label: commLabel });
      communicationId = id;
      commPreview = { label: commLabel, isNew: true };
    }
  }

  // 任务类型只能映射到任务库既有标签。
  const seenTag = new Set();
  const taskTypePreview = [];
  const taskTypeIds = [];
  for (const label of dedupeLabels(cfg?.taskTypes)) {
    if (seenTag.has(norm(label))) continue;
    seenTag.add(norm(label));
    const existing = findByLabel(tagOptions, label);
    if (existing) {
      taskTypeIds.push(existing.id);
      taskTypePreview.push({ label: existing.label, matched: true });
    } else {
      taskTypePreview.push({ label, matched: false });
    }
  }

  return {
    newOptions,
    settings: {
      ...baseSettings,
      devices: deviceIds,
      communication: communicationId,
      taskTypes: taskTypeIds,
    },
    preview: {
      devices: devicePreview,
      communication: commPreview,
      taskTypes: taskTypePreview,
      note: (cfg?.note ?? "").trim(),
    },
  };
}

function dedupeLabels(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}
