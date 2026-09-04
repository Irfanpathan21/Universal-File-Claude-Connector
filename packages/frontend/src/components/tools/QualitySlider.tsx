/**
 * QualitySlider — Gradient quality slider with preset chips
 * Used by: compress_image, convert_image
 */
import React from 'react';

interface QualitySliderProps {
  value: string;
  onChange: (quality: string) => void;
  min?: number;
  max?: number;
  accentColor?: string;
  label?: string;
}

const PRESETS = [
  { value: '25', label: 'Low' },
  { value: '50', label: 'Medium' },
  { value: '75', label: 'Good' },
  { value: '100', label: 'Max' },
];

export function QualitySlider({ value, onChange, min = 1, max = 100, accentColor = '#00A3C4', label = 'Quality' }: QualitySliderProps) {
  const numVal = parseInt(value) || 80;
  const pct = ((numVal - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          {label}
        </label>
        <span className="text-sm font-black" style={{ color: accentColor }}>{numVal}%</span>
      </div>

      {/* Quick preset chips */}
      <div className="flex items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              value === p.value
                ? 'text-white shadow-sm'
                : 'bg-[#ededf9] dark:bg-slate-800 text-[#505f76] dark:text-slate-400 hover:bg-slate-200'
            }`}
            style={value === p.value ? { backgroundColor: accentColor } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={numVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            accentColor,
            background: `linear-gradient(to right, #ef4444 0%, #f59e0b 30%, #22c55e 70%, #22c55e ${pct}%, #e1e2ed ${pct}%, #e1e2ed 100%)`,
          }}
        />
        <div className="flex justify-between text-[9px] text-[#737686] mt-1">
          <span>Smaller file</span>
          <span>Better quality</span>
        </div>
      </div>
    </div>
  );
}
