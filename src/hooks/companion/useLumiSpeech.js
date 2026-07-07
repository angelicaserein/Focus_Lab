import { useEffect, useState, useCallback, useMemo } from "react";
import { companionLine } from "@/data/companion/companionData";
import { narrateLumi, hasApiKey } from "@/utils/ai/aiNarrate";

// 让常驻伙伴「灯灯」说一句台词。
// 分层：本地 i18n 台词即时顶上（离线也在、绝不空白），有 AI（prod 或本地 key）时
// 异步升级成一句情境化的动态台词——直接服务论文 RQ2 的 GenAI 整合。永不阻塞、可换一句。
//
// facts: { mood, taskCount, scenarioName }。mood / 语言 / 手动 refresh 时才重取，
// 避免计时 tick、调时长等无关渲染反复打 AI。
export default function useLumiSpeech({ t, lang, mood = "idle", taskCount = 0, scenarioName = null }) {
  const [variant, setVariant] = useState(0);

  // 即时本地台词：mood / 语言 / 换一句 变了就重挑一条（companionLine 内部随机选）。
  const localSay = useMemo(
    () => companionLine(t, mood),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mood, lang, variant],
  );
  const [state, setState] = useState({ text: localSay, source: "local", loading: false });

  // 本地台词换了先顶上（AI 未到 / 无 key 时就用它，不会闪空）。
  useEffect(() => {
    setState((s) => ({ ...s, text: localSay, source: "local" }));
  }, [localSay]);

  useEffect(() => {
    if (!hasApiKey()) return; // 无 key：保持本地 i18n 台词，不发请求
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    narrateLumi({ mood, taskCount, scenarioName }, { lang, variant }).then((res) => {
      if (alive && res.text) setState({ text: res.text, source: res.source, loading: false });
    });
    return () => {
      alive = false;
    };
    // taskCount / scenarioName 故意不入依赖：只在 mood/语言/换一句 时升级，避免频繁调用。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, lang, variant]);

  const refresh = useCallback(() => setVariant((v) => v + 1), []);
  return { say: state.text, source: state.source, loading: state.loading, refresh, hasAi: hasApiKey() };
}
