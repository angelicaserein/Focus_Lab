import React, { useMemo } from "react";
import { RotateCcw, ToggleLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useFeatures } from "@/context/FeatureContext";
import { FUNCTION_BRANCHES, TOGGLEABLE_PATHS } from "./functionTreeData";
import "./FunctionTree.css";

// 功能树：一棵「设置」形态的树，每个叶子节点都是一个功能开关。
// 点一下关掉该功能（它会从侧边栏消失、直接访问其路由会被弹回主页），再点一下打开——随时可逆。
// 关掉功能只影响导航可见性与可达性，不删除任何数据。核心功能（主页/设置/功能树）不在此列。

export default function FunctionTreePage() {
  const { t } = useLanguage();
  const { isEnabled, toggle, enableAll } = useFeatures();

  const onCount = useMemo(
    () => TOGGLEABLE_PATHS.filter((p) => isEnabled(p)).length,
    [isEnabled],
  );
  const total = TOGGLEABLE_PATHS.length;
  const allOn = onCount === total;

  return (
    <div className="page-ftree">
      <div className="ft-headline">
        <h1>{t("functiontree.title")}</h1>
        <div className="ft-bar">
          <span className="ft-summary">
            {t("functiontree.summary", { on: onCount, total })}
          </span>
          <button
            type="button"
            className="ft-reset"
            onClick={enableAll}
            disabled={allOn}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t("functiontree.enableAll")}
          </button>
        </div>
      </div>

      <p className="ft-hint">
        <ToggleLeft size={15} aria-hidden="true" className="ft-hint-icon" />
        {t("functiontree.hint")}
      </p>

      <div className="ft-branches">
        {FUNCTION_BRANCHES.map((branch) => {
          const branchOn = branch.features.filter((f) => isEnabled(f.path)).length;
          return (
            <div
              key={branch.id}
              className="ft-branch"
              style={{ "--branch": branch.color }}
            >
              <div className="ft-hub">
                <span className="ft-hub-title">{t(`nav.section.${branch.id}`)}</span>
                <span className="ft-hub-count">
                  {branchOn}/{branch.features.length}
                </span>
              </div>

              <div className="ft-nodes">
                {branch.features.map((f) => {
                  const on = isEnabled(f.path);
                  return (
                    <button
                      key={f.path}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      className={`ft-node${on ? " on" : " off"}`}
                      onClick={() => toggle(f.path)}
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
          );
        })}
      </div>
    </div>
  );
}
