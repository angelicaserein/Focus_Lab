import { useState } from "react";
import useToast from "@/hooks/common/useToast";

// 收集被勾选条目的文本，按 timeline 顺序换行拼接（喂给 AI 拆任务）。
export function collectSelectedText(timeline, selected) {
  return timeline
    .filter((i) => selected.has(i.id))
    .map((i) => i.text)
    .join("\n");
}

// 「AI 整理成任务」的交互状态：勾选已有条目 + 成功提示。
// 依赖注入 timeline（用于取勾选条目文本）、ai（useTaskExtraction 实例）、activeDatabase。
export default function useMemoAiOrganize({ timeline, ai, activeDatabase }) {
  const [selected, setSelected] = useState(() => new Set());
  const { toast: savedMsg, showToast } = useToast(3200);

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const requestFromSelected = () => {
    const text = collectSelectedText(timeline, selected);
    if (text.trim()) ai.request(text);
  };

  const commit = (tasks) => {
    const n = ai.commit(tasks);
    clearSelection();
    if (n > 0) {
      showToast(`已加入 ${n} 条任务到「${activeDatabase?.name ?? "任务"}」`);
    }
  };

  return {
    selected,
    toggleSelect,
    clearSelection,
    savedMsg,
    requestFromSelected,
    commit,
  };
}
