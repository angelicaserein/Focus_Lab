// ──────────────────────────────────────────────────────────────
//  倒脑子的「拆分偏好」
//
//  用户在设置页调好之后长期生效（localStorage），每次倒脑子自动带上。
//  这里只负责 (1) 默认值与规范化 (2) 把偏好翻成一段喂给模型的中文规则。
//
//  规则段在浏览器侧拼好再发给代理（和 schemaHint 一样），
//  服务器只管把字符串塞进 system prompt —— 偏好的语义不必在两处各写一遍。
// ──────────────────────────────────────────────────────────────

export const GRANULARITIES = ["coarse", "balanced", "fine"];

export const DEFAULT_SPLIT_PREFS = {
  granularity: "balanced",
  // 抽取前先让 AI 反问一轮（1–3 个选择题，可跳过）
  askFirst: true,
  // 原文没写截止时间时，允不允许模型按语气推断一个日期
  guessDates: false,
  // 自由文本：用户自己的拆分规矩，原样附在 prompt 末尾
  customRules: "",
};

// 存档可能来自旧版本或被手改过，读出来一律过一遍这里。
export function normalizeSplitPrefs(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    granularity: GRANULARITIES.includes(p.granularity)
      ? p.granularity
      : DEFAULT_SPLIT_PREFS.granularity,
    askFirst: typeof p.askFirst === "boolean" ? p.askFirst : DEFAULT_SPLIT_PREFS.askFirst,
    guessDates: typeof p.guessDates === "boolean" ? p.guessDates : DEFAULT_SPLIT_PREFS.guessDates,
    customRules: typeof p.customRules === "string" ? p.customRules.slice(0, 800) : "",
  };
}

// 三档粒度各自的说明。注意都不含「宁可少拆」这类保守指令——
// 拆多拆少由用户在设置页说了算，模型不再自作主张地压缩。
const GRANULARITY_RULES = {
  coarse: [
    "- 原文提到的一件事就出一条任务，不要再往下拆步骤。",
    "- 宁可让一条任务大一点，也不要把它切开。",
  ],
  balanced: [
    "- 原文提到的一件事，若一次坐下就能做完，出一条任务。",
    "- 若那件事明显要好几步、或要跨天才做得完，拆成 2–4 条可依次执行的子任务；",
    "  这时不要再额外输出一条概括性的父任务，同一件事只在结果里出现一次。",
  ],
  fine: [
    "- 把每件事拆到「看一眼就知道现在该动哪只手」的程度，通常每件事 3–6 条。",
    "- 每条都要是能立刻开始、不必再想「那第一步是什么」的动作。",
    "- 第一条尽量是个极小的启动动作（打开文件、翻到某页、列个清单）。",
    "- 拆开后不要再额外输出一条概括性的父任务，同一件事只在结果里出现一次。",
  ],
};

// 把偏好 + 本轮反问答案翻成 prompt 里的「粒度规则 / 你的规矩」两段。
// answers: [{ question, answer }]，来自反问环节；没有就传空。
export function buildRulesHint(prefs = DEFAULT_SPLIT_PREFS, answers = []) {
  const p = normalizeSplitPrefs(prefs);
  const lines = ["粒度规则：", ...GRANULARITY_RULES[p.granularity]];

  lines.push(
    p.guessDates
      ? "- 原文没写死期但语气上有时限（「尽快」「这周内」）时，可以按今天推一个合理的 dueDate。"
      : "- 原文没写明死期就不要填 dueDate，别靠语气猜。",
  );

  const custom = p.customRules.trim();
  if (custom) {
    lines.push("", "用户自己定下的规矩（优先级高于上面的粒度规则）：", custom);
  }

  const answered = (answers ?? []).filter((a) => a?.question && a?.answer);
  if (answered.length) {
    lines.push("", "本次用户已经确认过的偏好：");
    for (const a of answered) lines.push(`- ${a.question} → ${a.answer}`);
  }

  return lines.join("\n");
}
