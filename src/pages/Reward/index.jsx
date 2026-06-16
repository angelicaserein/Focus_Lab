import React, { useState, useEffect } from "react";
import { useReward, SHOP_ITEMS } from "../../context/RewardContext";
import "./Reward.css";

export default function RewardPage() {
  const { coins, buyItem, isOwned, getRedeemCount } = useReward();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="page-reward">
      <div className="reward-headline">
        <h1>奖励</h1>
      </div>

      {/* 资产卡 */}
      <div className="reward-asset-card">
        <div className="reward-asset-label">我的资产</div>
        <div className="reward-asset-value">
          <span className="reward-coin-icon">🪙</span>
          <span className="reward-coin-num">{coins}</span>
          <span className="reward-coin-unit">金币</span>
        </div>
        <div className="reward-asset-hint">完成专注任务即可赚取金币（1 秒 = 1 枚）</div>
      </div>

      {/* 商城 */}
      <div className="reward-section">
        <div className="reward-section-title">商城</div>
        <div className="reward-shop-grid">
          {SHOP_ITEMS.map((item) => {
            const owned = item.type === "unlock" && isOwned(item.id);
            const count = item.type === "consumable" ? getRedeemCount(item.id) : 0;
            const affordable = coins >= item.price;
            const disabled = owned || !affordable;

            let btnLabel = "兑换";
            if (owned) btnLabel = "已拥有 ✓";
            else if (!affordable) btnLabel = "金币不足";

            return (
              <div key={item.id} className="reward-shop-card">
                {count > 0 && (
                  <span className="reward-shop-badge">已兑换 ×{count}</span>
                )}
                <div className="reward-shop-icon">{item.icon}</div>
                <div className="reward-shop-name">{item.name}</div>
                <div className="reward-shop-desc">{item.desc}</div>
                <div className="reward-shop-footer">
                  <span className="reward-shop-price">🪙 {item.price}</span>
                  <button
                    className={`reward-buy-btn ${owned ? "owned" : ""}`}
                    disabled={disabled}
                    onClick={() => {
                      const ok = buyItem(item);
                      if (ok) setToast({ message: `${item.name} 兑换成功！`, icon: item.icon });
                    }}
                  >
                    {btnLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {toast && (
        <div className="toast toast--center visible" role="status" aria-live="polite">
          <span className="toast-text">{toast.icon} {toast.message}</span>
        </div>
      )}
    </div>
  );
}
