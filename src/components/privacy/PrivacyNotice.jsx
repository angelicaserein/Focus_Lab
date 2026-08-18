import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Laptop, Sparkles, Eye } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import "./PrivacyNotice.css";

// 首启告知卡片。三条「会发生什么」，一个按钮，读完即走。
//
// 刻意不是同意书：没有勾选框、没有「拒绝」。这里没有需要用户交换的东西——
// 数据本来就不出这台设备，AI 那条也只在他主动点的时候才发生，
// 摆一道同意门只会让人在第一屏就退出去（而 ADHD 用户尤其如此）。
// 真要跑正式研究招被试时，那是另一套可留痕的知情同意流程，不要往这张卡上加。
//
// 三条的写法统一是「粗体一句说完 + 小字补一句」：粗体那行单独读就已经成立，
// 小字是给愿意多看一眼的人。别把结论藏进小字里。
const ITEMS = [
  { id: "local", Icon: Laptop },
  { id: "ai", Icon: Sparkles },
  { id: "watch", Icon: Eye },
];

export default function PrivacyNotice({ onAck }) {
  const { t } = useLanguage();
  const cardRef = useRef(null);

  // 打开就把焦点放到唯一那个按钮上：键盘用户一个回车就能过。
  useEffect(() => {
    cardRef.current?.querySelector(".pn-ack")?.focus();
  }, []);

  // 焦点困在卡片里。注意这里没有 Esc 关闭——Esc 会让人以为自己「取消」了什么，
  // 而这张卡没有可取消的东西；唯一的出口就是那个按钮。
  const trapTab = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    cardRef.current?.querySelector(".pn-ack")?.focus();
  };

  return createPortal(
    <div className="pn-overlay" role="presentation">
      <div
        ref={cardRef}
        className="pn-card"
        onKeyDown={trapTab}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pn-title"
      >
        <h2 className="pn-title" id="pn-title">{t("privacy.title")}</h2>

        <ul className="pn-items">
          {ITEMS.map(({ id, Icon }) => (
            <li className="pn-item" key={id}>
              <span className="pn-item-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className="pn-item-text">
                <p className="pn-item-title">{t(`privacy.${id}.title`)}</p>
                <p className="pn-item-body">{t(`privacy.${id}.body`)}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="pn-footer">{t("privacy.footer")}</p>

        <button type="button" className="pn-ack" onClick={onAck}>
          {t("privacy.ack")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
