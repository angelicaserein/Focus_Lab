import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { DEFAULT_PROJECTS, makeEmptyProject, newId } from "./ganttData";
import { UNITS, todayISO, addUnits, parseISO } from "./ganttDate";

// 甘特图 maker 的数据层：多项目存 localStorage，活动项目 id 单独存。
// 所有写入都做基本清洗（日期合法、start≤end、laneId 合法、标题非空）。

function cleanDate(iso, fallback) {
  return parseISO(iso) ? iso : fallback;
}

// 把一条待写入的任务规整成合法结构；base 为编辑时的原任务。返回 null 表示无效。
function sanitizeTask(patch, laneIds, defaultLane, base = {}) {
  const merged = { ...base, ...patch };
  const title = (merged.title ?? "").trim();
  if (!title) return null;
  let start = cleanDate(merged.start, todayISO());
  let end = cleanDate(merged.end, start);
  if (parseISO(end) < parseISO(start)) [start, end] = [end, start];
  const laneId = laneIds.includes(merged.laneId) ? merged.laneId : defaultLane;
  return { laneId, title, tag: (merged.tag ?? "").trim(), start, end };
}

export default function useGanttProjects() {
  const [projects, setProjects] = useLocalStorage(STORAGE_KEYS.GANTT_PROJECTS, DEFAULT_PROJECTS);
  const [activeId, setActiveId] = useLocalStorage(
    STORAGE_KEYS.GANTT_ACTIVE_PROJECT,
    DEFAULT_PROJECTS[0]?.id ?? null,
  );

  const active = projects.find((p) => p.id === activeId) ?? projects[0] ?? null;

  // 对活动项目做一次 patch（传入更新函数，返回新的 project）。
  const patchActive = (fn) => {
    if (!active) return;
    setProjects((prev) => prev.map((p) => (p.id === active.id ? fn(p) : p)));
  };

  // ── 项目级 ──
  const addProject = (name) => {
    const project = makeEmptyProject(name, todayISO());
    setProjects((prev) => [...prev, project]);
    setActiveId(project.id);
    return project;
  };

  const updateProject = (id, patch) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        next.name = (next.name ?? "").trim() || p.name;
        if (!UNITS.includes(next.unit)) next.unit = p.unit;
        next.startDate = cleanDate(next.startDate, p.startDate);
        next.endDate = cleanDate(next.endDate, p.endDate);
        if (parseISO(next.endDate) < parseISO(next.startDate)) {
          next.endDate = addUnits(next.startDate, 1, next.unit);
        }
        return next;
      }),
    );
  };

  const removeProject = (id) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  // ── 泳道级（作用于活动项目）──
  const addLane = (label) =>
    patchActive((p) => ({
      ...p,
      lanes: [...p.lanes, { id: newId(), label: (label ?? "").trim() || `Group ${p.lanes.length + 1}` }],
    }));

  const renameLane = (laneId, label) =>
    patchActive((p) => ({
      ...p,
      lanes: p.lanes.map((l) => (l.id === laneId ? { ...l, label: label.trim() || l.label } : l)),
    }));

  // 删除泳道：其任务改挂到第一条剩余泳道；不允许删到一条不剩。
  const removeLane = (laneId) =>
    patchActive((p) => {
      if (p.lanes.length <= 1) return p;
      const rest = p.lanes.filter((l) => l.id !== laneId);
      const fallback = rest[0].id;
      return {
        ...p,
        lanes: rest,
        tasks: p.tasks.map((t) => (t.laneId === laneId ? { ...t, laneId: fallback } : t)),
      };
    });

  const moveLane = (laneId, dir) =>
    patchActive((p) => {
      const i = p.lanes.findIndex((l) => l.id === laneId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.lanes.length) return p;
      const lanes = [...p.lanes];
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
      return { ...p, lanes };
    });

  // ── 任务级（作用于活动项目）──
  const addTask = (patch) =>
    patchActive((p) => {
      const clean = sanitizeTask(patch, p.lanes.map((l) => l.id), p.lanes[0]?.id);
      if (!clean) return p;
      return { ...p, tasks: [...p.tasks, { id: newId(), ...clean }] };
    });

  const updateTask = (taskId, patch) =>
    patchActive((p) => ({
      ...p,
      tasks: p.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const clean = sanitizeTask(patch, p.lanes.map((l) => l.id), p.lanes[0]?.id, t);
        return clean ? { ...t, ...clean } : t;
      }),
    }));

  const removeTask = (taskId) =>
    patchActive((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }));

  return {
    projects,
    active,
    setActiveId,
    addProject,
    updateProject,
    removeProject,
    addLane,
    renameLane,
    removeLane,
    moveLane,
    addTask,
    updateTask,
    removeTask,
  };
}
