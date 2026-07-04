import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import useCharacter from "@/hooks/character/useCharacter";
import CharacterSheetModern from "./CharacterSheetModern";
import CharacterSheetPixel from "./CharacterSheetPixel";
import "./Character.css";

// 皮肤切换：同一份角色数据，两种视觉风格，方便对比取舍。
const SKINS = [
  { id: "modern", labelKey: "character.skin.modern" },
  { id: "pixel", labelKey: "character.skin.pixel" },
];

export default function CharacterPage() {
  const { t, lang } = useLanguage();
  const char = useCharacter();
  const [skin, setSkin] = useState("modern");

  return (
    <div className={`page-character skin-${skin}`}>
      <div className="char-headline">
        <h1>{t("character.title")}</h1>
        <div className="char-skin-switch" role="tablist" aria-label={t("character.skin.label")}>
          {SKINS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={skin === s.id}
              className={`char-skin-btn${skin === s.id ? " active" : ""}`}
              onClick={() => setSkin(s.id)}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {skin === "pixel" ? (
        <CharacterSheetPixel char={char} t={t} lang={lang} />
      ) : (
        <CharacterSheetModern char={char} t={t} lang={lang} />
      )}
    </div>
  );
}
