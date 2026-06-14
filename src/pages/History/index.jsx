import React, { useMemo, useState, useRef, useEffect } from "react";
import { useFocus } from "../../context/FocusContext";
import { computeFocusStats } from "../../utils/focusRecords";
import StatsOverview from "./StatsOverview";
import RecordList from "./RecordList";
import "./History.css";

export default function HistoryPage() {
  const { focusRecords, clearFocusRecords } = useFocus();
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const stats = useMemo(() => computeFocusStats(focusRecords), [focusRecords]);

  const handleClear = () => {
    if (confirmClear) {
      clearFocusRecords();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="page-history">
      <div className="history-headline">
        <h1>历史</h1>
      </div>

      <StatsOverview stats={stats} />

      <RecordList
        records={focusRecords}
        confirmClear={confirmClear}
        onClear={handleClear}
      />
    </div>
  );
}
