import React, { useMemo } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFeatures } from "@/context/FeatureContext";
import { DEPRECATED_FEATURES, DEPRECATED_PATHS, deprecatedKey } from "./deprecatedData";
import "@/pages/FunctionTree/FunctionTree.css";

// 废弃页面：不再进主线、但也没被删掉的旧功能，都收在这里。
// 交互与功能树完全一致（点一下开、再点一下关，不删任何数据），只是默认全部关闭——
// 打开一个，它就回到侧边栏、路由也放行；关掉，它又缩回这一页里。
// 复用功能树的 ft-* 样式：两页是同一种「一列开关」的东西，没必要各写一套 CSS。

export default function DeprecatedPage() {
  const { t } = useLanguage();
  const { isEnabled, toggle, disableAllDeprecated } = useFeatures();

  const onCount = useMemo(
    () => DEPRECATED_PATHS.filter((p) => isEnabled(p)).length,
    [isEnabled],
  );
  const total = DEPRECATED_PATHS.length;

  return (
    <div className="page-ftree">
      <div className="ft-headline">
        <h1>{t("deprecated.title")}</h1>
        <div className="ft-bar">
          <span className="ft-summary">
            {t("deprecated.summary", { on: onCount, total })}
          </span>
          <button
            type="button"
            className="ft-reset"
            onClick={disableAllDeprecated}
            disabled={onCount === 0}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t("deprecated.disableAll")}
          </button>
        </div>
      </div>

      <p className="ft-hint">
        <Archive size={15} aria-hidden="true" className="ft-hint-icon" />
        {t("deprecated.hint")}
      </p>

      <div className="ft-branches">
        {/* 只有一条分支，限个宽度免得开关被拉成整屏那么长 */}
        <div className="ft-branch" style={{ "--branch": "#94a3b8", maxWidth: 420 }}>
          <div className="ft-hub">
            <span className="ft-hub-title">{t("deprecated.shelf")}</span>
            <span className="ft-hub-count">
              {onCount}/{total}
            </span>
          </div>

          <div className="ft-nodes">
            {DEPRECATED_FEATURES.map((f) => {
              const key = deprecatedKey(f);
              const on = isEnabled(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={`ft-node${on ? " on" : " off"}`}
                  onClick={() => toggle(key)}
                  aria-label={`${t(f.labelKey)} — ${t(on ? "functiontree.on" : "functiontree.off")}`}
                >
                  <span className="ft-node-icon" aria-hidden="true">{f.icon}</span>
                  <span className="ft-node-label">{t(f.labelKey)}</span>
                  <span className="ft-switch" aria-hidden="true">
                    <span className="ft-switch-knob" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
