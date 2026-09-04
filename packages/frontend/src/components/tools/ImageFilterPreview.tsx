/**
 * ImageFilterPreview — Slider with intensity presets for image filters
 * Used by: image_blur, image_sharpen, image_adjust, gamma_image, threshold_image
 */
import React from 'react';
import { Sliders } from 'lucide-react';

interface ImageFilterPreviewProps {
  paramName: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  defaultVal?: number;
  accentColor?: string;
  /** Additional sliders for multi-param tools like image_adjust */
  extraSliders?: Array<{
    paramName: string;
    value: string;
    onChange: (value: string) => void;
    label: string;
    min: number;
    max: number;
    step: number;
  }>;
}

export function ImageFilterPreview({
  paramName,
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  defaultVal = 50,
  accentColor = '#00A3C4',
  extraSliders = [],
}: ImageFilterPreviewProps) {
  const numVal = parseFloat(value) || defaultVal;

  const presets = [
    { label: 'Subtle', factor: 0.25 },
    { label: 'Medium', factor: 0.5 },
    { label: 'Heavy', factor: 0.85 },
  ];

  return (
    <div className="space-y-4">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
        <Sliders size={14} style={{ color: accentColor }} /> Filter Intensity
      </label>

      {/* Quick presets */}
      <div className="flex items-center gap-2">
        {presets.map((p) => {
          const targetVal = min + (max - min) * p.factor;
          const isActive = Math.abs(numVal - targetVal) < step * 2;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(String(Math.round(targetVal * 100) / 100))}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer border ${
                isActive
                  ? 'text-white shadow-sm border-transparent'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300'
              }`}
              style={isActive ? { backgroundColor: accentColor } : {}}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Primary slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#434655] dark:text-slate-400">{label}</span>
          <span className="font-bold" style={{ color: accentColor }}>{numVal}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor }}
        />
        <div className="flex justify-between text-[9px] text-[#737686]">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      {/* Extra sliders for multi-param tools */}
      {extraSliders.map((slider) => (
        <div key={slider.paramName} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#434655] dark:text-slate-400">{slider.label}</span>
            <span className="font-bold" style={{ color: accentColor }}>{parseFloat(slider.value) || slider.min}</span>
          </div>
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={parseFloat(slider.value) || slider.min}
            onChange={(e) => slider.onChange(e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ accentColor }}
          />
        </div>
      ))}
    </div>
  );
}
