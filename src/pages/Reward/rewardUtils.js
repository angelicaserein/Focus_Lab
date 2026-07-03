// 由商品与奖励状态推导出「购买态」，供各类商品卡复用。
//   owned      — unlock 类且已拥有
//   count      — consumable 类的已兑换次数
//   affordable — 金币是否足够
//   disabled   — 按钮是否禁用（已拥有或买不起）
export function getItemState(item, { coins, isOwned, getRedeemCount }) {
  const owned = item.type === "unlock" && isOwned(item.id);
  const count = item.type === "consumable" ? getRedeemCount(item.id) : 0;
  const affordable = coins >= item.price;
  return { owned, count, affordable, disabled: owned || !affordable };
}
