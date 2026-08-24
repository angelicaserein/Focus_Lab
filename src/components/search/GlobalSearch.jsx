import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, FileText, ListTodo, StickyNote, Layers, Timer, Zap } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import useOutsideClick from "@/hooks/common/useOutsideClick";
import useGlobalSearch from "@/components/search/useGlobalSearch";
import { usePaletteHotkey, useOpenPalette } from "@/components/search/commandPalette";
import { splitHighlight } from "@/components/search/searchIndex";
import "./GlobalSearch.css";

// 每个分组的图标与标题。顺序由 searchAll 决定，这里只管怎么显示。
const KIND_META = {
  action:   { Icon: Zap,        titleKey: "search.kind.action" },
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
 * 侧边栏顶部的跨页搜索 / 命令面板。一个输入框同时搜「页面」和「内容」——
 * 用户不必先想清楚要找的是页面还是某条任务，输进去两类结果一起出来；
 * 再加上一组「动作」，高频操作（开专注 / 新建任务 / 记一条）一步到位。
 *
 * 全程可以不离开键盘：Ctrl/⌘+K 聚焦（侧栏折叠着也会被唤出来，见 commandPalette），
 * ↑↓ 选中、回车打开、Esc 收起。
 */
export default function GlobalSearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // 键盘选中项在「拍平后的结果列表」里的下标；-1 = 还没用键盘选过
  const [cursor, setCursor] = useState(-1);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const groups = useGlobalSearch(query);

  const open = query.trim().length > 0;

  // 分组只是显示用的分栏，键盘上下走的是拍平后的一条线。
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // 换了词就把选中位置退回起点，免得停在一条已经不在列表里的结果上
  useEffect(() => setCursor(-1), [query]);

  // Ctrl/⌘+K：聚焦并选中已有的词（接着改比先清空再输快）
  usePaletteHotkey();
  useOpenPalette(() => {
    const el = inputRef.current;
    el?.focus();
    el?.select();
  });

  // 点面板外面就收起结果（同时清空输入，避免下次点开还留着上次的词）。
  useOutsideClick(boxRef, () => setQuery(""), open);

  const go = (item) => {
    setQuery("");
    setCursor(-1);
    // 动作项可以是「就地做一件事」（如导出备份），没有 to 就不导航
    if (item.run) {
      item.run();
      return;
    }
    navigate(item.to, item.state ? { state: item.state } : undefined);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }
    if (!open || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      // 没用键盘选过就默认走第一条：输完直接回车是最常见的用法
      e.preventDefault();
      go(flat[cursor === -1 ? 0 : cursor]);
    }
  };

  // 选中项滚进视野（用键盘一路往下走时，浮层要跟着滚）
  const activeId = cursor >= 0 && flat[cursor] ? `gs-row-${flat[cursor].kind}-${cursor}` : undefined;
  useEffect(() => {
    if (!activeId) return;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  // 拍平下标要和渲染顺序对得上：分组是按顺序铺开的，累加即可。
  let flatIndex = -1;

  return (
    <div className="gs" ref={boxRef}>
      <div className="gs-field">
        <Search className="gs-field-icon" size={15} strokeWidth={2} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="gs-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          role="combobox"
          aria-expanded={open}
          aria-controls="gs-results"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
        />
        {open ? (
          <button
            type="button"
            className="gs-clear"
            onClick={() => setQuery("")}
            aria-label={t("search.clear")}
            title={t("search.clear")}
          >
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        ) : (
          // 快捷键光靠碰巧撞上是撞不出来的，直接写在框里
          <kbd className="gs-kbd" aria-hidden="true">{t("search.hint.hotkey")}</kbd>
        )}
      </div>

      {open && (
        <div className="gs-panel" id="gs-results" role="listbox" aria-label={t("search.placeholder")}>
          {groups.length === 0 ? (
            <p className="gs-empty">{t("search.empty")}</p>
          ) : (
            <>
              {groups.map(({ kind, items, total }) => {
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
                    {items.map((item) => {
                      flatIndex += 1;
                      const rowId = `gs-row-${kind}-${flatIndex}`;
                      const active = flatIndex === cursor;
                      return (
                        <button
                          key={item.id}
                          id={rowId}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`gs-row${item.done ? " done" : ""}${active ? " active" : ""}`}
                          onClick={() => go(item)}
                          onMouseEnter={() => setCursor(flatIndex)}
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
                      );
                    })}
                  </div>
                );
              })}
              <p className="gs-keyhint">{t("search.hint.keys")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
