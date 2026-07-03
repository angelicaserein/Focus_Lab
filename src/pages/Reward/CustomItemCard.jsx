import React from "react";
import { useReward } from "@/context/RewardContext";
import { getItemState } from "./rewardUtils";

// 「我的自定义」商品卡，带编辑 / 删除操作。
// onPurchased(item) 兑换成功回调；onEdit(item) / onDelete(id) 由页面提供。
export default function CustomItemCard({ item, onPurchased, onEdit, onDelete }) {
  const { coins, isOwned, getRedeemCount, buyItem } = useReward();
  const { owned, count, affordable, disabled } = getItemState(item, {
    coins,
    isOwned,
    getRedeemCount,
  });

  let btnLabel = "兑换";
  if (owned) btnLabel = "已拥有 ✓";
  else if (!affordable) btnLabel = "金币不足";

  return (
    <div className="reward-shop-card">
      {count > 0 && <span className="reward-shop-badge">已兑换 ×{count}</span>}
      <div className="reward-shop-actions">
        <button
          className="reward-shop-action"
          title="编辑"
          aria-label={`编辑 ${item.name}`}
          onClick={() => onEdit(item)}
        >
          ✏️
        </button>
        <button
          className="reward-shop-action"
          title="删除"
          aria-label={`删除 ${item.name}`}
          onClick={() => onDelete(item.id)}
        >
          🗑️
        </button>
      </div>
      <div className="reward-shop-icon">{item.icon}</div>
      <div className="reward-shop-name">{item.name}</div>
      <div className="reward-shop-desc">{item.desc}</div>
      <div className="reward-shop-footer">
        <span className="reward-shop-price">🪙 {item.price}</span>
        <button
          className={`reward-buy-btn ${owned ? "owned" : ""}`}
          disabled={disabled}
          onClick={() => {
            if (buyItem(item)) onPurchased(item);
          }}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}
