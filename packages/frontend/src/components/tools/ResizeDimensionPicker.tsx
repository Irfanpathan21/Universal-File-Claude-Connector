/**
 * ResizeDimensionPicker — Scale presets, resolution presets, and W×H with aspect lock
 * Used by: resize_image, batch_resize, generate_thumbnail
 */
import React, { useState } from 'react';
import { Lock, Unlock, Monitor, Smartphone, Square, Image as ImageIcon } from 'lucide-react';

interface ResizeDimensionPickerProps {
  width: string;
  height: string;
  onWidthChange: (w: string) => void;
  onHeightChange: (h: string) => void;
  accentColor?: string;
}

const SCALE_PRESETS = [
  { label: '25%', factor: 0.25 },
  { label: '50%', factor: 0.50 },
  { label: '75%', factor: 0.75 },
  { label: '100%', factor: 1.0 },
  { label: '150%', factor: 1.5 },
  { label: '200%', factor: 2.0 },
];

const RESOLUTION_PRESETS = [
  { label: 'HD 720p', w: '1280', h: '720', icon: Monitor },
  { label: 'Full HD', w: '1920', h: '1080', icon: Monitor },
  { label: '4K UHD', w: '3840', h: '2160', icon: Monitor },
  { label: 'Instagram', w: '1080', h: '1080', icon: Square },
  { label: 'YouTube', w: '1280', h: '720', icon: Monitor },
  { label: 'Story', w: '1080', h: '1920', icon: Smartphone },
];

export function ResizeDimensionPicker({ width, height, onWidthChange, onHeightChange, accentColor = '#00A3C4' }: ResizeDimensionPickerProps) {
  const [locked, setLocked] = useState(true);
  const [activePreset, setActivePreset] = useState<string>('');

  const applyResolutionPreset = (w: string, h: string, label: string) => {
    onWidthChange(w);
    onHeightChange(h);
    setActivePreset(label);
  };

  const applyScalePreset = (factor: number) => {
    const baseW = parseInt(width) || 1920;
    const baseH = parseInt(height) || 1080;
    onWidthChange(String(Math.round(baseW * factor)));
    onHeightChange(String(Math.round(baseH * factor)));
    setActivePreset(`${factor * 100}%`);
  };

  return (
    <div className="space-y-4">
      {/* Scale Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          Quick Scale
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {SCALE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyScalePreset(p.factor)}
              className={`py-1.5 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer border ${
                activePreset === `${p.factor * 100}%`
                  ? 'text-white shadow-sm border-transparent'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:bg-slate-200'
              }`}
              style={activePreset === `${p.factor * 100}%` ? { backgroundColor: accentColor } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          Common Resolutions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RESOLUTION_PRESETS.map((r) => {
            const Icon = r.icon;
            const isActive = activePreset === r.label;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => applyResolutionPreset(r.w, r.h, r.label)}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                  isActive
                    ? 'shadow-sm border-current'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400'
                }`}
                style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}08`, color: accentColor } : {}}
              >
                <Icon size={14} className={isActive ? '' : 'text-[#737686]'} />
                <div>
                  <div className="text-[11px] font-bold">{r.label}</div>
                  <div className="text-[9px] text-[#737686]">{r.w}×{r.h}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual W × H with aspect lock */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          Custom Dimensions
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] font-semibold text-[#737686]">Width (px)</span>
            <input
              type="number"
              value={width}
              onChange={(e) => onWidthChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white text-center"
            />
          </div>
          <button
            type="button"
            onClick={() => setLocked(!locked)}
            className="mt-4 p-2 rounded-lg border border-[#c3c6d7] dark:border-slate-700 text-[#737686] hover:text-[#191b23] dark:hover:text-white cursor-pointer"
            title={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <div className="flex-1 space-y-1">
            <span className="text-[10px] font-semibold text-[#737686]">Height (px)</span>
            <input
              type="number"
              value={height}
              onChange={(e) => onHeightChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
