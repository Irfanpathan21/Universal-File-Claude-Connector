/**
 * VisualTrimStudio — Real-time Visual Image Border & Transparency Trimming Studio
 *
 * Features:
 * - Real-time HTML5 Canvas pixel scanning for transparent or solid borders
 * - Live Bounding Box overlay showing exact trimmed margins (top, right, bottom, left)
 * - 3 View Modes: Trimmed Preview, Cut Margins Bounding Box Overlay, and Split Compare Slider
 * - Background pattern toggle (Transparency Checkerboard, Clean White, Dark Slate)
 * - Mode Selector: Transparent Alpha, Auto Corner Color, White Borders, Black Borders
 * - Tolerance / Threshold Slider (0 - 100) with quick presets
 * - Safe Padding Selector (0px, 5px, 10px, 20px)
 * - Live Metrics: Original vs Trimmed resolution, margins removed, space saved percentage
 * - 1-Click "Apply Trim & Download"
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scissors, Eye, Download, Check, Sparkles, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  Layers, Columns, Image as ImageIcon, RotateCcw, Sliders, BoxSelect, CheckCircle2
} from 'lucide-react';

export interface VisualTrimStudioProps {
  imageFile: File;
  mode?: string;
  onModeChange?: (mode: string) => void;
  threshold?: number;
  onThresholdChange?: (val: number) => void;
  padding?: number;
  onPaddingChange?: (val: number) => void;
  accentColor?: string;
  onApply?: () => void;
  processing?: boolean;
}

interface CropMetrics {
  origWidth: number;
  origHeight: number;
  cropLeft: number;
  cropTop: number;
  cropWidth: number;
  cropHeight: number;
  trimmedTop: number;
  trimmedBottom: number;
  trimmedLeft: number;
  trimmedRight: number;
  percentSaved: number;
  hasTrim: boolean;
}

export function VisualTrimStudio({
  imageFile,
  mode: controlledMode,
  onModeChange,
  threshold: controlledThreshold,
  onThresholdChange,
  padding: controlledPadding,
  onPaddingChange,
  accentColor = '#004ac6',
  onApply,
  processing = false,
}: VisualTrimStudioProps) {
  // Local state fallbacks if not controlled
  const [localMode, setLocalMode] = useState<string>('transparent');
  const [localThreshold, setLocalThreshold] = useState<number>(10);
  const [localPadding, setLocalPadding] = useState<number>(0);

  const mode = controlledMode !== undefined ? controlledMode : localMode;
  const threshold = controlledThreshold !== undefined ? controlledThreshold : localThreshold;
  const padding = controlledPadding !== undefined ? controlledPadding : localPadding;

  const handleSetMode = (m: string) => {
    setLocalMode(m);
    onModeChange?.(m);
  };

  const handleSetThreshold = (t: number) => {
    setLocalThreshold(t);
    onThresholdChange?.(t);
  };

  const handleSetPadding = (p: number) => {
    setLocalPadding(p);
    onPaddingChange?.(p);
  };

  const [viewMode, setViewMode] = useState<'trimmed' | 'overlay' | 'compare'>('trimmed');
  const [bgMode, setBgMode] = useState<'checker' | 'white' | 'dark'>('checker');
  const [zoom, setZoom] = useState<number>(1);
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0-100 for compare view

  const [metrics, setMetrics] = useState<CropMetrics | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);

  // Load and cache original source image
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImageRef.current = img;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        originalImageDataRef.current = imgData;
      }
      calculateAndRender();
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Recalculate and render whenever mode, threshold, padding, viewMode, bgMode, or splitPos change
  const calculateAndRender = useCallback(() => {
    const img = sourceImageRef.current;
    const imgData = originalImageDataRef.current;
    const canvas = canvasRef.current;
    if (!img || !imgData || !canvas) return;

    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const rawData = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    if (mode === 'transparent') {
      // Find bounding box where alpha > threshold
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const alpha = rawData[idx + 3];
          if (alpha > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    } else {
      // Color-based trimming (white, black, or auto from 4 corners)
      let targetR = 255;
      let targetG = 255;
      let targetB = 255;

      if (mode === 'black') {
        targetR = 0; targetG = 0; targetB = 0;
      } else if (mode === 'auto') {
        // Sample corners
        const getPix = (px: number, py: number) => {
          const idx = (py * width + px) * 4;
          return [rawData[idx], rawData[idx + 1], rawData[idx + 2]];
        };
        const c1 = getPix(0, 0);
        const c2 = getPix(width - 1, 0);
        const c3 = getPix(0, height - 1);
        const c4 = getPix(width - 1, height - 1);
        targetR = Math.round((c1[0] + c2[0] + c3[0] + c4[0]) / 4);
        targetG = Math.round((c1[1] + c2[1] + c3[1] + c4[1]) / 4);
        targetB = Math.round((c1[2] + c2[2] + c3[2] + c4[2]) / 4);
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = rawData[idx];
          const g = rawData[idx + 1];
          const b = rawData[idx + 2];
          const a = rawData[idx + 3];

          const colorDist = Math.sqrt(
            Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2)
          );

          if (a < 25 || colorDist > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    let cropLeft = 0;
    let cropTop = 0;
    let cropWidth = width;
    let cropHeight = height;
    let hasTrim = false;

    if (maxX >= minX && maxY >= minY) {
      cropLeft = Math.max(0, minX - padding);
      cropTop = Math.max(0, minY - padding);
      const rightPad = Math.min(width - 1, maxX + padding);
      const bottomPad = Math.min(height - 1, maxY + padding);
      cropWidth = rightPad - cropLeft + 1;
      cropHeight = bottomPad - cropTop + 1;
      hasTrim = cropWidth < width || cropHeight < height;
    }

    const trimmedTop = cropTop;
    const trimmedBottom = height - (cropTop + cropHeight);
    const trimmedLeft = cropLeft;
    const trimmedRight = width - (cropLeft + cropWidth);
    const percentSaved = Math.max(0, Math.round((1 - (cropWidth * cropHeight) / (width * height)) * 100));

    setMetrics({
      origWidth: width,
      origHeight: height,
      cropLeft,
      cropTop,
      cropWidth,
      cropHeight,
      trimmedTop,
      trimmedBottom,
      trimmedLeft,
      trimmedRight,
      percentSaved,
      hasTrim,
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (viewMode === 'trimmed') {
      // Draw solely the cropped sub-rectangle
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      ctx.clearRect(0, 0, cropWidth, cropHeight);
      ctx.drawImage(
        img,
        cropLeft, cropTop, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
    } else if (viewMode === 'overlay') {
      // Draw full image with outer crop mask
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);

      // Dim the outer trimmed areas with a red/dim translucent mask
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';

      // Top margin
      if (cropTop > 0) {
        ctx.fillRect(0, 0, width, cropTop);
      }
      // Bottom margin
      if (cropTop + cropHeight < height) {
        ctx.fillRect(0, cropTop + cropHeight, width, height - (cropTop + cropHeight));
      }
      // Left margin
      if (cropLeft > 0) {
        ctx.fillRect(0, cropTop, cropLeft, cropHeight);
      }
      // Right margin
      if (cropLeft + cropWidth < width) {
        ctx.fillRect(cropLeft + cropWidth, cropTop, width - (cropLeft + cropWidth), cropHeight);
      }

      // Draw bounding box neon border
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = Math.max(2, Math.round(Math.min(width, height) / 300));
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(cropLeft, cropTop, cropWidth, cropHeight);

      // Draw corner grab handles for clear visual affordance
      ctx.fillStyle = '#10b981';
      const handleSize = Math.max(6, Math.round(Math.min(width, height) / 100));
      ctx.fillRect(cropLeft - handleSize / 2, cropTop - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropLeft + cropWidth - handleSize / 2, cropTop - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropLeft - handleSize / 2, cropTop + cropHeight - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropLeft + cropWidth - handleSize / 2, cropTop + cropHeight - handleSize / 2, handleSize, handleSize);
      ctx.restore();
    } else if (viewMode === 'compare') {
      // Split compare: left is original, right is trimmed
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw full original image
      ctx.drawImage(img, 0, 0);

      // 2. Draw split trimmed version
      const splitX = Math.round((splitPos / 100) * width);

      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, width - splitX, height);
      ctx.clip();

      // Clear the right side to let checkerboard show through
      ctx.clearRect(splitX, 0, width - splitX, height);

      // Draw trimmed image placed in center
      const offsetX = Math.round((width - cropWidth) / 2);
      const offsetY = Math.round((height - cropHeight) / 2);
      ctx.drawImage(
        img,
        cropLeft, cropTop, cropWidth, cropHeight,
        offsetX, offsetY, cropWidth, cropHeight
      );
      ctx.restore();

      // Divider line
      ctx.save();
      ctx.strokeStyle = '#00A3C4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();

      // Handle circle
      ctx.fillStyle = '#00A3C4';
      ctx.beginPath();
      ctx.arc(splitX, height / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }, [mode, threshold, padding, viewMode, splitPos]);

  useEffect(() => {
    calculateAndRender();
  }, [calculateAndRender]);

  // Handle split compare slider mouse/touch
  const handleSplitDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (viewMode !== 'compare') return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  const getBgStyle = () => {
    if (bgMode === 'white') return 'bg-white';
    if (bgMode === 'dark') return 'bg-slate-900';
    // Checkerboard pattern
    return 'bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 shadow-md overflow-hidden flex flex-col space-y-0">
      {/* ── Studio Header Toolbar ── */}
      <div className="px-5 py-3.5 border-b border-[#ededf9] dark:border-slate-800 bg-[#f8f9fe] dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Tool Title & Status */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            <Scissors size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#191b23] dark:text-white">
                Visual Edge Trim Studio
              </h3>
              {metrics && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white flex items-center gap-1 ${
                    metrics.hasTrim ? 'bg-emerald-600' : 'bg-slate-500'
                  }`}
                >
                  {metrics.hasTrim ? `Trimmed: -${metrics.percentSaved}% Space` : 'No Outer Margins Detected'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#737686]">
              {mode === 'transparent'
                ? 'Detecting transparent alpha outer margins'
                : mode === 'auto'
                ? 'Detecting corner color borders'
                : mode === 'white'
                ? 'Detecting white outer borders'
                : 'Detecting black outer borders'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#ededf9] dark:bg-slate-800 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setViewMode('trimmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'trimmed'
                ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                : 'text-[#505f76] dark:text-slate-300 hover:text-[#004ac6]'
            }`}
          >
            <Scissors size={13} /> Trimmed Preview
          </button>
          <button
            type="button"
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'overlay'
                ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                : 'text-[#505f76] dark:text-slate-300 hover:text-[#004ac6]'
            }`}
          >
            <BoxSelect size={13} /> Cut Bounding Box
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'compare'
                ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                : 'text-[#505f76] dark:text-slate-300 hover:text-[#004ac6]'
            }`}
          >
            <Columns size={13} /> Compare Split
          </button>
        </div>

        {/* Right: Background & Zoom */}
        <div className="flex items-center gap-2">
          {/* BG Switcher */}
          <div className="flex items-center bg-[#ededf9] dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setBgMode('checker')}
              title="Checkerboard Transparency"
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                bgMode === 'checker' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-[#737686]'
              }`}
            >
              🏁
            </button>
            <button
              type="button"
              onClick={() => setBgMode('white')}
              title="Clean White Background"
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                bgMode === 'white' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-[#737686]'
              }`}
            >
              ⬜
            </button>
            <button
              type="button"
              onClick={() => setBgMode('dark')}
              title="Dark Background"
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                bgMode === 'dark' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-[#737686]'
              }`}
            >
              ⬛
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-[#ededf9] dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-[#505f76] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-bold text-[#505f76] px-1">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-[#505f76] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            {zoom !== 1 && (
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-[#004ac6] cursor-pointer"
                title="Reset Zoom"
              >
                <Maximize2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Canvas Viewport ── */}
      <div
        ref={containerRef}
        onMouseMove={viewMode === 'compare' ? handleSplitDrag : undefined}
        onTouchMove={viewMode === 'compare' ? handleSplitDrag : undefined}
        className={`relative min-h-[440px] max-h-[640px] flex items-center justify-center p-6 overflow-auto border-b border-[#ededf9] dark:border-slate-800 ${getBgStyle()}`}
        style={{ cursor: viewMode === 'compare' ? 'ew-resize' : 'default' }}
      >
        <div
          className="transition-transform duration-100 flex items-center justify-center shadow-lg rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <canvas ref={canvasRef} className="max-w-full max-h-[520px] object-contain block" />
        </div>

        {/* View Mode Overlay Pills */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-bold shadow-md flex items-center gap-1.5">
            {viewMode === 'trimmed' && <>✂️ Trimmed Preview ({metrics ? `${metrics.cropWidth}×${metrics.cropHeight}` : ''})</>}
            {viewMode === 'overlay' && <>📐 Bounding Box Overlay ({metrics ? `${metrics.origWidth}×${metrics.origHeight}` : ''})</>}
            {viewMode === 'compare' && <>↔️ Slide to Compare Original vs Trimmed</>}
          </span>
        </div>

        {/* Dimension Comparison Badge on Bottom Right */}
        {metrics && (
          <div className="absolute bottom-4 right-4 z-10 px-3.5 py-2 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-medium shadow-md space-y-1">
            <div className="flex items-center justify-between gap-4 font-bold">
              <span className="text-slate-400">Original:</span>
              <span>{metrics.origWidth} × {metrics.origHeight} px</span>
            </div>
            <div className="flex items-center justify-between gap-4 font-bold text-emerald-400">
              <span>Trimmed:</span>
              <span>{metrics.cropWidth} × {metrics.cropHeight} px</span>
            </div>
            {metrics.hasTrim && (
              <div className="text-[10px] text-slate-300 pt-0.5 border-t border-slate-700 flex items-center justify-between gap-2">
                <span>Cut: L:{metrics.trimmedLeft}px R:{metrics.trimmedRight}px T:{metrics.trimmedTop}px B:{metrics.trimmedBottom}px</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Interactive Controls Toolbar ── */}
      <div className="p-5 bg-white dark:bg-slate-900 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Trim Mode */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#191b23] dark:text-white flex items-center gap-1.5">
              <Layers size={14} style={{ color: accentColor }} /> Trim Detection Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'transparent', label: 'Transparent Alpha', desc: 'Outer transparent pixels' },
                { id: 'auto', label: 'Corner Color', desc: 'Auto sample border' },
                { id: 'white', label: 'White Borders', desc: 'Clean white canvas' },
                { id: 'black', label: 'Black Borders', desc: 'Letterbox borders' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSetMode(m.id)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-center ${
                    mode === m.id
                      ? 'shadow-sm'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800'
                  }`}
                  style={
                    mode === m.id
                      ? { borderColor: accentColor, backgroundColor: `${accentColor}10` }
                      : {}
                  }
                >
                  <div className="text-xs font-bold text-[#191b23] dark:text-white flex items-center justify-between">
                    <span>{m.label}</span>
                    {mode === m.id && <Check size={12} style={{ color: accentColor }} />}
                  </div>
                  <span className="text-[10px] text-[#737686] truncate">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tolerance / Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#191b23] dark:text-white flex items-center gap-1.5">
                <Sliders size={14} style={{ color: accentColor }} /> Tolerance / Threshold: {threshold}
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => handleSetThreshold(parseInt(e.target.value, 10))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
              style={{ accentColor }}
            />
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: 'Exact (0)', value: 0 },
                { label: 'Standard (10)', value: 10 },
                { label: 'Medium (25)', value: 25 },
                { label: 'Aggressive (50)', value: 50 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleSetThreshold(preset.value)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    threshold === preset.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#505f76]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#737686]">
              Trims anti-aliased alpha fringe, halo pixels, and faint edges.
            </p>
          </div>

          {/* 3. Padding Around Content */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#191b23] dark:text-white flex items-center gap-1.5">
              <BoxSelect size={14} style={{ color: accentColor }} /> Keep Margin Padding
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '0px', val: 0, sub: 'Exact' },
                { label: '5px', val: 5, sub: 'Tight' },
                { label: '10px', val: 10, sub: 'Medium' },
                { label: '20px', val: 20, sub: 'Spacious' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleSetPadding(p.val)}
                  className={`py-2 rounded-xl text-center border-2 transition-all cursor-pointer ${
                    padding === p.val
                      ? 'shadow-xs'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800'
                  }`}
                  style={
                    padding === p.val
                      ? { borderColor: accentColor, backgroundColor: `${accentColor}10`, color: accentColor }
                      : {}
                  }
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[9px] text-[#737686]">{p.sub}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#737686]">
              Optional clean margin buffer retained around the content.
            </p>
          </div>
        </div>

        {/* Quick Action Footer */}
        {onApply && (
          <div className="pt-3 border-t border-[#ededf9] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[#505f76] dark:text-slate-400">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>
                Ready to crop from <strong className="text-[#191b23] dark:text-white">{metrics ? `${metrics.origWidth}×${metrics.origHeight}` : ''}</strong> down to <strong className="text-emerald-600 dark:text-emerald-400">{metrics ? `${metrics.cropWidth}×${metrics.cropHeight}` : ''}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={onApply}
              disabled={processing}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              {processing ? (
                <><RefreshCw size={14} className="animate-spin" /> Processing Trim...</>
              ) : (
                <><Download size={14} /> Apply Trim &amp; Download</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
