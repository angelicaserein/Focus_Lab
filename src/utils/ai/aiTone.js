// ──────────────────────────────────────────────────────────────
//  语气包生成调用封装（照搬 aiChat.js 的三模式分流）
//
//  1. 生产环境（Vercel）→ 调 /api/tone 代理，API key 在服务器侧
//  2. 本地开发 + 有 VITE_ANTHROPIC_API_KEY → 动态 import SDK 直连
//  3. 本地开发 + 无 key → 返回示例语气包（离线也能演示整套替换）
//
//  产物：{ phrases: { <i18nKey>: text }, mode: 'ai' | 'example' }
//  phrases 只含 TONE_SLOTS 里的槽位，其余文案（时长/金币等事实）永不改动。
// ──────────────────────────────────────────────────────────────
import { TRANSLATIONS, DEFAULT_LANG } from "@/i18n/translations";
import { TONE_SLOTS, sanitizeTonePhrases, SAMPLE_TONE_PACKS } from "@/utils/ai/tonePack";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const IS_PROD = import.meta.env.PROD;
const AI_MODEL = "claude-haiku-4-5-20251001";

// UI 用它来提示「AI 模式」还是「示例模式」
export const hasApiKey = () => Boolean(API_KEY) || IS_PROD;

// 组织给模型看的「槽位清单」：key + 用途说明 + 当前默认文案（同尺度参考）。
function buildSlotList(lang) {
  const dict = TRANSLATIONS[lang] ?? TRANSLATIONS[DEFAULT_LANG];
  return TONE_SLOTS.map((s) => {
    const def = dict[s.key] ?? TRANSLATIONS[DEFAULT_LANG][s.key] ?? "";
    const ph = s.placeholder ? ` (MUST keep placeholder ${s.placeholder})` : "";
    return `${s.key} — ${s.desc}${ph} · default: "${def}"`;
  }).join("\n");
}

function systemPrompt(lang) {
  const langName = lang === "zh" ? "Chinese" : "English";
  return [
    "You rewrite a fixed set of short UI microcopy strings for a focus app's RPG-style character card, in a specific voice/tone the user describes.",
    `Write every string in ${langName}.`,
    "Hard rules:",
    "- Keep each string SHORT (a few words, like the defaults).",
    "- NEVER include numbers, scores, percentages, levels, or 'X of Y' — these are meant to feel encouraging and non-judgmental (the app serves people with ADHD).",
    "- Preserve any {placeholder} token EXACTLY as given.",
    "- Keep the same meaning/role as each slot's description; only the voice changes.",
    "Reply with ONLY a JSON object mapping each given key to its rewritten string. No markdown, no commentary.",
  ].join("\n");
}

function userPrompt(tone, lang) {
  return [
    `Voice / tone to use: ${tone}`,
    "",
    "Rewrite these slots (key — role · default):",
    buildSlotList(lang),
  ].join("\n");
}

// 从模型文本里稳妥地取出第一个 JSON 对象。
function parsePhrases(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const sample = (lang) => ({
  phrases: sanitizeTonePhrases(SAMPLE_TONE_PACKS[lang] ?? SAMPLE_TONE_PACKS[DEFAULT_LANG]),
  mode: "example",
});

// 生成一个语气包。tone = 用户输入的一段描述/prompt；lang = 当前界面语言。
export async function generateTonePack(tone, lang = DEFAULT_LANG) {
  const clean = (tone || "").trim();
  if (!clean) throw new Error("empty tone");

  // 本地开发且无 key → 示例语气包
  if (!API_KEY && !IS_PROD) return sample(lang);

  // 生产环境 → 服务器代理
  if (IS_PROD) {
    try {
      const resp = await fetch("/api/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: clean,
          lang,
          system: systemPrompt(lang),
          user: userPrompt(clean, lang),
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { phrases } = await resp.json();
      const clean2 = sanitizeTonePhrases(phrases);
      if (Object.keys(clean2).length === 0) throw new Error("empty phrases");
      return { phrases: clean2, mode: "ai" };
    } catch {
      return sample(lang);
    }
  }

  // 本地开发 + 有 key → SDK 直连
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
    const resp = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt(lang),
      messages: [{ role: "user", content: userPrompt(clean, lang) }],
    });
    const text = resp.content.map((b) => b.text).join("");
    const clean2 = sanitizeTonePhrases(parsePhrases(text));
    if (Object.keys(clean2).length === 0) throw new Error("empty phrases");
    return { phrases: clean2, mode: "ai" };
  } catch {
    return sample(lang);
  }
}
