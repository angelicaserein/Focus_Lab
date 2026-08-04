// ──────────────────────────────────────────────────────────────
//  AI 游戏主持人「旅程旁白」（可选增强层）
//
//  把角色卡已有的真实进展（成长阶段 / 势头 / 最投入方向…）交给 AI，讲成一段
//  正在展开的冒险叙事。属于锦上添花：任何失败 / 无 key 都回退到本地模板旁白，
//  UI 永远有内容、绝不阻塞。直接服务论文 RQ2 的 GenAI 整合创新点。
//
//  三种模式（与 aiChat.js / aiRecommend.js 对齐，自动切换）：
//  1. 生产环境（Vercel）→ 调用 /api/narrate 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_OPENAI_API_KEY → 直接调用 SDK
//  3. 无 key → 本地模板旁白（按 variant 轮换措辞，refresh 也能换一段）
//
//  注意：openai SDK 用动态 import() 按需加载，避免静态打进浏览器 chunk
//  触发 Vite 运行时重优化 + 整页刷新（详见 aiClient.js 注释）。
//  三模式的机械件（配置 / hasApiKey / delay / SDK 直连 / 代理请求）见 aiClient.js。

import { IS_PROD, hasApiKey, delay, chatComplete, postProxy } from "@/utils/ai/aiClient";

export { hasApiKey };

export function buildSystemPrompt(lang) {
  const zh = lang !== "en";
  return [
    zh
      ? "你是一个温柔的「说书人 / 旅程旁白」，把用户在一款 ADHD 友好专注 App 里的真实进展，讲成一段正在展开的冒险叙事。"
      : "You are a gentle Narrator who tells the story of a player's real progress in an ADHD-friendly focus app, as an unfolding adventure.",
    "",
    zh ? "规则：" : "Rules:",
    zh ? "- 用第二人称「你」，2~3 句，温暖、有画面感、像 RPG 旁白。"
      : "- Second person, 2-3 sentences, warm and vivid, like RPG narration.",
    zh ? "- ADHD 友好：庆祝「出现即胜利」，绝不施压、不催促、不评判。"
      : "- ADHD-friendly: celebrate simply showing up; never pressure, nag, or judge.",
    zh ? "- 自然融入给到的事实（含具体数字，如累计时长、连续天数），但要织进叙事，别堆成数据清单。"
      : "- Weave in the given facts — including concrete numbers like total minutes or streak days — naturally into the story, not as a bare list.",
    zh ? "- 只输出这段叙事本身，不要标题、不要引号、不要解释。"
      : "- Output only the narration itself — no title, no quotes, no explanation.",
    zh ? "- 全程用中文。" : "- Write entirely in English.",
  ].join("\n");
}

export function buildUserPayload(ctx = {}, lang) {
  const zh = lang !== "en";
  const L = (a, b) => (zh ? a : b);
  return [
    L("称号：", "Title: ") + (ctx.rankName ?? "-"),
    L("成长阶段：", "Growth stage: ") + (ctx.stageText ?? "-"),
    L("当下势头：", "Momentum: ") + (ctx.momentumText ?? "-"),
    L("累计专注：", "Total focus: ") + (ctx.totalMins ?? 0) + L(" 分钟", " min"),
    L("专注次数：", "Sessions: ") + (ctx.sessionCount ?? 0),
    L("连续天数：", "Streak days: ") + (ctx.streak ?? 0),
    ctx.topSkillName ? L("最投入的方向：", "Strongest focus: ") + ctx.topSkillName : null,
    ctx.unmetAchTitle ? L("即将靠近的成就：", "An achievement drawing near: ") + ctx.unmetAchTitle : null,
  ].filter(Boolean).join("\n");
}

// 剥掉模型偶尔多带的引号 / 代码围栏。
function cleanNarration(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").replace(/^["“「]|["”」]$/g, "").trim();
}

// ── 本地模板旁白（无 key / 兜底） ────────────────────────────
// 按 variant 轮换开头与收尾，让「换一段」在离线时也有变化。措辞刻意 ADHD 友好。
export function localNarration(ctx = {}, lang = "zh", variant = 0) {
  const zh = lang !== "en";
  const v = Math.abs(variant | 0);
  const pick = (arr) => arr[v % arr.length];
  const isNew = (ctx.sessionCount ?? 0) === 0;

  if (zh) {
    if (isNew) {
      return pick([
        "旅程还停在扉页——灯还亮着，随时等你翻开第一章。",
        "故事尚未开始，但这恰恰是最好的部分：你可以从任何一小步落笔。",
        "序章空白，主角已就位。哪怕只是坐下五分钟，也算正式启程。",
      ]);
    }
    const open = pick([
      `你已走到「${ctx.stageText}」这一段，${ctx.momentumText}。`,
      `翻开新的一页——「${ctx.stageText}」的你，${ctx.momentumText}。`,
      `旅程行至「${ctx.stageText}」，${ctx.momentumText}。`,
    ]);
    const mid = ctx.topSkillName
      ? pick([
          `你在「${ctx.topSkillName}」上投下的时间最多，那束光正一点点变亮。`,
          `「${ctx.topSkillName}」是你走得最深的一条路，脚印清晰可见。`,
          `属于「${ctx.topSkillName}」的篇章最厚，翻起来沙沙作响。`,
        ])
      : "你留下的每一次专注，都在给这段故事添一行字。";
    const end = ctx.unmetAchTitle
      ? pick([
          `远处，「${ctx.unmetAchTitle}」的轮廓已隐约可见——不急，你会顺路遇见它。`,
          `前方似乎有「${ctx.unmetAchTitle}」在等你，但那是后话了。`,
          `下一处风景像是「${ctx.unmetAchTitle}」，路会自己把你带过去。`,
        ])
      : "接下来往哪走都行，故事会跟着你的节奏继续。";
    return `${open}${mid}${end}`;
  }

  if (isNew) {
    return pick([
      "The journey rests on its title page — the lamp is lit, waiting for you to open chapter one.",
      "The story hasn't begun yet, and that's the best part: you can start from any small step.",
      "A blank prologue, and the hero's already here. Even five minutes counts as setting out.",
    ]);
  }
  const open = pick([
    `You've reached "${ctx.stageText}", and ${String(ctx.momentumText).toLowerCase()}.`,
    `A new page turns — at "${ctx.stageText}", ${String(ctx.momentumText).toLowerCase()}.`,
    `The road has carried you to "${ctx.stageText}"; ${String(ctx.momentumText).toLowerCase()}.`,
  ]);
  const mid = ctx.topSkillName
    ? pick([
        ` You've poured the most time into "${ctx.topSkillName}", and that light keeps growing brighter.`,
        ` "${ctx.topSkillName}" is the path you've walked deepest — the footprints are clear.`,
        ` The chapter named "${ctx.topSkillName}" is the thickest one you've written so far.`,
      ])
    : " Every session you leave behind adds another line to this story.";
  const end = ctx.unmetAchTitle
    ? pick([
        ` In the distance, "${ctx.unmetAchTitle}" is just coming into view — no rush; you'll meet it along the way.`,
        ` Something like "${ctx.unmetAchTitle}" seems to wait ahead, but that's a tale for later.`,
        ` The next landmark looks like "${ctx.unmetAchTitle}"; the path will take you there in time.`,
      ])
    : " Wherever you go next, the story continues at your pace.";
  return `${open}${mid}${end}`;
}

// ── 厂长「播报」人设（工业页专用，1 句，工业风） ────────────────
export function buildForemanSystem(lang) {
  const zh = lang !== "en";
  return [
    zh
      ? "你是一座自动化工厂的「厂长」，用一句话播报当前的生产态势，语气干练、带点工业浪漫，像车间广播。"
      : "You are the Foreman of an automated factory, broadcasting the current production status in one line — brisk, with a touch of industrial romance, like a shop-floor announcement.",
    zh ? "规则：" : "Rules:",
    zh ? "- 只输出 1 句，简短有力。" : "- Output exactly 1 short, punchy line.",
    zh ? "- ADHD 友好：肯定「已经产出的」，绝不催促、不施压。"
      : "- ADHD-friendly: affirm what's already produced; never nag or pressure.",
    zh ? "- 自然带入给到的事实（可含具体数字，如产量），别写成干巴巴的数据。只输出这句播报本身。"
      : "- Weave in the facts naturally (concrete numbers like output are fine), not as dry stats. Output only the line itself.",
    zh ? "- 用中文。" : "- Write in English.",
  ].join("\n");
}

export function buildForemanPayload(ctx = {}, lang) {
  const zh = lang !== "en";
  const L = (a, b) => (zh ? a : b);
  return [
    L("工厂规模：", "Factory scale: ") + (ctx.tierName ?? "-"),
    L("总产能：", "Total output: ") + (ctx.totalIp ?? 0) + " IP",
    L("今日产出：", "Today: ") + (ctx.todayIp ?? 0) + " IP",
    L("主力产线：", "Lead line: ") + (ctx.topLineName ?? "-"),
    L("运转状态：", "Status: ") + (ctx.running ? L("运转中", "running") : L("待开工", "idle")),
  ].join("\n");
}

export function localForeman(ctx = {}, lang = "zh", variant = 0) {
  const zh = lang !== "en";
  const v = Math.abs(variant | 0);
  const pick = (arr) => arr[v % arr.length];
  if (!ctx.running) {
    return zh
      ? pick(["全线待命，随时可开工——先来一小段专注就行。", "机器已预热，等你按下第一个开关。", "车间安静，灯还亮着；一件小事就能让传送带转起来。"])
      : pick(["All lines on standby — one small focus and we roll.", "Machines pre-heated, waiting on your first switch.", "The floor is quiet, the lights are on; one small task starts the belt."]);
  }
  return zh
    ? pick([
        `${ctx.tierName}运转正常，今日已下料，主力在「${ctx.topLineName}」。`,
        `传送带稳稳转着——「${ctx.topLineName}」这条线今天最忙。`,
        `${ctx.tierName}全线开工，产出在稳稳累加，这就是你造出来的。`,
      ])
    : pick([
        `${ctx.tierName} running smooth — output logged today, "${ctx.topLineName}" leading.`,
        `Belts turning steady; "${ctx.topLineName}" is the busiest line today.`,
        `${ctx.tierName} online, output stacking up — all of it built by you.`,
      ]);
}

// ── 专注陪伴「一盏暖光」人设（专注页问候带专用，第一人称、1 句、暖） ──────
// 一盏无名的暖光，用「我」自称、对「你」说话，陪你开始 / 进行一次专注。
// 只说一句短话，永远鼓励、从不评判、绝不催促——契合 ADHD 友好原则。
export function buildLumiSystem(lang) {
  const zh = lang !== "en";
  return [
    zh
      ? "你是一盏会飘的暖光，长夜里陪用户在一款 ADHD 友好专注 App 里专注。用第一人称「我」自称，对「你」说话。"
      : "You are a small floating lamp-light that keeps the user company while they focus in an ADHD-friendly app. Speak in first person as 'I', addressing them as 'you'.",
    zh ? "规则：" : "Rules:",
    zh ? "- 只说 1 句短话（不超过约 25 字），像身边伙伴的轻声陪伴，可带一点童趣。"
      : "- Say exactly 1 short line (under ~20 words), like a companion beside them — a little playful is fine.",
    zh ? "- ADHD 友好：庆祝「你出现了」，绝不催促、不施压、不评判。"
      : "- ADHD-friendly: celebrate that they showed up; never nag, pressure, or judge.",
    zh ? "- 自然带入给到的情境（当前状态、选了几件任务、情景），提到数字也没关系，但要说得像陪伴的话，别像报数。"
      : "- Weave in the given context (current state, tasks chosen, scenario) naturally; mentioning numbers is fine, but keep it companionable, not a readout.",
    zh ? "- 只输出这一句本身，不要标题、不要引号、不要解释。"
      : "- Output only the line itself — no title, no quotes, no explanation.",
    zh ? "- 用中文。" : "- Write in English.",
  ].join("\n");
}

export function buildLumiPayload(ctx = {}, lang) {
  const zh = lang !== "en";
  const L = (a, b) => (zh ? a : b);
  const moodText = {
    idle: L("待命，还没选任务", "idle, no task chosen yet"),
    focus: L("准备好开始专注了", "ready to start focusing"),
    cheer: L("刚完成，值得庆祝", "just finished — worth celebrating"),
    sleepy: L("夜深了，有点困", "late night, a little sleepy"),
  };
  return [
    L("当前状态：", "Current state: ") + (moodText[ctx.mood] ?? moodText.idle),
    ctx.taskCount ? L("已选任务数：", "Tasks chosen: ") + ctx.taskCount : null,
    ctx.scenarioName ? L("当前情景：", "Scenario: ") + ctx.scenarioName : null,
  ].filter(Boolean).join("\n");
}

// 本地兜底（无 key / 失败）：按心情 + variant 轮换一句暖话。刻意 ADHD 友好。
export function localLumi(ctx = {}, lang = "zh", variant = 0) {
  const zh = lang !== "en";
  const v = Math.abs(variant | 0);
  const pick = (arr) => arr[v % arr.length];
  const mood = ["idle", "focus", "cheer", "sleepy"].includes(ctx.mood) ? ctx.mood : "idle";
  const scene = ctx.scenarioName;

  const BANK = {
    zh: {
      idle: [
        "我在这儿陪着，想从哪件小事开始都行。",
        "不急，先喘口气——你出现了，就已经很好。",
        "灯亮着呢，你挑一件顺手的，我们慢慢来。",
      ],
      focus: [
        scene ? `「${scene}」这段，我陪你一起走。` : "选好了呀，那我们这就开始吧。",
        "我把灯调亮一点，接下来交给你。",
        "准备好啦，这一小段路我一直在旁边。",
      ],
      cheer: [
        "你做到了！这一下我要记很久。",
        "看，光又亮了一点点——都是你点的。",
        "先为刚才鼓个掌，你值得停下来高兴一下。",
      ],
      sleepy: [
        "夜深了，做一点点就够，我陪你到这儿。",
        "困了就靠一会儿，灯不会灭的。",
        "轻轻来就好，今晚有我守着。",
      ],
    },
    en: {
      idle: [
        "I'm right here — start from any small thing you like.",
        "No rush; take a breath. You showed up, and that's plenty.",
        "The lamp's on. Pick whatever's easy and we'll go slow.",
      ],
      focus: [
        scene ? `Into "${scene}" we go — I'm right beside you.` : "All set — let's begin, then.",
        "I'll turn the light up a little; the rest is yours.",
        "Ready when you are — I'll stay close for this stretch.",
      ],
      cheer: [
        "You did it! I'll remember this one for a long while.",
        "Look — the light's a bit brighter, and that was you.",
        "Let's clap for that first; you've earned a happy pause.",
      ],
      sleepy: [
        "It's late — a tiny bit is enough. I'll stay this far with you.",
        "Lean back if you're tired; the lamp won't go out.",
        "Softly does it. I'm keeping watch tonight.",
      ],
    },
  };
  return pick(BANK[zh ? "zh" : "en"][mood]);
}

// ── 通用运行器 + 三个人设入口 ─────────────────────────────────
// persona: "journey"（旅程旁白） | "foreman"（厂长播报） | "lumi"（暖光陪伴）。返回 { text, source }。
const PERSONA = {
  journey: { system: buildSystemPrompt, payload: buildUserPayload, local: localNarration, maxTokens: 320 },
  foreman: { system: buildForemanSystem, payload: buildForemanPayload, local: localForeman, maxTokens: 160 },
  lumi: { system: buildLumiSystem, payload: buildLumiPayload, local: localLumi, maxTokens: 120 },
};

async function runNarration(persona, ctx, { lang = "zh", variant = 0 } = {}) {
  const p = PERSONA[persona] ?? PERSONA.journey;
  const fallback = () => p.local(ctx, lang, variant);

  if (!hasApiKey()) {
    await delay(300 + Math.random() * 300);
    return { text: fallback(), source: "local" };
  }

  try {
    let raw;
    if (IS_PROD) {
      const { result } = await postProxy("/api/narrate", { context: ctx, lang, persona });
      raw = result;
    } else {
      raw = await chatComplete({
        system: p.system(lang),
        user: p.payload(ctx, lang),
        maxTokens: p.maxTokens,
      });
    }
    const text = cleanNarration(raw);
    return text ? { text, source: "ai" } : { text: fallback(), source: "local" };
  } catch {
    return { text: fallback(), source: "local" };
  }
}

// 旅程旁白（角色页）。ctx: { rankName, stageText, momentumText, totalMins, sessionCount, streak, topSkillName, unmetAchTitle }
export function narrateJourney(ctx = {}, opts = {}) {
  return runNarration("journey", ctx, opts);
}

// 厂长播报（工业页）。ctx: { tierName, totalIp, todayIp, topLineName, running }
export function narrateForeman(ctx = {}, opts = {}) {
  return runNarration("foreman", ctx, opts);
}

// 暖光陪伴（专注页问候带）。ctx: { mood, taskCount, scenarioName }
export function narrateLumi(ctx = {}, opts = {}) {
  return runNarration("lumi", ctx, opts);
}
