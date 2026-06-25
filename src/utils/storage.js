// 版本化的 localStorage 列表存储。
// 读取时兼容三种历史形态：{version,data} 当前格式、裸数组（旧格式）、缺失/损坏（兜底 []）。
// 写入统一为 { version, data }，便于未来 migrate。
export function createVersionedStorage(key, version) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (parsed?.version === version && Array.isArray(parsed.data)) {
          return parsed.data;
        }
        // 旧格式（裸数组）迁移
        if (Array.isArray(parsed)) return parsed;
        return [];
      } catch {
        return [];
      }
    },
    save(data) {
      localStorage.setItem(key, JSON.stringify({ version, data }));
    },
  };
}
