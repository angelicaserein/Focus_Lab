import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ListTodo,
  CalendarClock,
  StickyNote,
  LayoutGrid,
  GanttChartSquare,
  CalendarRange,
  Timer,
  History,
  BarChart3,
  PieChart,
  Gift,
  Swords,
  Network,
  Sparkles,
  Map,
  ListTree,
  Layers,
  Settings,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import "./Tutorial.css";

// 六个阶段就是软件的工作流（SOP）：捕捉 → 理清 → 专注 → 复盘 → 成长 → 定制。
// 每个阶段挂几个「去这里」的入口，label 直接复用 nav.* 文案，不另造一套。
const STAGES = [
  {
    id: "plan",
    Icon: ListTodo,
    links: [
      { to: "/tasks", labelKey: "nav.tasks", Icon: ListTodo },
      { to: "/ddl", labelKey: "nav.ddl", Icon: CalendarClock },
      { to: "/memo", labelKey: "nav.memo", Icon: StickyNote },
    ],
  },
  {
    id: "organize",
    Icon: LayoutGrid,
    links: [
      { to: "/tasks", labelKey: "nav.tasks", Icon: LayoutGrid },
      { to: "/gantt", labelKey: "nav.gantt", Icon: GanttChartSquare },
      { to: "/calendar", labelKey: "nav.calendar", Icon: CalendarRange },
    ],
  },
  {
    id: "focus",
    Icon: Timer,
    links: [{ to: "/focus", labelKey: "nav.focus", Icon: Timer }],
  },
  {
    id: "reflect",
    Icon: BarChart3,
    links: [
      { to: "/history", labelKey: "nav.history", Icon: History },
      { to: "/analytics", labelKey: "nav.analytics", Icon: BarChart3 },
      { to: "/scenario-stats", labelKey: "nav.scenarioStats", Icon: PieChart },
    ],
  },
  {
    id: "grow",
    Icon: Sparkles,
    links: [
      { to: "/reward", labelKey: "nav.reward", Icon: Gift },
      { to: "/character", labelKey: "nav.character", Icon: Swords },
      { to: "/skilltree", labelKey: "nav.skilltree", Icon: Network },
      { to: "/wish", labelKey: "nav.wish", Icon: Sparkles },
      { to: "/world", labelKey: "nav.world", Icon: Map },
    ],
  },
  {
    id: "customize",
    Icon: ListTree,
    links: [
      { to: "/functiontree", labelKey: "nav.functiontree", Icon: ListTree },
      { to: "/scenario", labelKey: "nav.scenario", Icon: Layers },
      { to: "/settings", labelKey: "nav.settings", Icon: Settings },
    ],
  },
];

export default function Tutorial() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <main className="page page-tutorial">
      <header className="tutorial-header">
        <h1 className="tutorial-title">{t("tutorial.title")}</h1>
        <p className="tutorial-subtitle">{t("tutorial.subtitle")}</p>
        <p className="tutorial-intro">{t("tutorial.intro")}</p>
      </header>

      <ol className="tutorial-flow">
        {STAGES.map((stage, i) => {
          const { Icon } = stage;
          return (
            <li key={stage.id} className="tutorial-stage">
              <div className="tutorial-stage-rail" aria-hidden="true">
                <span className="tutorial-stage-num">
                  <Icon size={20} strokeWidth={2} />
                </span>
              </div>
              <div className="tutorial-stage-body">
                <p className="tutorial-stage-step">
                  {t("tutorial.stepLabel", { n: i + 1 })}
                </p>
                <h2 className="tutorial-stage-title">
                  {t(`tutorial.stage.${stage.id}.title`)}
                </h2>
                <p className="tutorial-stage-desc">
                  {t(`tutorial.stage.${stage.id}.desc`)}
                </p>
                <div className="tutorial-links">
                  {stage.links.map(({ to, labelKey, Icon: LinkIcon }) => (
                    <button
                      key={`${stage.id}-${to}`}
                      type="button"
                      className="tutorial-link"
                      onClick={() => navigate(to)}
                    >
                      <LinkIcon size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{t(labelKey)}</span>
                      <ArrowRight
                        className="tutorial-link-arrow"
                        size={14}
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <aside className="tutorial-tip">
        <Lightbulb size={20} strokeWidth={2} aria-hidden="true" />
        <div>
          <p className="tutorial-tip-title">{t("tutorial.tip.title")}</p>
          <p className="tutorial-tip-body">{t("tutorial.tip.body")}</p>
        </div>
      </aside>
    </main>
  );
}
