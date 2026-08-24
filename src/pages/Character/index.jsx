import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import useCharacter from "@/hooks/character/useCharacter";
import CharacterSheetModern from "./CharacterSheetModern";
import GameMasterCard from "./GameMasterCard";
import "./Character.css";

export default function CharacterPage() {
  const { t, lang } = useLanguage();
  const char = useCharacter();

  return (
    <div className="page-character">
      <div className="char-headline">
        <h1>{t("character.title")}</h1>
      </div>

      <GameMasterCard char={char} t={t} lang={lang} />

      <CharacterSheetModern char={char} t={t} lang={lang} />
    </div>
  );
}
