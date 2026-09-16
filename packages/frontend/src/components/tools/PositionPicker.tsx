/**
 * PositionPicker — 3×3 visual anchor grid for placement selection
 * Used by: add_watermark, watermark_image, add_page_numbers
 */
import React from 'react';

interface PositionPickerProps {
  value: string;
  onChange: (position: string) => void;
  accentColor?: string;
}

const POSITIONS = [
  { id: 'top-left', label: 'Top Left', aliases: ['top-left', 'top_left', 'northwest'] },
  { id: 'top', label: 'Top', aliases: ['top', 'top-center', 'top_center', 'north'] },
  { id: 'top-right', label: 'Top Right', aliases: ['top-right', 'top_right', 'northeast'] },
  { id: 'left', label: 'Left', aliases: ['left', 'center-left', 'center_left', 'west'] },
  { id: 'center', label: 'Center', aliases: ['center', 'middle'] },
  { id: 'right', label: 'Right', aliases: ['right', 'center-right', 'center_right', 'east'] },
  { id: 'bottom-left', label: 'Bottom Left', aliases: ['bottom-left', 'bottom_left', 'southwest'] },
  { id: 'bottom', label: 'Bottom', aliases: ['bottom', 'bottom-center', 'bottom_center', 'south'] },
  { id: 'bottom-right', label: 'Bottom Right', aliases: ['bottom-right', 'bottom_right', 'southeast'] },
];

export function PositionPicker({ value, onChange, accentColor = '#004ac6' }: PositionPickerProps) {
  const normVal = (value || 'center').toLowerCase().replace('_', '-');

  const isPosActive = (pos: typeof POSITIONS[0]) => {
    return pos.aliases.includes(normVal) || pos.id === normVal;
  };

  const activeLabel = POSITIONS.find(isPosActive)?.label || 'Center';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          Placement Position
        </label>
        <span className="text-xs font-extrabold px-2 py-0.5 rounded-md text-white shadow-xs" style={{ backgroundColor: accentColor }}>
          {activeLabel}
        </span>
      </div>

      {/* 3×3 Visual Grid */}
      <div className="relative w-full max-w-[210px] mx-auto">
        <div className="w-full aspect-[4/3] rounded-xl border-2 border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 p-2.5 shadow-xs">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full">
            {POSITIONS.map((pos) => {
              const isActive = isPosActive(pos);
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onChange(pos.id)}
                  title={pos.label}
                  className={`rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'shadow-md scale-105 ring-2 ring-white/50'
                      : 'bg-white/70 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-600 border border-[#c3c6d7]/50 dark:border-slate-600/50'
                  }`}
                  style={isActive ? { backgroundColor: accentColor } : {}}
                >
                  <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-[#434655] dark:text-slate-300'}`}>
                    {pos.label.replace('Center', 'Mid')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Quick Locations</div>
        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((item) => {
            const isActive = isPosActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                  isActive
                    ? 'text-white shadow-xs border-transparent'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:border-[#004ac6]'
                }`}
                style={isActive ? { backgroundColor: accentColor } : {}}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
