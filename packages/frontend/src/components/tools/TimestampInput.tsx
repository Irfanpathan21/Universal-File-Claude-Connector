/**
 * TimestampInput — HH:MM:SS segmented input with quick preset buttons
 * Used by: trim_audio, trim_video, generate_video_thumbnail
 */
import React, { useState } from 'react';
import { Clock, Play, FastForward } from 'lucide-react';

interface TimestampInputProps {
  startValue: string;
  endValue?: string;
  onStartChange: (ts: string) => void;
  onEndChange?: (ts: string) => void;
  showEnd?: boolean;
  accentColor?: string;
}

const PRESETS = [
  { label: 'Start', value: '00:00:00' },
  { label: '0:10', value: '00:00:10' },
  { label: '0:30', value: '00:00:30' },
  { label: '1:00', value: '00:01:00' },
  { label: '2:00', value: '00:02:00' },
  { label: '5:00', value: '00:05:00' },
];

function TimestampField({ value, onChange, label, accentColor }: { value: string; onChange: (v: string) => void; label: string; accentColor: string }) {
  const parts = (value || '00:00:00').split(':');
  const hh = parts[0] || '00';
  const mm = parts[1] || '00';
  const ss = parts[2] || '00';

  const update = (idx: number, newVal: string) => {
    const p = [hh, mm, ss];
    const num = Math.max(0, Math.min(idx === 0 ? 99 : 59, parseInt(newVal) || 0));
    p[idx] = String(num).padStart(2, '0');
    onChange(p.join(':'));
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-[#505f76] dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-1 bg-[#f3f3fe] dark:bg-slate-800 rounded-lg border border-[#c3c6d7] dark:border-slate-700 p-1.5">
        <input
          type="number"
          min="0"
          max="99"
          value={hh}
          onChange={(e) => update(0, e.target.value)}
          className="w-10 text-center text-sm font-bold bg-white dark:bg-slate-900 rounded border border-[#c3c6d7]/50 dark:border-slate-600 py-1.5 text-[#191b23] dark:text-white"
        />
        <span className="text-sm font-bold text-[#737686]">:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={mm}
          onChange={(e) => update(1, e.target.value)}
          className="w-10 text-center text-sm font-bold bg-white dark:bg-slate-900 rounded border border-[#c3c6d7]/50 dark:border-slate-600 py-1.5 text-[#191b23] dark:text-white"
        />
        <span className="text-sm font-bold text-[#737686]">:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={ss}
          onChange={(e) => update(2, e.target.value)}
          className="w-10 text-center text-sm font-bold bg-white dark:bg-slate-900 rounded border border-[#c3c6d7]/50 dark:border-slate-600 py-1.5 text-[#191b23] dark:text-white"
        />
      </div>
    </div>
  );
}

export function TimestampInput({ startValue, endValue, onStartChange, onEndChange, showEnd = true, accentColor = '#805AD5' }: TimestampInputProps) {
  return (
    <div className="space-y-4">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
        <Clock size={14} style={{ color: accentColor }} /> Timestamp
      </label>

      <div className={`grid gap-4 ${showEnd ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <TimestampField value={startValue} onChange={onStartChange} label="Start Time" accentColor={accentColor} />
        {showEnd && onEndChange && (
          <TimestampField value={endValue || '00:00:30'} onChange={onEndChange} label="End Time" accentColor={accentColor} />
        )}
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onStartChange(p.value)}
            className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#ededf9] dark:bg-slate-800 text-[#505f76] dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer border border-[#c3c6d7]/40 dark:border-slate-700"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
