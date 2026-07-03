import React, { useEffect, useRef, useState } from "react";
import "./EmojiPicker.css";

// 一组带关键词的常用 emoji，搜索时按关键词 / 字符匹配。
const EMOJIS = [
  { e: "🎁", k: "gift reward 礼物 奖励" },
  { e: "🪙", k: "coin money 金币 钱" },
  { e: "🧋", k: "milk tea 奶茶 饮料" },
  { e: "☕", k: "coffee 咖啡" },
  { e: "🍰", k: "cake dessert 蛋糕 甜点" },
  { e: "🍩", k: "donut 甜甜圈 甜点" },
  { e: "🍫", k: "chocolate 巧克力" },
  { e: "🍦", k: "ice cream 冰淇淋" },
  { e: "🍔", k: "burger food 汉堡 美食" },
  { e: "🍕", k: "pizza 披萨" },
  { e: "🍜", k: "noodle ramen 面 拉面" },
  { e: "🍱", k: "bento food 便当" },
  { e: "🎮", k: "game 游戏" },
  { e: "🕹️", k: "joystick game 游戏" },
  { e: "📱", k: "phone 手机" },
  { e: "💻", k: "laptop computer 电脑" },
  { e: "🎧", k: "music headphone 音乐 耳机" },
  { e: "🎬", k: "movie film 电影" },
  { e: "📺", k: "tv 电视 剧" },
  { e: "📚", k: "book read 书 阅读" },
  { e: "🛍️", k: "shopping 购物" },
  { e: "👕", k: "clothes shirt 衣服" },
  { e: "👟", k: "shoe sneaker 鞋" },
  { e: "💄", k: "makeup 化妆 口红" },
  { e: "🛌", k: "sleep rest 睡觉 休息" },
  { e: "💤", k: "nap sleep 午睡 休息" },
  { e: "🚿", k: "shower bath 洗澡" },
  { e: "🌸", k: "flower pink 花 粉色" },
  { e: "🌙", k: "moon night 月亮 夜晚" },
  { e: "⭐", k: "star 星" },
  { e: "🔥", k: "fire hot 火" },
  { e: "💎", k: "gem diamond 钻石" },
  { e: "🏆", k: "trophy win 奖杯" },
  { e: "🎉", k: "party celebrate 庆祝" },
  { e: "🎯", k: "target goal 目标" },
  { e: "💪", k: "strong muscle 加油" },
  { e: "🧘", k: "yoga meditate 冥想 放松" },
  { e: "🚶", k: "walk 散步" },
  { e: "🏃", k: "run 跑步" },
  { e: "🚲", k: "bike 骑车" },
  { e: "✈️", k: "travel plane 旅行 飞机" },
  { e: "🏖️", k: "beach vacation 海滩 度假" },
  { e: "🌿", k: "plant nature 植物" },
  { e: "🐱", k: "cat 猫" },
  { e: "🐶", k: "dog 狗" },
  { e: "🎵", k: "note music 音乐" },
  { e: "🎨", k: "art paint 画画 艺术" },
  { e: "🍷", k: "wine drink 酒" },
  { e: "🍺", k: "beer 啤酒" },
];

export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  // 点击外部关闭。
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? EMOJIS.filter((it) => it.e === query || it.k.toLowerCase().includes(q))
    : EMOJIS;

  const pick = (e) => {
    onChange(e);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="emoji-picker" ref={rootRef}>
      <button
        type="button"
        className="emoji-picker-trigger"
        aria-label="选择图标"
        onClick={() => setOpen((v) => !v)}
      >
        {value || "🎁"}
      </button>

      {open && (
        <div className="emoji-picker-pop" role="dialog">
          <input
            className="emoji-picker-search"
            autoFocus
            value={query}
            placeholder="搜索 emoji 或直接粘贴"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="emoji-picker-grid">
            {filtered.map((it) => (
              <button
                key={it.e}
                type="button"
                className={`emoji-picker-cell ${value === it.e ? "active" : ""}`}
                onClick={() => pick(it.e)}
              >
                {it.e}
              </button>
            ))}
            {/* 允许直接用搜索框里输入的任意字符（如自定义 emoji）作为图标 */}
            {q && !filtered.some((it) => it.e === query) && query.length <= 2 && (
              <button
                type="button"
                className="emoji-picker-cell"
                onClick={() => pick(query)}
              >
                {query}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
