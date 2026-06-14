import React, { useContext } from "react";
import useLocalStorage from "../hooks/useLocalStorage";

// RewardContext 管理「奖励」相关状态：
//   1. coins —— 金币余额，完成专注任务时按秒发放（1 秒 = 1 枚）。
//   2. owned —— 已永久解锁的商品 id 集合。
//   3. redeemCounts —— 可重复兑换商品 id → 已兑换次数。
// 放在 Provider 树最外层，任意页面都能消费。

const COINS_KEY = "coins_v1";
const OWNED_KEY = "reward_owned_v1";
const REDEEM_KEY = "reward_redeem_v1";

// 商品目录（静态，无需持久化）。
//   type: "unlock"     —— 买过即拥有，不可重复买。
//   type: "consumable" —— 可反复兑换，记录次数。
export const SHOP_ITEMS = [
  {
    id: "theme-pink",
    name: "粉色主题",
    icon: "🌸",
    price: 30,
    type: "unlock",
    desc: "解锁一套柔和的粉色界面皮肤",
  },
  {
    id: "theme-night",
    name: "暗夜皮肤",
    icon: "🌙",
    price: 50,
    type: "unlock",
    desc: "解锁深色护眼的暗夜界面",
  },
  {
    id: "milk-tea",
    name: "奶茶券",
    icon: "🧋",
    price: 10,
    type: "consumable",
    desc: "奖励自己一杯奶茶",
  },
  {
    id: "dessert",
    name: "甜点奖励",
    icon: "🍰",
    price: 20,
    type: "consumable",
    desc: "来块蛋糕犒劳一下",
  },
  {
    id: "game-time",
    name: "游戏 30 分钟",
    icon: "🎮",
    price: 60,
    type: "consumable",
    desc: "心安理得地玩 30 分钟",
  },
];

const RewardContext = React.createContext(null);

export function RewardProvider({ children }) {
  const [coins, setCoins] = useLocalStorage(COINS_KEY, 0);
  const [owned, setOwned] = useLocalStorage(OWNED_KEY, []);
  const [redeemCounts, setRedeemCounts] = useLocalStorage(REDEEM_KEY, {});

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
    } else {
      setRedeemCounts((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1,
      }));
    }
    setCoins((prev) => prev - item.price);
    return true;
  };

  const isOwned = (id) => owned.includes(id);
  const getRedeemCount = (id) => redeemCounts[id] || 0;

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
