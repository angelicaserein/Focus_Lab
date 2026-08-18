import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, ListTodo, StickyNote, Layers, Timer } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import useOutsideClick from "@/hooks/common/useOutsideClick";
import useGlobalSearch from "@/components/search/useGlobalSearch";
import { splitHighlight } from "@/components/search/searchIndex";
import "./GlobalSearch.css";

// 每个分组的图标与标题。顺序由 searchAll 决定，这里只管怎么显示。
const KIND_META = {
  page:     { Icon: FileText,   titleKey: "search.kind.page" },
  task:     { Icon: ListTodo,   titleKey: "search.kind.task" },
  memo:     { Icon: StickyNote, titleKey: "search.kind.memo" },
  scenario: { Icon: Layers,     titleKey: "search.kind.scenario" },
};

// 标题里命中的那几个字加粗。命中在备注/标签里时 splitHighlight 返回 null，原样显示。
function Highlighted({ text, query }) {
  const parts = splitHighlight(text, query);
  if (!parts) return <>{text}</>;
  const [before, hit, after] = parts;
  return (
    <>
      {before}
      <mark className="gs-hit">{hit}</mark>
      {after}
    </>
  );
}

/**
 * 侧边栏顶部的跨页搜索。一个输入框同时搜「页面」和「内容」——
 * 用户不必先想清楚要找的是页面还是某条任务，输进去两类结果一起出来。
 */
export default function GlobalSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);
  const groups = useGlobalSearch(query);

  const open = query.trim().length > 0;

  // 点面板外面就收起结果（同时清空输入，避免下次点开还留着上次的词）。
  useOutsideClick(boxRef, () => setQuery(""), open);

  const go = (item) => {
    setQuery("");
    navigate(item.to, item.state ? { state: item.state } : undefined);
  };

  return (
    <div className="gs" ref={boxRef}>
      <div className="gs-field">
        <Search className="gs-field-icon" size={15} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          className="gs-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
        />
        {open && (
          <button
            type="button"
            className="gs-clear"
            onClick={() => setQuery("")}
            aria-label={t("search.clear")}
            title={t("search.clear")}
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div className="gs-panel">
          {groups.length === 0 ? (
            <p className="gs-empty">{t("search.empty")}</p>
          ) : (
            groups.map(({ kind, items, total }) => {
              const { Icon, titleKey } = KIND_META[kind];
              return (
                <div key={kind} className="gs-group">
                  <p className="gs-group-title">
                    <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
                    {t(titleKey)}
                    {total > items.length && (
                      <span className="gs-group-more">{t("search.more", { n: total - items.length })}</span>
                    )}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`gs-row${item.done ? " done" : ""}`}
                      onClick={() => go(item)}
                    >
                      <span className="gs-row-title">
                        <Highlighted text={item.title} query={query} />
                      </span>
                      {/* 专注随记标一下出处，跟手记的备忘区分开 */}
                      {item.source === "focus" && (
                        <span className="gs-row-tag">
                          <Timer size={10} strokeWidth={2.5} aria-hidden="true" />
                          {t("search.fromFocus")}
                        </span>
                      )}
                      {item.sub && <span className="gs-row-sub">{item.sub}</span>}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
