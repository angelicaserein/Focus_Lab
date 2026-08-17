import React, { useContext, useMemo, useCallback } from "react";
import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { TRANSLATIONS, DEFAULT_LANG } from "@/i18n/translations";

// 应用语言：localStorage 持久化，提供 t(key, vars) 翻译函数。
// 缺失的 key 回退到默认语言（en），再回退到 key 本身，便于尚未翻译的页面保持可用。
const LanguageContext = React.createContext(null);

// 把 "{name}" 占位符替换为 vars 中的值
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// 开发期提示：key 查不到时会回退成 key 本身，页面上就是一串 "focus.xxx"，
// 很容易在自测时被当成设计的一部分放过去。这里每个 key 只喊一次，不刷屏。
const warned = new Set();
function warnMissing(key, lang) {
  if (!import.meta.env.DEV || warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] 缺少文案 "${key}"（lang=${lang}），已回退成 key 本身`);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useLocalStorage(STORAGE_KEYS.PREF_LANG, DEFAULT_LANG);

  const t = useCallback(
    (key, vars) => {
      const dict = TRANSLATIONS[lang] ?? TRANSLATIONS[DEFAULT_LANG];
      const raw = dict[key] ?? TRANSLATIONS[DEFAULT_LANG][key];
      if (raw == null) {
        warnMissing(key, lang);
        return key;
      }
      return interpolate(raw, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
