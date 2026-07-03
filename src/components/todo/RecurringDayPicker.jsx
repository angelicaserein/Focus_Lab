import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WORKDAYS = [1, 2, 3, 4, 5];

// 需传入 t（useLanguage 的翻译函数）以本地化；语言变化时随之更新。
export function recurringLabel(days, t) {
  if (!days?.length) return '';
  if (days.length === 7) return t('recurring.everyday');
  if (days.length === 5 && days.join(',') === '1,2,3,4,5') return t('recurring.weekdays');
  return days.map(d => t(`day.short.${d}`)).join('');
}

export default function RecurringDayPicker({ days = [], onChange, onClose }) {
  const { t } = useLanguage();
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
        {t('recurring.everyday')}
      </button>
      <button
        type="button"
        className={`day-preset-btn${isWorkdays ? ' active' : ''}`}
        onClick={() => setPreset(WORKDAYS)}
      >
        {t('recurring.weekdays')}
      </button>
      <span className="day-picker-sep">|</span>
      {ALL_DAYS.map((dow) => (
        <button
          key={dow}
          type="button"
          className={`day-btn${days.includes(dow) ? ' active' : ''}`}
          onClick={() => toggleDay(dow)}
        >
          {t(`day.short.${dow}`)}
        </button>
      ))}
      <button type="button" className="day-cancel-btn" onClick={cancel}>
        {t('recurring.cancel')}
      </button>
    </div>
  );
}
