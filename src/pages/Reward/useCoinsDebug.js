import { useState } from "react";

// 调试面板状态：直接把金币改成任意值（仅开发调试用）。
// 依赖注入 coins（打开时回填当前值）、setCoinsTo（写入）与 showToast（反馈）。
export default function useCoinsDebug({ coins, setCoinsTo, showToast }) {
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
    const applied = Math.max(0, Math.floor(Number(value)) || 0);
    showToast({ message: `金币已设为 ${applied}`, icon: "🛠️" });
  };

  return { open, value, setValue, openDebug, close, apply };
}
