/**
 * CompressionLevelPicker — Three visual quality level cards
 * Used by: compress_pdf, compress_image, compress_video
 */
import React from 'react';
import { Zap, Scale, Shield } from 'lucide-react';

interface CompressionLevelPickerProps {
  value: string;
  onChange: (level: string) => void;
  accentColor?: string;
}

const LEVELS = [
  { id: 'low', label: 'Extreme', sub: 'Smallest file size', detail: '~70% smaller', icon: Zap, emoji: '⚡' },
  { id: 'medium', label: 'Recommended', sub: 'Best balance', detail: '~50% smaller', icon: Scale, emoji: '⚖️' },
  { id: 'high', label: 'High Quality', sub: 'Minimal loss', detail: '~20% smaller', icon: Shield, emoji: '🛡️' },
];

export function CompressionLevelPicker({ value, onChange, accentColor = '#004ac6' }: CompressionLevelPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Compression Level
      </label>
      <div className="space-y-2">
        {LEVELS.map((level) => {
          const isActive = value === level.id;
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onChange(level.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                isActive
                  ? 'shadow-md'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}08` } : {}}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: isActive ? `${accentColor}15` : '#ededf9' }}
              >
                {level.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={isActive ? { color: accentColor } : { color: '#191b23' }}>
                    {level.label}
                  </span>
                  {level.id === 'medium' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      BEST
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#505f76] dark:text-slate-400">{level.sub}</div>
              </div>
              <div className="text-xs font-bold text-[#505f76] dark:text-slate-400 flex-shrink-0">
                {level.detail}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
