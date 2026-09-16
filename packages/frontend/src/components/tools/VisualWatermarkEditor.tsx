/**
 * Interactive Visual Watermark Canvas Component
 * Real-time canvas overlay rendering text watermarks on uploaded images
 * with support for all 9 positions:
 * - Center
 * - Left, Right, Top, Bottom
 * - 4 Corners: Top-Left, Top-Right, Bottom-Left, Bottom-Right
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, Droplet, Play, RefreshCw, Sliders, Check, RotateCw } from 'lucide-react';

export interface VisualWatermarkEditorProps {
  imageFile: File;
  text?: string;
  position?: string;
  opacity?: number;
  fontSize?: number;
  color?: string;
  angle?: number;
  onWatermarkChange: (watermarkParams: {
    text: string;
    opacity: number;
    fontSize: number;
    color: string;
    position: string;
    angle: number;
  }) => void;
  accentColor?: string;
  onApply?: () => void;
  processing?: boolean;
}

const POSITIONS = [
  { id: 'top-left', label: 'Top-Left', group: 'corner', short: 'TL' },
  { id: 'top', label: 'Top', group: 'edge', short: 'Top' },
  { id: 'top-right', label: 'Top-Right', group: 'corner', short: 'TR' },
  { id: 'left', label: 'Left', group: 'edge', short: 'Left' },
  { id: 'center', label: 'Center', group: 'center', short: 'Center' },
  { id: 'right', label: 'Right', group: 'edge', short: 'Right' },
  { id: 'bottom-left', label: 'Bottom-Left', group: 'corner', short: 'BL' },
  { id: 'bottom', label: 'Bottom', group: 'edge', short: 'Bottom' },
  { id: 'bottom-right', label: 'Bottom-Right', group: 'corner', short: 'BR' },
];

const PRESET_TEXTS = ['CONFIDENTIAL', 'SAMPLE', 'DRAFT', 'DO NOT COPY', '© 2026', 'WATERMARK'];

const PRESET_COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Yellow', value: '#f59e0b' },
  { label: 'Blue', value: '#3b82f6' },
];

const PRESET_SLANTS = [
  { label: '📐 Slanted (-30°)', value: -30 },
  { label: '📐 Diagonal (-45°)', value: -45 },
  { label: '➖ Horizontal (0°)', value: 0 },
  { label: '📐 Slanted Up (+30°)', value: 30 },
];

export function VisualWatermarkEditor({
  imageFile,
  text: controlledText,
  position: controlledPosition,
  opacity: controlledOpacity,
  fontSize: controlledFontSize,
  color: controlledColor,
  angle: controlledAngle,
  onWatermarkChange,
  accentColor = '#004ac6',
  onApply,
  processing = false,
}: VisualWatermarkEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Fallback local state if props are not passed
  const [localText, setLocalText] = useState<string>('CONFIDENTIAL');
  const [localPosition, setLocalPosition] = useState<string>('center');
  const [localOpacity, setLocalOpacity] = useState<number>(0.6);
  const [localFontSize, setLocalFontSize] = useState<number>(36);
  const [localColor, setLocalColor] = useState<string>('#ffffff');
  const [localAngle, setLocalAngle] = useState<number>(-30);

  // Resolved values prioritizing controlled props
  const text = controlledText !== undefined ? controlledText : localText;
  const position = (controlledPosition !== undefined ? controlledPosition : localPosition).toLowerCase().replace('_', '-');
  const opacity = controlledOpacity !== undefined ? controlledOpacity : localOpacity;
  const fontSize = controlledFontSize !== undefined ? controlledFontSize : localFontSize;
  const color = controlledColor !== undefined ? controlledColor : localColor;
  const angle = controlledAngle !== undefined ? controlledAngle : localAngle;

  const emitChange = useCallback(
    (updates: Partial<{ text: string; position: string; opacity: number; fontSize: number; color: string; angle: number }>) => {
      const next = {
        text: updates.text !== undefined ? updates.text : text,
        position: updates.position !== undefined ? updates.position : position,
        opacity: updates.opacity !== undefined ? updates.opacity : opacity,
        fontSize: updates.fontSize !== undefined ? updates.fontSize : fontSize,
        color: updates.color !== undefined ? updates.color : color,
        angle: updates.angle !== undefined ? updates.angle : angle,
      };

      if (updates.text !== undefined) setLocalText(updates.text);
      if (updates.position !== undefined) setLocalPosition(updates.position);
      if (updates.opacity !== undefined) setLocalOpacity(updates.opacity);
      if (updates.fontSize !== undefined) setLocalFontSize(updates.fontSize);
      if (updates.color !== undefined) setLocalColor(updates.color);
      if (updates.angle !== undefined) setLocalAngle(updates.angle);

      onWatermarkChange(next);
    },
    [text, position, opacity, fontSize, color, angle, onWatermarkChange]
  );

  // Load uploaded image file
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => setImageObj(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Render canvas with real-time watermark overlay matching SVG/Sharp layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = containerRef.current.clientWidth || 640;
    const scale = Math.min(containerWidth / imageObj.naturalWidth, 480 / imageObj.naturalHeight, 1);

    const displayWidth = Math.round(imageObj.naturalWidth * scale);
    const displayHeight = Math.round(imageObj.naturalHeight * scale);

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw uploaded image
    ctx.drawImage(imageObj, 0, 0, displayWidth, displayHeight);

    // Draw watermark text overlay
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.fillStyle = color;

    // Scale font size proportionally to preview scale
    const renderedFontSize = Math.max(12, Math.round(fontSize * scale));
    ctx.font = `bold ${renderedFontSize}px system-ui, -apple-system, sans-serif`;

    let x = displayWidth * 0.5;
    let y = displayHeight * 0.5;
    let align: CanvasTextAlign = 'center';
    let baseline: CanvasTextBaseline = 'middle';

    const normPos = position.replace('top-center', 'top').replace('bottom-center', 'bottom').replace('center-left', 'left').replace('center-right', 'right');

    switch (normPos) {
      case 'top-left':
        x = displayWidth * 0.06;
        y = displayHeight * 0.10;
        align = 'left';
        baseline = 'middle';
        break;
      case 'top':
        x = displayWidth * 0.5;
        y = displayHeight * 0.10;
        align = 'center';
        baseline = 'middle';
        break;
      case 'top-right':
        x = displayWidth * 0.94;
        y = displayHeight * 0.10;
        align = 'right';
        baseline = 'middle';
        break;
      case 'left':
        x = displayWidth * 0.06;
        y = displayHeight * 0.5;
        align = 'left';
        baseline = 'middle';
        break;
      case 'center':
        x = displayWidth * 0.5;
        y = displayHeight * 0.5;
        align = 'center';
        baseline = 'middle';
        break;
      case 'right':
        x = displayWidth * 0.94;
        y = displayHeight * 0.5;
        align = 'right';
        baseline = 'middle';
        break;
      case 'bottom-left':
        x = displayWidth * 0.06;
        y = displayHeight * 0.92;
        align = 'left';
        baseline = 'middle';
        break;
      case 'bottom':
        x = displayWidth * 0.5;
        y = displayHeight * 0.92;
        align = 'center';
        baseline = 'middle';
        break;
      case 'bottom-right':
        x = displayWidth * 0.94;
        y = displayHeight * 0.92;
        align = 'right';
        baseline = 'middle';
        break;
      default:
        x = displayWidth * 0.5;
        y = displayHeight * 0.5;
        align = 'center';
        baseline = 'middle';
        break;
    }

    ctx.translate(x, y);
    if (angle !== 0) {
      ctx.rotate((angle * Math.PI) / 180);
    }
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text || 'WATERMARK', 0, 0);
    ctx.restore();
  }, [imageObj, text, opacity, fontSize, color, position, angle]);

  const activePositionLabel = POSITIONS.find((p) => p.id === position || position.includes(p.id))?.label || 'Center';

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* Header bar with title and quick proceed button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Droplet size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#191b23] dark:text-white">
              Watermark Studio Preview
            </h3>
            <p className="text-[11px] text-[#737686]">
              Position: <span className="font-semibold text-[#191b23] dark:text-white">{activePositionLabel}</span> • Text: <span className="font-semibold text-[#191b23] dark:text-white">&ldquo;{text || 'None'}&rdquo;</span>
            </p>
          </div>
        </div>

        {onApply && (
          <button
            type="button"
            onClick={onApply}
            disabled={processing}
            className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {processing ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Play size={14} /> Proceed &amp; Apply
              </>
            )}
          </button>
        )}
      </div>

      {/* HTML5 Canvas Preview Area */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center bg-slate-950/90 rounded-xl p-4 min-h-[320px] overflow-hidden relative"
      >
        <canvas ref={canvasRef} className="rounded-lg shadow-2xl max-w-full" />
      </div>

      {/* 1. Watermark Text Input */}
      <div className="space-y-2 bg-[#f3f3fe]/70 dark:bg-slate-800/60 p-4 rounded-xl border border-[#c3c6d7]/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#191b23] dark:text-white flex items-center gap-1.5">
            <Type size={14} style={{ color: accentColor }} />
            Watermark Text
          </label>
          <span className="text-[10px] text-[#737686]">Type what watermark you want</span>
        </div>

        <input
          type="text"
          value={text}
          onChange={(e) => emitChange({ text: e.target.value })}
          placeholder="Enter watermark text (e.g. CONFIDENTIAL, SAMPLE, © YOUR NAME)..."
          className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white placeholder-[#737686] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        {/* Quick Text Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-[#737686] mr-1">Quick text:</span>
          {PRESET_TEXTS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => emitChange({ text: sample })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                text === sample
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-slate-900 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-blue-400'
              }`}
              style={text === sample ? { backgroundColor: accentColor } : {}}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Watermark Location Selection (Center, Left, Right, Top, Bottom, 4 Corners) */}
      <div className="space-y-2 bg-[#f3f3fe]/70 dark:bg-slate-800/60 p-4 rounded-xl border border-[#c3c6d7]/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
            Watermark Location
          </label>
          <span
            className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md text-white shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            {activePositionLabel}
          </span>
        </div>

        {/* 3x3 Placement Grid + Label Selector */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {POSITIONS.map((pos) => {
            const isSelected = position === pos.id || (position === 'top' && pos.id === 'top') || (position === 'bottom' && pos.id === 'bottom');
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => emitChange({ position: pos.id })}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'text-white shadow-sm border-transparent scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-blue-400'
                }`}
                style={isSelected ? { backgroundColor: accentColor } : {}}
              >
                <span>{pos.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#737686]'}`}>
                  {pos.group === 'center' ? 'Center' : pos.group === 'corner' ? 'Corner' : 'Edge'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Watermark Slant Angle */}
      <div className="space-y-2.5 bg-[#f3f3fe]/70 dark:bg-slate-800/60 p-4 rounded-xl border border-[#c3c6d7]/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <RotateCw size={14} style={{ color: accentColor }} />
            Watermark Slant Angle
          </label>
          <span
            className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md text-white shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            {angle === 0 ? 'Horizontal (0°)' : `${angle}° Slanted`}
          </span>
        </div>

        {/* Quick Slant Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          {PRESET_SLANTS.map((preset) => {
            const isSelected = angle === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => emitChange({ angle: preset.value })}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  isSelected
                    ? 'text-white shadow-sm border-transparent scale-[1.02]'
                    : 'bg-white dark:bg-slate-900 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-blue-400'
                }`}
                style={isSelected ? { backgroundColor: accentColor } : {}}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Slant Angle Slider */}
        <div className="pt-1 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-[#737686]">
            <span>-90° (Vertical Down)</span>
            <span className="font-mono text-xs font-bold text-[#191b23] dark:text-white">{angle}°</span>
            <span>+90° (Vertical Up)</span>
          </div>
          <input
            type="range"
            min="-90"
            max="90"
            step="5"
            value={angle}
            onChange={(e) => emitChange({ angle: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
            style={{ accentColor }}
          />
        </div>
      </div>

      {/* 4. Appearance Controls (Opacity, Font Size, Color) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f3f3fe]/70 dark:bg-slate-800/60 p-4 rounded-xl border border-[#c3c6d7]/60 dark:border-slate-700/60 text-xs">
        {/* Opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold text-[#191b23] dark:text-white">
            <span>Opacity</span>
            <span className="font-mono">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => emitChange({ opacity: parseFloat(e.target.value) })}
            className="w-full cursor-pointer"
            style={{ accentColor }}
          />
        </div>

        {/* Font Size */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold text-[#191b23] dark:text-white">
            <span>Font Size</span>
            <span className="font-mono">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="14"
            max="120"
            step="2"
            value={fontSize}
            onChange={(e) => emitChange({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full cursor-pointer"
            style={{ accentColor }}
          />
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold text-[#191b23] dark:text-white">
            <span>Text Color</span>
            <span className="font-mono uppercase">{color}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => emitChange({ color: c.value })}
                className={`w-6 h-6 rounded-full border border-[#c3c6d7] flex items-center justify-center cursor-pointer transition-transform ${
                  color === c.value ? 'scale-110 ring-2 ring-blue-500' : ''
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              >
                {color === c.value && (
                  <Check size={12} className={c.value === '#ffffff' ? 'text-black' : 'text-white'} />
                )}
              </button>
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => emitChange({ color: e.target.value })}
              className="w-7 h-7 rounded border border-[#c3c6d7] cursor-pointer ml-auto"
              title="Custom color"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
