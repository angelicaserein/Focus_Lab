// 所有日期均以英国时间（Europe/London，冬GMT+0/夏BST+1）为准

function ukMidnight(dateStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  // 用正午 UTC 探测伦敦在该日期的偏移量（避开夏令时切换时段）
  const probe = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(probe);
  const londonHour = parseInt(parts.find((p) => p.type === "hour").value);
  // londonHour - 12 = 偏移小时数（GMT=0, BST=1）
  const offsetHours = londonHour - 12;
  return Date.UTC(y, mo - 1, d, -offsetHours, 0, 0);
}

export function todayDateStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export function buildEmptyRecord(dateStr) {
  return {
    id: crypto.randomUUID(),
    date: dateStr,
    savedAt: null,
    autoData: {
      maxFocusDurationSecs: 0,
      totalFocusDurationSecs: 0,
      realtimeDistractionCount: 0,
      taskCompletedCount: 0,
    },
    scales: {
      focusLevel: null,
      startDifficulty: null,
      moodState: null,
    },
    retrospective: {
      distractionCount: "",
      procrastinationMins: "",
    },
    experience: "",
  };
}

export function computeAutoData(focusRecords, distractions, dateStr) {
  const start = ukMidnight(dateStr);
  const end = start + 86400000;

  const dayRecords = focusRecords.filter(
    (r) => r.startedAt >= start && r.startedAt < end
  );
  const dayDistractions = distractions.filter(
    (d) => d.ts >= start && d.ts < end
  );

  const maxFocusDurationSecs =
    dayRecords.length > 0 ? Math.max(...dayRecords.map((r) => r.durationSecs)) : 0;
  const totalFocusDurationSecs = dayRecords.reduce(
    (sum, r) => sum + r.durationSecs,
    0
  );
  const realtimeDistractionCount = dayDistractions.length;
  const taskCompletedCount = dayRecords.filter(
    (r) => r.outcome === "completed"
  ).length;

  return {
    maxFocusDurationSecs,
    totalFocusDurationSecs,
    realtimeDistractionCount,
    taskCompletedCount,
  };
}

