import React from 'react';

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WORKDAYS = [1, 2, 3, 4, 5];

export function recurringLabel(days) {
  if (!days?.length) return '';
  if (days.length === 7) return '每天';
  if (days.length === 5 && days.join(',') === '1,2,3,4,5') return '工作日';
  return days.map(d => DAY_NAMES[d]).join('');
}

export default function RecurringDayPicker({ days = [], onChange, onClose }) {
  const toggleDay = (dow) => {
    const newDays = days.includes(dow)
      ? days.filter(d => d !== dow)
      : [...days, dow].sort((a, b) => a - b);
    onChange(newDays.length ? newDays : null);
  };

  const setPreset = (preset) => {
    onChange(preset);
    onClose();
  };

  const cancel = () => {
    onChange(null);
    onClose();
  };

  const isAllDays = days.length === 7;
  const isWorkdays = days.join(',') === '1,2,3,4,5';

  return (
    <div className="recurring-day-picker">
      <button
        type="button"
        className={`day-preset-btn${isAllDays ? ' active' : ''}`}
        onClick={() => setPreset(ALL_DAYS)}
      >
        每天
      </button>
      <button
        type="button"
        className={`day-preset-btn${isWorkdays ? ' active' : ''}`}
        onClick={() => setPreset(WORKDAYS)}
      >
        工作日
      </button>
      <span className="day-picker-sep">|</span>
      {DAY_NAMES.map((name, dow) => (
        <button
          key={dow}
          type="button"
          className={`day-btn${days.includes(dow) ? ' active' : ''}`}
          onClick={() => toggleDay(dow)}
        >
          {name}
        </button>
      ))}
      <button type="button" className="day-cancel-btn" onClick={cancel}>
        取消重复
      </button>
    </div>
  );
}
