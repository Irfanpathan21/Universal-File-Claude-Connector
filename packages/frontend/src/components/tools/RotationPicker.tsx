/**
 * RotationPicker — Visual rotation cards with preview icons
 * Used by: rotate_image, rotate_pdf
 */
import React from 'react';
import { RotateCw, RotateCcw, FlipHorizontal } from 'lucide-react';

interface RotationPickerProps {
  value: string;
  onChange: (angle: string) => void;
  accentColor?: string;
}

const ROTATIONS = [
  { angle: '90', label: '90° Right', icon: RotateCw, preview: 'rotate(90deg)' },
  { angle: '180', label: '180° Flip', icon: FlipHorizontal, preview: 'rotate(180deg)' },
  { angle: '270', label: '90° Left', icon: RotateCcw, preview: 'rotate(270deg)' },
];

export function RotationPicker({ value, onChange, accentColor = '#00A3C4' }: RotationPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Rotation Direction
      </label>
      <div className="grid grid-cols-3 gap-3">
        {ROTATIONS.map((rot) => {
          const Icon = rot.icon;
          const isActive = value === rot.angle;
          return (
            <button
              key={rot.angle}
              type="button"
              onClick={() => onChange(rot.angle)}
              className={`group relative p-4 rounded-xl text-center border-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-current shadow-md scale-[1.02]'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}10`, color: accentColor } : {}}
            >
              {/* Preview thumbnail */}
              <div className="w-12 h-14 mx-auto mb-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                <div className="w-7 h-9 rounded-sm bg-slate-200 dark:bg-slate-700 transition-transform duration-300" style={{ transform: rot.preview }} />
              </div>
              <Icon size={16} className="mx-auto mb-1" />
              <div className="text-[11px] font-bold">{rot.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
