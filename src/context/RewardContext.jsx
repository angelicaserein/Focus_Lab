import React, { useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { useTheme } from "./ThemeContext";

// SHOP_ITEMS 已迁移到 utils/shopConfig.js，此处 re-export 以保持向后兼容。
export { SHOP_ITEMS } from "../utils/shopConfig";

// RewardContext 管理「奖励」相关状态：
//   1. coins —— 金币余额，完成专注任务时按秒发放（1 秒 = 1 枚）。
//   2. owned —— 已永久解锁的商品 id 集合。
//   3. redeemCounts —— 可重复兑换商品 id → 已兑换次数。
// 主题切换逻辑已迁移至 ThemeContext（src/context/ThemeContext.jsx）。
// 放在 Provider 树 ThemeProvider 内层，以便 buyItem 可调用 useTheme().setTheme。

const RewardContext = React.createContext(null);

export function RewardProvider({ children }) {
  const [coins, setCoins] = useLocalStorage(STORAGE_KEYS.COINS, 0);
  const [owned, setOwned] = useLocalStorage(STORAGE_KEYS.REWARD_OWNED, []);
  const [redeemCounts, setRedeemCounts] = useLocalStorage(STORAGE_KEYS.REWARD_REDEEM, {});
  const { setTheme } = useTheme();

  // 增加金币（供 Focus 完成任务时调用）。非正数忽略。
  const addCoins = (amount) => {
    if (!amount || amount <= 0) return;
    setCoins((prev) => prev + Math.floor(amount));
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

  const value = {
    coins,
    addCoins,
    buyItem,
    isOwned,
    getRedeemCount,
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
