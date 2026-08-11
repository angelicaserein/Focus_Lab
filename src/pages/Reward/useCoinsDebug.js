import { useState } from "react";

// 把调试输入规整成非负整数金币（空 / 负数 / 非法输入一律归零）。
export function normalizeCoins(raw) {
  return Math.max(0, Math.floor(Number(raw)) || 0);
}

// 调试面板状态：直接把金币改成任意值（仅开发调试用）。
// 依赖注入 coins（打开时回填当前值）、setCoinsTo（写入）、showToast（反馈）与 t（文案）。
export default function useCoinsDebug({ coins, setCoinsTo, showToast, t }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const openDebug = () => {
    setValue(String(coins));
    setOpen(true);
  };

  const close = () => setOpen(false);

  const apply = (e) => {
    e.preventDefault();
    setCoinsTo(value);
    setOpen(false);
    showToast({ message: t("reward.debug.coinsSet", { count: normalizeCoins(value) }), icon: "🛠️" });
  };

  return { open, value, setValue, openDebug, close, apply };
}
