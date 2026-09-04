/**
 * Professional Interactive Visual Image Cropper Component
 * Features:
 * - 8 Draggable Resize Handles (4 corners + 4 edges)
 * - Moveable crop box with pointer drag
 * - Rule-of-thirds 3x3 composition grid
 * - Instant Aspect Ratio Presets (Freeform, 1:1 Square, 16:9 Landscape, 9:16 Story, 4:3 Standard)
 * - Live resolution dimension badge (e.g. 800 × 800 px)
 * - Optimized with ref callbacks to prevent React render loops
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop as CropIcon, RotateCcw, Sparkles, Check, Move, Maximize2,
  Smartphone, Monitor, Square, Image as ImageIcon
} from 'lucide-react';

interface VisualImageCropperProps {
  imageFile?: File | null;
  sampleImageUrl?: string;
  onCropChange: (cropParams: { left: number; top: number; width: number; height: number }) => void;
  accentColor?: string;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function VisualImageCropper({
  imageFile,
  sampleImageUrl,
  onCropChange,
  accentColor = '#00A3C4',
}: VisualImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('free');

  // Normalized crop box coordinates relative to natural image dimensions (0.0 to 1.0)
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.15,
    y: 0.15,
    w: 0.7,
    h: 0.7,
  });

  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [dragStart, setDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
  }>({ mouseX: 0, mouseY: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  // Store onCropChange in ref to prevent infinite re-renders
  const onCropChangeRef = useRef(onCropChange);
  useEffect(() => {
    onCropChangeRef.current = onCropChange;
  }, [onCropChange]);

  // Load image object from File or sampleImageUrl or generate sample image
  useEffect(() => {
    if (sampleImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageObj(img);
        setCrop({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
      };
      img.src = sampleImageUrl;
      return;
    }
    if (!imageFile) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageObj(img);
        setCrop({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
      };
      // High-resolution SVG geometric landscape sample
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#334155" />
          </linearGradient>
          <linearGradient id="mountain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#00A3C4" />
            <stop offset="100%" stop-color="#004ac6" />
          </linearGradient>
          <linearGradient id="sun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#sky)" />
        <circle cx="950" cy="220" r="110" fill="url(#sun)" />
        <polygon points="100,800 450,300 800,800" fill="url(#mountain)" opacity="0.9" />
        <polygon points="500,800 850,220 1200,800" fill="#2563eb" opacity="0.8" />
        <polygon points="0,800 250,450 600,800" fill="#0284c7" opacity="0.85" />
        <text x="600" y="720" fill="#ffffff" font-size="36" font-family="sans-serif" font-weight="bold" text-anchor="middle">Interactive Visual Canvas — Drag handles to crop</text>
      </svg>`;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      setCrop({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Update parent parameters when crop changes
  useEffect(() => {
    if (!imageObj) return;
    const naturalWidth = imageObj.naturalWidth || 1200;
    const naturalHeight = imageObj.naturalHeight || 800;

    const left = Math.max(0, Math.round(crop.x * naturalWidth));
    const top = Math.max(0, Math.round(crop.y * naturalHeight));
    const width = Math.max(1, Math.round(crop.w * naturalWidth));
    const height = Math.max(1, Math.round(crop.h * naturalHeight));

    onCropChangeRef.current?.({ left, top, width, height });
  }, [crop, imageObj]);

  // Render canvas with image, dark mask, grid lines, and 8 control handles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = Math.min(containerRef.current.clientWidth || 600, 750);
    const scale = Math.min(containerWidth / imageObj.naturalWidth, 420 / imageObj.naturalHeight, 1);

    const displayWidth = Math.round(imageObj.naturalWidth * scale);
    const displayHeight = Math.round(imageObj.naturalHeight * scale);

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // 1. Draw original image
    ctx.drawImage(imageObj, 0, 0, displayWidth, displayHeight);

    // 2. Draw dark semi-transparent mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Calculate crop rectangle on canvas display coordinates
    const cx = Math.round(crop.x * displayWidth);
    const cy = Math.round(crop.y * displayHeight);
    const cw = Math.round(crop.w * displayWidth);
    const ch = Math.round(crop.h * displayHeight);

    // 3. Clear crop area (show selected region in full brightness)
    ctx.drawImage(
      imageObj,
      crop.x * imageObj.naturalWidth,
      crop.y * imageObj.naturalHeight,
      crop.w * imageObj.naturalWidth,
      crop.h * imageObj.naturalHeight,
      cx,
      cy,
      cw,
      ch
    );

    // 4. Draw rule-of-thirds 3x3 grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(cx + cw / 3, cy);
    ctx.lineTo(cx + cw / 3, cy + ch);
    ctx.moveTo(cx + (cw * 2) / 3, cy);
    ctx.lineTo(cx + (cw * 2) / 3, cy + ch);
    ctx.moveTo(cx, cy + ch / 3);
    ctx.lineTo(cx + cw, cy + ch / 3);
    ctx.moveTo(cx, cy + (ch * 2) / 3);
    ctx.lineTo(cx + cw, cy + (ch * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw crop border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    // 6. Draw 8 interactive handles
    const handleSize = 10;
    const handles = [
      { id: 'nw', x: cx, y: cy },
      { id: 'ne', x: cx + cw, y: cy },
      { id: 'sw', x: cx, y: cy + ch },
      { id: 'se', x: cx + cw, y: cy + ch },
      { id: 'n', x: cx + cw / 2, y: cy },
      { id: 's', x: cx + cw / 2, y: cy + ch },
      { id: 'w', x: cx, y: cy + ch / 2 },
      { id: 'e', x: cx + cw, y: cy + ch / 2 },
    ];

    handles.forEach((h) => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

  }, [imageObj, crop, accentColor]);

  // Determine which handle was clicked
  const getHandleAt = (x: number, y: number, displayW: number, displayH: number): DragHandle => {
    const cx = crop.x * displayW;
    const cy = crop.y * displayH;
    const cw = crop.w * displayW;
    const ch = crop.h * displayH;
    const threshold = 14;

    if (Math.hypot(x - cx, y - cy) <= threshold) return 'nw';
    if (Math.hypot(x - (cx + cw), y - cy) <= threshold) return 'ne';
    if (Math.hypot(x - cx, y - (cy + ch)) <= threshold) return 'sw';
    if (Math.hypot(x - (cx + cw), y - (cy + ch)) <= threshold) return 'se';

    if (Math.abs(y - cy) <= threshold && x >= cx && x <= cx + cw) return 'n';
    if (Math.abs(y - (cy + ch)) <= threshold && x >= cx && x <= cx + cw) return 's';
    if (Math.abs(x - cx) <= threshold && y >= cy && y <= cy + ch) return 'w';
    if (Math.abs(x - (cx + cw)) <= threshold && y >= cy && y <= cy + ch) return 'e';

    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return 'move';

    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = getHandleAt(x, y, canvas.width, canvas.height);
    if (!handle) return;

    canvas.setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    setDragStart({
      mouseX: x / canvas.width,
      mouseY: y / canvas.height,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / canvas.width;
    const currentY = (e.clientY - rect.top) / canvas.height;

    if (!activeHandle) {
      const handle = getHandleAt(e.clientX - rect.left, e.clientY - rect.top, canvas.width, canvas.height);
      if (handle === 'move') canvas.style.cursor = 'move';
      else if (handle === 'nw' || handle === 'se') canvas.style.cursor = 'nwse-resize';
      else if (handle === 'ne' || handle === 'sw') canvas.style.cursor = 'nesw-resize';
      else if (handle === 'n' || handle === 's') canvas.style.cursor = 'ns-resize';
      else if (handle === 'w' || handle === 'e') canvas.style.cursor = 'ew-resize';
      else canvas.style.cursor = 'default';
      return;
    }

    const dx = currentX - dragStart.mouseX;
    const dy = currentY - dragStart.mouseY;

    let { cropX, cropY, cropW, cropH } = dragStart;

    if (activeHandle === 'move') {
      cropX = Math.max(0, Math.min(1 - cropW, cropX + dx));
      cropY = Math.max(0, Math.min(1 - cropH, cropY + dy));
    } else if (activeHandle === 'se') {
      cropW = Math.max(0.05, Math.min(1 - cropX, cropW + dx));
      cropH = Math.max(0.05, Math.min(1 - cropY, cropH + dy));
    } else if (activeHandle === 'nw') {
      const newX = Math.max(0, Math.min(cropX + cropW - 0.05, cropX + dx));
      const newY = Math.max(0, Math.min(cropY + cropH - 0.05, cropY + dy));
      cropW = cropW + (cropX - newX);
      cropH = cropH + (cropY - newY);
      cropX = newX;
      cropY = newY;
    } else if (activeHandle === 'ne') {
      const newY = Math.max(0, Math.min(cropY + cropH - 0.05, cropY + dy));
      cropW = Math.max(0.05, Math.min(1 - cropX, cropW + dx));
      cropH = cropH + (cropY - newY);
      cropY = newY;
    } else if (activeHandle === 'sw') {
      const newX = Math.max(0, Math.min(cropX + cropW - 0.05, cropX + dx));
      cropW = cropW + (cropX - newX);
      cropH = Math.max(0.05, Math.min(1 - cropY, cropH + dy));
      cropX = newX;
    } else if (activeHandle === 'e') {
      cropW = Math.max(0.05, Math.min(1 - cropX, cropW + dx));
    } else if (activeHandle === 'w') {
      const newX = Math.max(0, Math.min(cropX + cropW - 0.05, cropX + dx));
      cropW = cropW + (cropX - newX);
      cropX = newX;
    } else if (activeHandle === 's') {
      cropH = Math.max(0.05, Math.min(1 - cropY, cropH + dy));
    } else if (activeHandle === 'n') {
      const newY = Math.max(0, Math.min(cropY + cropH - 0.05, cropY + dy));
      cropH = cropH + (cropY - newY);
      cropY = newY;
    }

    setCrop({ x: cropX, y: cropY, w: cropW, h: cropH });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeHandle && canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    setActiveHandle(null);
  };

  // Preset aspect ratio handler
  const applyPreset = (preset: string) => {
    setAspectRatio(preset);
    if (!imageObj) return;

    const natW = imageObj.naturalWidth || 1200;
    const natH = imageObj.naturalHeight || 800;
    const imgRatio = natW / natH;

    if (preset === 'free') {
      setCrop({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
      return;
    }

    let targetRatio = 1;
    if (preset === '1:1') targetRatio = 1;
    else if (preset === '16:9') targetRatio = 16 / 9;
    else if (preset === '9:16') targetRatio = 9 / 16;
    else if (preset === '4:3') targetRatio = 4 / 3;

    let w = 0.75;
    let h = (w * imgRatio) / targetRatio;

    if (h > 0.85) {
      h = 0.85;
      w = (h * targetRatio) / imgRatio;
    }

    setCrop({
      x: Math.max(0, (1 - w) / 2),
      y: Math.max(0, (1 - h) / 2),
      w: Math.min(1, w),
      h: Math.min(1, h),
    });
  };

  const naturalWidth = imageObj?.naturalWidth || 1200;
  const naturalHeight = imageObj?.naturalHeight || 800;
  const pixelW = Math.round(crop.w * naturalWidth);
  const pixelH = Math.round(crop.h * naturalHeight);

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-6 shadow-sm">
      
      {/* Workspace Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CropIcon size={20} style={{ color: accentColor }} />
          <h3 className="text-sm font-bold text-[#191b23] dark:text-white">
            Interactive Visual Cropper
          </h3>
        </div>

        {/* Live Output Resolution Badge */}
        <div className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-[#00A3C4] border border-[#00A3C4]/30 shadow-2xs">
          Crop Box: {pixelW} × {pixelH} px
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
          <span className="text-slate-500 font-bold mr-1">Ratios:</span>
          {[
            { id: 'free', label: 'Freeform', icon: Maximize2 },
            { id: '1:1', label: '1:1 Square', icon: Square },
            { id: '16:9', label: '16:9 Landscape', icon: Monitor },
            { id: '9:16', label: '9:16 Story', icon: Smartphone },
            { id: '4:3', label: '4:3 Standard', icon: Maximize2 },
          ].map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => applyPreset(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  aspectRatio === r.id
                    ? 'bg-[#00A3C4] text-white font-bold shadow-xs'
                    : 'bg-[#ededf9] dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={12} />
                <span>{r.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => applyPreset('free')}
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* Interactive HTML5 Canvas Workspace */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center bg-slate-950/95 rounded-xl p-4 min-h-[340px] overflow-hidden relative shadow-inner select-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="rounded-lg shadow-2xl max-w-full touch-none"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Move size={14} /> Drag inside to reposition • Drag handles to resize
        </span>
        <span className="font-semibold">
          Original: {naturalWidth} × {naturalHeight} px
        </span>
      </div>

    </div>
  );
}
