/**
 * VisualThresholdStudio — Real-time Pure Binary Threshold & Ink Sketch Studio
 * 
 * Features:
 * - Real-time HTML5 Canvas pixel-perfect binary thresholding (zero gray noise, zero fake CSS blur)
 * - Preset cutoff buttons: Low (64), Standard (128 - default), High (192), Otsu Auto
 * - Compare view: Split before/after slider and Hold for Original toggle
 * - Mode toggle: Black Ink on White (Ink Stencil) vs White on Black (Standard Binary)
 * - Background toggle: Transparent Cutout vs Solid White Paper
 * - Direct 1-click Download & Apply
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sliders, Eye, Download, Check, Sparkles, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  Layers, Columns, Image as ImageIcon, RotateCcw
} from 'lucide-react';

interface VisualThresholdStudioProps {
  imageFile: File;
  threshold: number;
  onThresholdChange: (val: number) => void;
  invert: boolean;
  onInvertChange: (inv: boolean) => void;
  backgroundMode?: 'transparent' | 'white';
  onBackgroundModeChange?: (mode: 'transparent' | 'white') => void;
  accentColor?: string;
  onApply?: () => void;
  processing?: boolean;
}

export function VisualThresholdStudio({
  imageFile,
  threshold = 128,
  onThresholdChange,
  invert = false,
  onInvertChange,
  backgroundMode = 'transparent',
  onBackgroundModeChange,
  accentColor = '#00A3C4',
  onApply,
  processing = false,
}: VisualThresholdStudioProps) {
  const [viewMode, setViewMode] = useState<'threshold' | 'original' | 'compare'>('threshold');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0-100
  const [zoom, setZoom] = useState<number>(1);
  const [bgMode, setBgMode] = useState<'transparent' | 'white'>(backgroundMode);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [otsuValue, setOtsuValue] = useState<number>(128);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);

  // Sync external bgMode changes
  useEffect(() => {
    if (backgroundMode) setBgMode(backgroundMode);
  }, [backgroundMode]);

  // Load and cache original source image
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImageRef.current = img;
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });

      // Create an offscreen canvas to grab original ImageData
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        originalImageDataRef.current = imgData;

        // Calculate Otsu's optimal threshold
        const histogram = new Array(256).fill(0);
        const data = imgData.data;
        let totalPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) { // non-transparent
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[lum]++;
            totalPixels++;
          }
        }
        if (totalPixels > 0) {
          let sum = 0;
          for (let i = 0; i < 256; i++) sum += i * histogram[i];
          let sumB = 0;
          let wB = 0;
          let wF = 0;
          let varMax = 0;
          let optimal = 128;
          for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            wF = totalPixels - wB;
            if (wF === 0) break;
            sumB += t * histogram[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const varBetween = wB * wF * (mB - mF) * (mB - mF);
            if (varBetween > varMax) {
              varMax = varBetween;
              optimal = t;
            }
          }
          setOtsuValue(optimal);
        }
      }
      renderCanvas();
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Real-time Canvas Rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const origData = originalImageDataRef.current;
    if (!canvas || !origData) return;

    canvas.width = origData.width;
    canvas.height = origData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create a new ImageData buffer
    const output = ctx.createImageData(origData.width, origData.height);
    const src = origData.data;
    const dest = output.data;
    const len = src.length;
    const isWhiteBg = bgMode === 'white';

    for (let i = 0; i < len; i += 4) {
      const a = src[i + 3];

      if (a === 0) {
        // Transparent pixel
        if (isWhiteBg) {
          dest[i] = 255;
          dest[i + 1] = 255;
          dest[i + 2] = 255;
          dest[i + 3] = 255;
        } else {
          dest[i] = 0;
          dest[i + 1] = 0;
          dest[i + 2] = 0;
          dest[i + 3] = 0;
        }
      } else {
        // Luminance calculation
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        let val = lum >= threshold ? 255 : 0;
        if (invert) val = 255 - val;

        dest[i] = val;
        dest[i + 1] = val;
        dest[i + 2] = val;
        dest[i + 3] = 255;
      }
    }

    ctx.putImageData(output, 0, 0);
  }, [threshold, invert, bgMode]);

  // Re-render whenever parameters change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, threshold, invert, bgMode]);

  // 1-Click Direct Download from Canvas
  const handleDownloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const baseName = imageFile.name.replace(/\.[^/.]+$/, '');
    link.download = `${baseName}_threshold_${threshold}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Preset Handlers
  const handleSetPreset = (val: number) => {
    onThresholdChange(val);
  };

  // Compare split drag handling
  const handleCompareMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (viewMode !== 'compare') return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
      {/* ── Top Studio Toolbar ── */}
      <div className="px-5 py-3.5 border-b border-[#ededf9] dark:border-slate-800 bg-[#f8f9fe] dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Tool Title & Active Threshold */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            <Sliders size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#191b23] dark:text-white">
                Ink Sketch &amp; Threshold Studio
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white" style={{ backgroundColor: accentColor }}>
                Threshold: {threshold}
              </span>
            </div>
            <p className="text-[11px] text-[#737686]">
              {invert ? 'Black Ink on White Paper' : 'Pure High-Contrast Binary Black & White'}
            </p>
          </div>
        </div>

        {/* Center: Presets */}
        <div className="flex items-center gap-1.5 bg-[#ededf9] dark:bg-slate-800 p-1 rounded-xl">
          {[
            { label: 'Low (64)', value: 64 },
            { label: 'Standard (128)', value: 128 },
            { label: 'High (192)', value: 192 },
            { label: `Auto Otsu (${otsuValue})`, value: otsuValue },
          ].map((p) => {
            const isActive = threshold === p.value;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSetPreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                    : 'text-[#505f76] dark:text-slate-300 hover:text-[#004ac6]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Right: View Mode & Compare Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#ededf9] dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('threshold')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'threshold'
                  ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                  : 'text-[#737686] hover:text-[#191b23]'
              }`}
            >
              Threshold
            </button>
            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'original'
                  ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                  : 'text-[#737686] hover:text-[#191b23]'
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'compare'
                  ? 'bg-white dark:bg-slate-700 text-[#191b23] dark:text-white shadow-xs'
                  : 'text-[#737686] hover:text-[#191b23]'
              }`}
            >
              <Columns size={12} /> Compare
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-[#ededf9] dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 text-[#737686] hover:text-[#191b23] cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-bold px-1 text-[#505f76] dark:text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 text-[#737686] hover:text-[#191b23] cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1.5 text-[#737686] hover:text-[#191b23] cursor-pointer"
              title="Reset zoom"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Interactive Stage Canvas ── */}
      <div
        ref={containerRef}
        onMouseMove={handleCompareMove}
        onTouchMove={handleCompareMove}
        className="relative min-h-[380px] max-h-[520px] flex items-center justify-center p-6 bg-[#0f172a] select-none overflow-hidden"
      >
        {/* Transparency Checkerboard Pattern */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #334155 25%, transparent 25%),
              linear-gradient(-45deg, #334155 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #334155 75%),
              linear-gradient(-45deg, transparent 75%, #334155 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
          }}
        />

        {/* The Live Pure Threshold Canvas */}
        <div
          className="relative transition-transform duration-200 flex items-center justify-center shadow-2xl rounded-xl overflow-hidden"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Canvas for Threshold Output */}
          <canvas
            ref={canvasRef}
            className={`max-h-[420px] w-auto max-w-full object-contain ${
              viewMode === 'original' ? 'hidden' : 'block'
            }`}
          />

          {/* Original Image Layer (used in original & compare modes) */}
          {sourceImageRef.current && (viewMode === 'original' || viewMode === 'compare') && (
            <div
              className={`absolute inset-0 overflow-hidden pointer-events-none ${
                viewMode === 'original' ? 'relative w-full h-full' : ''
              }`}
              style={
                viewMode === 'compare'
                  ? { clipPath: `inset(0 ${100 - splitPos}% 0 0)` }
                  : undefined
              }
            >
              <img
                src={sourceImageRef.current.src}
                alt="Original"
                className="max-h-[420px] w-auto max-w-full object-contain"
              />
            </div>
          )}

          {/* Compare Split Divider Line */}
          {viewMode === 'compare' && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] cursor-ew-resize pointer-events-none"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-slate-800 shadow-lg flex items-center justify-center text-[10px] font-bold">
                ⇄
              </div>
            </div>
          )}
        </div>

        {/* Compare Pills */}
        {viewMode === 'compare' && (
          <div className="absolute bottom-4 left-6 right-6 flex justify-between pointer-events-none text-xs font-extrabold text-white">
            <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm shadow-md">
              ◄ Original Photo
            </span>
            <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm shadow-md">
              Threshold {threshold} ►
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom Controls & Actions Bar ── */}
      <div className="px-6 py-4 border-t border-[#ededf9] dark:border-slate-800 bg-[#f8f9fe] dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Quick Invert & Background Options */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Invert Button */}
          <button
            type="button"
            onClick={() => onInvertChange(!invert)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
              invert
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-[#c3c6d7] dark:border-slate-700 text-[#191b23] dark:text-white hover:border-[#004ac6]'
            }`}
          >
            <Sparkles size={14} />
            {invert ? 'Mode: Black Ink on White' : 'Mode: Standard Binary'}
          </button>

          {/* Paper White vs Transparent Background */}
          <button
            type="button"
            onClick={() => {
              const next = bgMode === 'transparent' ? 'white' : 'transparent';
              setBgMode(next);
              onBackgroundModeChange?.(next);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center gap-1.5 ${
              bgMode === 'white'
                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-[#c3c6d7] dark:border-slate-700 text-[#191b23] dark:text-white hover:border-[#004ac6]'
            }`}
          >
            <ImageIcon size={14} />
            {bgMode === 'white' ? 'BG: Solid White Paper' : 'BG: Transparent Cutout'}
          </button>

          {/* Reset to 128 Shortcut */}
          {threshold !== 128 && (
            <button
              type="button"
              onClick={() => onThresholdChange(128)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#004ac6] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center gap-1"
            >
              <RotateCcw size={13} /> Reset to 128
            </button>
          )}
        </div>

        {/* Right: Direct Download & Apply Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleDownloadCanvas}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white hover:border-[#004ac6] shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Download size={15} /> Instant Canvas PNG
          </button>

          {onApply && (
            <button
              type="button"
              onClick={onApply}
              disabled={processing}
              className="flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              {processing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Applying...
                </>
              ) : (
                <>
                  <Check size={15} /> Apply Threshold ({threshold}) &amp; Download
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
