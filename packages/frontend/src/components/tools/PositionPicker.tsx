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
  { id: 'top-left', row: 0, col: 0, label: 'Top Left' },
  { id: 'top-center', row: 0, col: 1, label: 'Top Center' },
  { id: 'top-right', row: 0, col: 2, label: 'Top Right' },
  { id: 'center-left', row: 1, col: 0, label: 'Center Left' },
  { id: 'center', row: 1, col: 1, label: 'Center' },
  { id: 'center-right', row: 1, col: 2, label: 'Center Right' },
  { id: 'bottom-left', row: 2, col: 0, label: 'Bottom Left' },
  { id: 'bottom-center', row: 2, col: 1, label: 'Bottom Center' },
  { id: 'bottom-right', row: 2, col: 2, label: 'Bottom Right' },
];

export function PositionPicker({ value, onChange, accentColor = '#004ac6' }: PositionPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Placement Position
      </label>

      {/* 3×3 Visual Grid */}
      <div className="relative w-full max-w-[200px] mx-auto">
        {/* Page outline */}
        <div className="w-full aspect-[3/4] rounded-lg border-2 border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 p-3">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-full h-full">
            {POSITIONS.map((pos) => {
              const isActive = value === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onChange(pos.id)}
                  title={pos.label}
                  className={`rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'shadow-md scale-110'
                      : 'bg-white/60 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-600 border border-[#c3c6d7]/40 dark:border-slate-600/40'
                  }`}
                  style={isActive ? { backgroundColor: accentColor } : {}}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isActive ? 'bg-white scale-100' : 'bg-[#c3c6d7] dark:bg-slate-500 scale-75'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active label */}
      <div className="text-center text-[11px] font-bold" style={{ color: accentColor }}>
        {POSITIONS.find((p) => p.id === value)?.label || 'Center'}
      </div>
    </div>
  );
}
