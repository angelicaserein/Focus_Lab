import { useEffect, useRef, useState } from "react";

// 数字滚动动画：从 0 缓动到 target。尊重 prefers-reduced-motion（直接给终值）。
// 用于结算卡的金币 / 经验数字，增强「到手」的正反馈。
export default function useCountUp(target, { duration = 900, enabled = true } = {}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!enabled || reduce || target <= 0) {
      setValue(target);
      return undefined;
    }

    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return value;
}
