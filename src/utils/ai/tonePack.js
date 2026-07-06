// ──────────────────────────────────────────────────────────────
//  语气包（Tone Pack）——角色卡 / 结算卡「质化文案」的可替换层
//
//  角色系统里所有「评判类数字」都已改成质化措辞（见 charView.js）。
//  本模块让这套措辞的「语气」可被用户用一段 AI prompt 整体重写：
//  AI 只改这些「槽位」的文案，其余（时长/金币等事实）不动。
//  组件读覆盖、缺失回退 i18n 默认，因此没有 key / 离线时一切照常。
// ──────────────────────────────────────────────────────────────

// 可被语气包覆盖的槽位。desc 给 AI 说明该句用在哪、什么情绪；
// placeholder 标注必须原样保留的占位符（否则回退默认，避免把 {rank} 写没了）。
export const TONE_SLOTS = [
  { key: "character.stage.0", desc: "growth stage name: just sprouting, very beginning" },
  { key: "character.stage.1", desc: "growth stage name: growing steadily" },
  { key: "character.stage.2", desc: "growth stage name: flourishing, hitting a groove" },
  { key: "character.stage.3", desc: "growth stage name: skilled, comfortable" },
  { key: "character.stage.4", desc: "growth stage name: masterful, top tier" },
  { key: "character.grow.early", desc: "gentle line: this stage is just beginning" },
  { key: "character.grow.mid", desc: "gentle line: making steady progress" },
  { key: "character.grow.near", desc: "gentle line: getting close to the next stage" },
  { key: "character.grow.soon", desc: "gentle line: almost at a new stage" },
  { key: "character.momentum.idle", desc: "momentum word: no recent focus, ready to start (never scolding)" },
  { key: "character.momentum.start", desc: "momentum word: just got started" },
  { key: "character.momentum.rhythm", desc: "momentum word: finding a rhythm" },
  { key: "character.momentum.hot", desc: "momentum word: strong momentum, on a roll" },
  { key: "character.achProg.start", desc: "achievement progress: just getting going" },
  { key: "character.achProg.mid", desc: "achievement progress: on the way" },
  { key: "character.achProg.close", desc: "achievement progress: almost there" },
  { key: "character.reward.grow.small", desc: "post-session growth line for a short session; warm, every bit counts" },
  { key: "character.reward.grow.mid", desc: "post-session growth line for a solid session" },
  { key: "character.reward.grow.big", desc: "post-session growth line for a long session; celebratory" },
  { key: "character.reward.streakKept", desc: "warm line shown when focused again today; no numbers" },
  { key: "character.reward.levelUp", desc: "celebratory banner when reaching a new stage", placeholder: "{rank}" },
];

export const TONE_SLOT_KEYS = TONE_SLOTS.map((s) => s.key);

// 把 "{name}" 占位符替换为 vars 中的值（与 LanguageContext 的实现一致）。
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// 语气 prompt 存在时，对已覆盖的槽位做基本校验：必须是非空字符串，
// 且带占位符的槽位必须仍含该占位符。返回干净的 { key: text } 覆盖表。
export function sanitizeTonePhrases(phrases) {
  const out = {};
  if (!phrases || typeof phrases !== "object") return out;
  for (const slot of TONE_SLOTS) {
    const v = phrases[slot.key];
    if (typeof v !== "string") continue;
    const text = v.trim();
    if (!text) continue;
    if (slot.placeholder && !text.includes(slot.placeholder)) continue;
    out[slot.key] = text;
  }
  return out;
}

// 造一个「语气感知」的翻译函数：命中覆盖槽位就用覆盖文案（并做占位符插值），
// 否则回退到原 t()。仅当语气包的语言与当前语言一致时才应用，避免语言不匹配。
export function makeToneT(t, tonePack, lang) {
  const phrases =
    tonePack && tonePack.lang === lang ? tonePack.phrases : null;
  if (!phrases) return t;
  return (key, vars) => {
    const override = phrases[key];
    return typeof override === "string" ? interpolate(override, vars) : t(key, vars);
  };
}

// 离线 / 无 key 时的示例语气包（「热血冒险」腔），证明整套替换链路可跑通。
// 覆盖全部槽位；语言两份。
export const SAMPLE_TONE_PACKS = {
  zh: {
    "character.stage.0": "新芽初绽",
    "character.stage.1": "崭露锋芒",
    "character.stage.2": "渐入化境",
    "character.stage.3": "身经百战",
    "character.stage.4": "登峰造极",
    "character.grow.early": "旅程的号角刚刚吹响",
    "character.grow.mid": "你正稳步开疆拓土",
    "character.grow.near": "下一段传奇近在眼前",
    "character.grow.soon": "新的征程即将开启！",
    "character.momentum.idle": "冒险随时可以启程",
    "character.momentum.start": "序章已经翻开",
    "character.momentum.rhythm": "战意渐渐升腾",
    "character.momentum.hot": "势如破竹！",
    "character.achProg.start": "初露端倪",
    "character.achProg.mid": "稳步推进",
    "character.achProg.close": "近在咫尺",
    "character.reward.grow.small": "点滴皆是历练",
    "character.reward.grow.mid": "扎实的一役",
    "character.reward.grow.big": "一场酣畅的大捷！",
    "character.reward.streakKept": "又一日征战归来，好样的 🔥",
    "character.reward.levelUp": "晋阶 · {rank}",
  },
  en: {
    "character.stage.0": "First Spark",
    "character.stage.1": "Rising",
    "character.stage.2": "Hitting Stride",
    "character.stage.3": "Battle-Worn",
    "character.stage.4": "Legendary",
    "character.grow.early": "The horn of the journey just sounded",
    "character.grow.mid": "Steadily claiming new ground",
    "character.grow.near": "The next legend is within sight",
    "character.grow.soon": "A new quest is about to begin!",
    "character.momentum.idle": "The adventure can start anytime",
    "character.momentum.start": "The prologue is open",
    "character.momentum.rhythm": "Your fighting spirit is rising",
    "character.momentum.hot": "Unstoppable!",
    "character.achProg.start": "First signs showing",
    "character.achProg.mid": "Pressing onward",
    "character.achProg.close": "So close now",
    "character.reward.grow.small": "Every bit is training",
    "character.reward.grow.mid": "A solid battle",
    "character.reward.grow.big": "A glorious victory!",
    "character.reward.streakKept": "Back from another day's quest — well done 🔥",
    "character.reward.levelUp": "ASCEND · {rank}",
  },
};
