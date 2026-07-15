import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import useCharacter from "@/hooks/character/useCharacter";
import useTonePack from "@/hooks/character/useTonePack";
import { makeToneT } from "@/utils/ai/tonePack";
import CharacterSheetModern from "./CharacterSheetModern";
import GameMasterCard from "./GameMasterCard";
import "./Character.css";

export default function CharacterPage() {
  const { t, lang } = useLanguage();
  const { tonePack } = useTonePack();
  // 语气感知的翻译函数：命中语气包覆盖就用自定义文案，否则回退默认。
  const tt = makeToneT(t, tonePack, lang);
  const char = useCharacter();

  return (
    <div className="page-character">
      <div className="char-headline">
        <h1>{t("character.title")}</h1>
      </div>

      <GameMasterCard char={char} t={tt} lang={lang} />

      <CharacterSheetModern char={char} t={tt} lang={lang} />
    </div>
  );
}
