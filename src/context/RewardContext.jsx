import React, { useContext } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { useTheme } from "@/context/ThemeContext";

// SHOP_ITEMS 已迁移到 utils/shopConfig.js，此处 re-export 以保持向后兼容。
export { SHOP_ITEMS } from "@/utils/shopConfig";

// RewardContext 管理「奖励」相关状态：
//   1. coins —— 金币余额，完成专注任务时按秒发放（1 秒 = 1 枚）。
//   2. owned —— 已永久解锁的商品 id 集合。
//   3. redeemCounts —— 可重复兑换商品 id → 已兑换次数。
//   4. customItems —— 用户自定义商品（名称 / 图标 / 花费），均按 consumable 处理。
// 主题切换逻辑已迁移至 ThemeContext（src/context/ThemeContext.jsx）。
// 放在 Provider 树 ThemeProvider 内层，以便 buyItem 可调用 useTheme().setTheme。

const RewardContext = React.createContext(null);

export function RewardProvider({ children }) {
  const [coins, setCoins] = useLocalStorage(STORAGE_KEYS.COINS, 0);
  const [owned, setOwned] = useLocalStorage(STORAGE_KEYS.REWARD_OWNED, []);
  const [redeemCounts, setRedeemCounts] = useLocalStorage(STORAGE_KEYS.REWARD_REDEEM, {});
  const [customItems, setCustomItems] = useLocalStorage(STORAGE_KEYS.REWARD_CUSTOM, []);
  const { setTheme } = useTheme();

  // 增加金币（供 Focus 完成任务时调用）。非正数忽略。
  const addCoins = (amount) => {
    if (!amount || amount <= 0) return;
    setCoins((prev) => prev + Math.floor(amount));
  };

  // 花费金币（供祈愿等消费场景调用）。余额不足或非正数返回 false、不扣款。
  const spendCoins = (amount) => {
    const cost = Math.floor(Number(amount));
    if (!Number.isFinite(cost) || cost <= 0 || coins < cost) return false;
    setCoins((prev) => prev - cost);
    return true;
  };

  // 兑换商品：余额不足返回 false；unlock 已拥有则忽略并返回 false。
  const buyItem = (item) => {
    if (!item || coins < item.price) return false;
    if (item.type === "unlock") {
      if (owned.includes(item.id)) return false;
      setOwned((prev) => [...prev, item.id]);
      // 购买主题后自动切换到该主题
      if (item.id.startsWith("theme-")) setTheme(item.id);
    } else {
      setRedeemCounts((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? 0) + 1,
      }));
    }
    setCoins((prev) => prev - item.price);
    return true;
  };

  const isOwned = (id) => owned.includes(id);
  const getRedeemCount = (id) => redeemCounts[id] ?? 0;

  // 添加用户自定义商品。名称为空或花费非正数则忽略，返回 false。
  const addCustomItem = ({ name, price, icon, desc }) => {
    const trimmed = (name ?? "").trim();
    const cost = Math.floor(Number(price));
    if (!trimmed || !Number.isFinite(cost) || cost <= 0) return false;
    setCustomItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        icon: (icon ?? "").trim() || "🎁",
        price: cost,
        type: "consumable",
        desc: (desc ?? "").trim(),
        custom: true,
      },
    ]);
    return true;
  };

  // 编辑一个已有的自定义商品。名称为空或花费非正数则忽略，返回 false。
  const updateCustomItem = (id, { name, price, icon, desc }) => {
    const trimmed = (name ?? "").trim();
    const cost = Math.floor(Number(price));
    if (!trimmed || !Number.isFinite(cost) || cost <= 0) return false;
    setCustomItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              name: trimmed,
              icon: (icon ?? "").trim() || "🎁",
              price: cost,
              desc: (desc ?? "").trim(),
            }
          : it
      )
    );
    return true;
  };

  // 删除一个自定义商品（同时清理它的兑换次数记录）。
  const removeCustomItem = (id) => {
    setCustomItems((prev) => prev.filter((it) => it.id !== id));
    setRedeemCounts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // 直接设置金币余额（调试用）。负数归零并取整。
  const setCoinsTo = (amount) => {
    const next = Math.max(0, Math.floor(Number(amount)));
    setCoins(Number.isFinite(next) ? next : 0);
  };

  const value = {
    coins,
    addCoins,
    spendCoins,
    setCoinsTo,
    buyItem,
    isOwned,
    getRedeemCount,
    customItems,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
  };

  return (
    <RewardContext.Provider value={value}>{children}</RewardContext.Provider>
  );
}

export function useReward() {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error("useReward must be used within RewardProvider");
  return ctx;
}
