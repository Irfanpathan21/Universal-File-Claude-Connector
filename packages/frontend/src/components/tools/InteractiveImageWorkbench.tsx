/**
 * Interactive Image Workbench Component
 * Provides a live, direct-manipulation visual canvas for all image tools:
 * - rotate_image, flip_image
 * - compress_image (live estimated savings)
 * - resize_image (live dimension overlays)
 * - convert_image (format badges)
 * - image_blur, image_sharpen, image_adjust, gamma_image, grayscale_image, invert_image
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut,
  Maximize2, Eye, Sparkles, Sliders, Check
} from 'lucide-react';

interface InteractiveImageWorkbenchProps {
  imageFile: File;
  toolId: string;
  params: Record<string, string>;
  accentColor?: string;
  onRotate?: (angle: string) => void;
  onFlip?: (direction: string) => void;
}

export function InteractiveImageWorkbench({
  imageFile,
  toolId,
  params,
  accentColor = '#00A3C4',
  onRotate,
  onFlip,
}: InteractiveImageWorkbenchProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load preview URL
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Compute CSS transforms based on tool and params
  let rotationAngle = 0;
  if (toolId === 'rotate_image') {
    rotationAngle = parseInt(params.angle || '90', 10) || 0;
  }

  let scaleX = 1;
  let scaleY = 1;
  if (toolId === 'flip_image') {
    if (params.direction === 'horizontal' || params.direction === 'both') scaleX = -1;
    if (params.direction === 'vertical' || params.direction === 'both') scaleY = -1;
  }

  // Compute CSS filter string
  let filterStr = 'none';
  if (!showOriginal) {
    if (toolId === 'image_blur') {
      const sigma = parseFloat(params.sigma || '5');
      filterStr = `blur(${Math.min(sigma * 0.8, 20)}px)`;
    } else if (toolId === 'image_sharpen') {
      const sigma = parseFloat(params.sigma || '2');
      filterStr = `contrast(${1 + sigma * 0.15}) saturate(${1 + sigma * 0.1})`;
    } else if (toolId === 'image_adjust') {
      const brightness = parseFloat(params.brightness || '1');
      const saturation = parseFloat(params.saturation || '1');
      filterStr = `brightness(${brightness}) saturate(${saturation})`;
    } else if (toolId === 'gamma_image') {
      const gamma = parseFloat(params.gamma || '2.2');
      filterStr = `contrast(${Math.min(gamma * 0.6, 2.5)})`;
    } else if (toolId === 'grayscale_image') {
      filterStr = 'grayscale(100%)';
    } else if (toolId === 'invert_image') {
      filterStr = 'invert(100%)';
    } else if (toolId === 'edge_detection') {
      filterStr = 'contrast(200%) grayscale(100%)';
    }
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Quick rotation triggers
  const handleQuickRotateCW = () => {
    const current = parseInt(params.angle || '0', 10);
    const next = ((current + 90) % 360).toString();
    if (onRotate) onRotate(next);
  };

  const handleQuickRotateCCW = () => {
    const current = parseInt(params.angle || '0', 10);
    const next = ((current - 90 + 360) % 360).toString();
    if (onRotate) onRotate(next);
  };

  const handleQuickFlipH = () => {
    const next = params.direction === 'horizontal' ? 'none' : 'horizontal';
    if (onFlip) onFlip(next);
  };

  const handleQuickFlipV = () => {
    const next = params.direction === 'vertical' ? 'none' : 'vertical';
    if (onFlip) onFlip(next);
  };

  // Estimated savings for compress
  let estimatedSavings = 50;
  if (toolId === 'compress_image') {
    const q = parseInt(params.quality || '80', 10);
    estimatedSavings = Math.max(10, Math.min(85, Math.round((100 - q) * 1.2 + 20)));
  }
  const estSizeMb = ((imageFile.size * (1 - estimatedSavings / 100)) / (1024 * 1024)).toFixed(2);
  const origSizeMb = (imageFile.size / (1024 * 1024)).toFixed(2);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
      {/* Workbench Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#f8f9fe] dark:bg-slate-800/80 border-b border-[#ededf9] dark:border-slate-800">
        {/* File & Dimension Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-[#c3c6d7]/70 dark:border-slate-700 text-[#191b23] dark:text-white truncate max-w-[180px]">
            {imageFile.name}
          </span>
          {dimensions && (
            <span className="hidden sm:inline-flex px-2 py-1 rounded-md text-[11px] font-semibold bg-[#e8edff] dark:bg-slate-800 text-[#004ac6] dark:text-blue-400">
              {dimensions.width} × {dimensions.height} px
            </span>
          )}
          <span className="text-[11px] font-medium text-[#737686]">
            {origSizeMb} MB
          </span>
        </div>

        {/* Quick Toolbar Action Buttons */}
        <div className="flex items-center gap-1.5">
          {toolId === 'rotate_image' && (
            <>
              <button
                type="button"
                onClick={handleQuickRotateCCW}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-[#434655] dark:text-slate-300 hover:text-[#004ac6] cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-xs"
                title="Rotate 90° Left"
              >
                <RotateCcw size={14} /> 90° Left
              </button>
              <button
                type="button"
                onClick={handleQuickRotateCW}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-[#434655] dark:text-slate-300 hover:text-[#004ac6] cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-xs"
                title="Rotate 90° Right"
              >
                <RotateCw size={14} /> 90° Right
              </button>
            </>
          )}

          {toolId === 'flip_image' && (
            <>
              <button
                type="button"
                onClick={handleQuickFlipH}
                className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-xs transition-all ${
                  params.direction === 'horizontal'
                    ? 'bg-[#004ac6] text-white border-[#004ac6]'
                    : 'bg-white dark:bg-slate-900 border-[#c3c6d7] dark:border-slate-700 text-[#434655] dark:text-slate-300'
                }`}
              >
                <FlipHorizontal size={14} /> Flip ↔
              </button>
              <button
                type="button"
                onClick={handleQuickFlipV}
                className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-xs transition-all ${
                  params.direction === 'vertical'
                    ? 'bg-[#004ac6] text-white border-[#004ac6]'
                    : 'bg-white dark:bg-slate-900 border-[#c3c6d7] dark:border-slate-700 text-[#434655] dark:text-slate-300'
                }`}
              >
                <FlipVertical size={14} /> Flip ↕
              </button>
            </>
          )}

          {/* Compare Original Button for filters */}
          {['image_blur', 'image_sharpen', 'image_adjust', 'gamma_image', 'grayscale_image', 'invert_image'].includes(toolId) && (
            <button
              type="button"
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] cursor-pointer flex items-center gap-1 shadow-xs"
              title="Hold to see original"
            >
              <Eye size={14} /> {showOriginal ? 'Showing Original' : 'Hold for Original'}
            </button>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#737686] cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-bold px-1 text-[#434655] dark:text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#737686] cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[#737686] cursor-pointer border-l border-slate-200 dark:border-slate-700"
              title="Reset Zoom"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage Area */}
      <div className="relative min-h-[360px] max-h-[500px] flex items-center justify-center p-6 bg-[#f0f2f8] dark:bg-slate-950 overflow-auto select-none">
        {/* Subtle Checkered Transparency Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* The Live Interactive Image */}
        {imageUrl && (
          <div
            className="transition-transform duration-300 ease-out flex items-center justify-center shadow-lg rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10"
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Preview"
              onLoad={handleImageLoad}
              className="max-h-[380px] w-auto max-w-full object-contain transition-all duration-300 pointer-events-none"
              style={{
                transform: `rotate(${rotationAngle}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
                filter: filterStr,
              }}
            />
          </div>
        )}

        {/* Visual Live Watermark Pill/Indicator */}
        {rotationAngle !== 0 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold shadow-md">
            Rotated {rotationAngle}°
          </div>
        )}
      </div>

      {/* Live Feedback Footer for Compress/Convert/Resize */}
      {toolId === 'compress_image' && (
        <div className="px-5 py-3 bg-[#e8f5e9] dark:bg-emerald-950/40 border-t border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Estimated Compression: ~{estimatedSavings}% savings
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-slate-500 line-through">{origSizeMb} MB</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">➔ ~{estSizeMb} MB</span>
          </div>
        </div>
      )}

      {toolId === 'convert_image' && (
        <div className="px-5 py-3 bg-[#eef2ff] dark:bg-indigo-950/40 border-t border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
            <span>Converting to:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white uppercase text-[10px] tracking-wider">
              {params.format || 'webp'}
            </span>
          </div>
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
            Quality: {params.quality || '90'}%
          </span>
        </div>
      )}

      {toolId === 'resize_image' && dimensions && (
        <div className="px-5 py-3 bg-[#eff6ff] dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
          <span className="text-blue-900 dark:text-blue-200 font-medium">
            Original: <strong className="font-bold">{dimensions.width} × {dimensions.height}</strong> px
          </span>
          <span className="text-blue-700 dark:text-blue-300 font-bold">
            Target: {params.width || '1920'} × {params.height || '1080'} px
          </span>
        </div>
      )}
    </div>
  );
}
