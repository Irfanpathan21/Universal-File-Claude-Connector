/**
 * FlipPicker — Two large visual cards for horizontal/vertical flip
 * Used by: flip_image
 */
import React from 'react';
import { FlipHorizontal, FlipVertical } from 'lucide-react';

interface FlipPickerProps {
  value: string;
  onChange: (direction: string) => void;
  accentColor?: string;
}

export function FlipPicker({ value, onChange, accentColor = '#00A3C4' }: FlipPickerProps) {
  const options = [
    { id: 'horizontal', label: 'Flip Horizontal', sub: 'Mirror left ↔ right', icon: FlipHorizontal, transform: 'scaleX(-1)' },
    { id: 'vertical', label: 'Flip Vertical', sub: 'Mirror top ↕ bottom', icon: FlipVertical, transform: 'scaleY(-1)' },
  ];

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Flip Direction
      </label>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`group p-5 rounded-xl text-center border-2 transition-all cursor-pointer ${
                isActive
                  ? 'shadow-md scale-[1.02]'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}10`, color: accentColor } : {}}
            >
              {/* Preview */}
              <div className="w-14 h-16 mx-auto mb-3 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                <div className="w-8 h-10 rounded-sm transition-transform duration-300" style={{ transform: isActive ? opt.transform : 'none', background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}15)` }}>
                  <div className="w-2 h-2 rounded-full mt-1 ml-1" style={{ backgroundColor: accentColor }} />
                </div>
              </div>
              <Icon size={20} className="mx-auto mb-1.5" />
              <div className="text-xs font-bold">{opt.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{opt.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
