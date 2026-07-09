import useLocalStorage from "@/hooks/common/useLocalStorage";
import { STORAGE_KEYS } from "@/utils/storage/storageKeys";
import { DEFAULT_TASKS, TOTAL_WEEKS, LANES } from "./ganttData";

// 甘特图任务的数据层：扁平任务列表存 localStorage，首次为空时以 DEFAULT_TASKS 播种。
// 增改删都做基本的字段清洗（周次夹到 1..TOTAL_WEEKS、start<=end、lane 合法、标题非空）。
const LANE_IDS = new Set(LANES.map((l) => l.id));

function clampWeek(n) {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return 1;
  return Math.min(TOTAL_WEEKS, Math.max(1, v));
}

// 把一条待写入的任务规整成合法结构。返回 null 表示无效（标题为空）。
function sanitize(patch, base = {}) {
  const merged = { ...base, ...patch };
  const title = (merged.title ?? "").trim();
  if (!title) return null;
  let start = clampWeek(merged.start ?? 1);
  let end = clampWeek(merged.end ?? start);
  if (end < start) [start, end] = [end, start];
  const lane = LANE_IDS.has(merged.lane) ? merged.lane : LANES[0].id;
  return { lane, start, end, title, tag: (merged.tag ?? "").trim() };
}

export default function useGanttTasks() {
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.GANTT_TASKS, DEFAULT_TASKS);

  const addTask = (patch) => {
    const clean = sanitize(patch);
    if (!clean) return;
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), ...clean }]);
  };

  const updateTask = (id, patch) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const clean = sanitize(patch, t);
        return clean ? { ...t, ...clean } : t;
      }),
    );
  };

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const resetTasks = () => setTasks(DEFAULT_TASKS);

  return { tasks, addTask, updateTask, removeTask, resetTasks };
}
