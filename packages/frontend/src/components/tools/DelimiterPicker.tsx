/**
 * DelimiterPicker — Clickable pill buttons for delimiter selection
 * Used by: json_to_csv
 */
import React from 'react';

interface DelimiterPickerProps {
  value: string;
  onChange: (delimiter: string) => void;
  accentColor?: string;
}

const DELIMITERS = [
  { id: ',', label: 'Comma', display: ',' },
  { id: ';', label: 'Semicolon', display: ';' },
  { id: '\\t', label: 'Tab', display: '⇥' },
  { id: '|', label: 'Pipe', display: '|' },
];

export function DelimiterPicker({ value, onChange, accentColor = '#004ac6' }: DelimiterPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Field Separator
      </label>
      <div className="grid grid-cols-4 gap-2">
        {DELIMITERS.map((d) => {
          const isActive = value === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onChange(d.id)}
              className={`py-3 rounded-xl text-center border-2 transition-all cursor-pointer ${
                isActive
                  ? 'shadow-sm'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}10`, color: accentColor } : {}}
            >
              <div className="text-lg font-black mb-0.5">{d.display}</div>
              <div className="text-[10px] font-bold">{d.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
