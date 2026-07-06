import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import useCharacter from "@/hooks/character/useCharacter";
import useTonePack from "@/hooks/character/useTonePack";
import { makeToneT } from "@/utils/ai/tonePack";
import CharacterSheetModern from "./CharacterSheetModern";
import CharacterSheetPixel from "./CharacterSheetPixel";
import GameMasterCard from "./GameMasterCard";
import "./Character.css";

// 皮肤切换：同一份角色数据，两种视觉风格，方便对比取舍。
const SKINS = [
  { id: "modern", labelKey: "character.skin.modern" },
  { id: "pixel", labelKey: "character.skin.pixel" },
];

export default function CharacterPage() {
  const { t, lang } = useLanguage();
  const { tonePack } = useTonePack();
  // 语气感知的翻译函数：命中语气包覆盖就用自定义文案，否则回退默认。
  const tt = makeToneT(t, tonePack, lang);
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

      <GameMasterCard char={char} t={tt} lang={lang} />

      {skin === "pixel" ? (
        <CharacterSheetPixel char={char} t={tt} lang={lang} />
      ) : (
        <CharacterSheetModern char={char} t={tt} lang={lang} />
      )}
    </div>
  );
}
