/**
 * Interactive Side-by-Side Before/After Split Comparison Component
 * Visual interactive slider comparing original vs compressed/resized/filtered image.
 */

import React, { useState, useRef } from 'react';
import { Sliders, Sparkles, ArrowLeftRight } from 'lucide-react';

interface BeforeAfterCompareProps {
  originalFile: File;
  processedUrl?: string;
  accentColor?: string;
}

export function BeforeAfterCompare({ originalFile, processedUrl, accentColor = '#00A3C4' }: BeforeAfterCompareProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100 percentage
  const containerRef = useRef<HTMLDivElement | null>(null);

  const originalUrl = URL.createObjectURL(originalFile);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={20} style={{ color: accentColor }} />
          <h3 className="text-sm font-bold text-[#191b23] dark:text-white">
            Before / After Comparison
          </h3>
        </div>
        <div className="text-xs font-bold text-[#00A3C4]">
          Drag slider to compare quality
        </div>
      </div>

      {/* Interactive Split Screen Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full h-[320px] rounded-lg overflow-hidden cursor-ew-resize bg-slate-950/90 select-none"
      >
        {/* Original Image (Left Side) */}
        <img
          src={originalUrl}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Processed/Filtered Image (Right Side Overlay with Clip-Path) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
        >
          <img
            src={processedUrl || originalUrl}
            alt="Processed"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ filter: processedUrl ? 'none' : 'contrast(120%) brightness(105%)' }}
          />
        </div>

        {/* Split Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none flex items-center justify-center"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-8 h-8 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center font-bold text-xs">
            ↔
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded">
          ORIGINAL
        </div>
        <div className="absolute top-3 right-3 bg-[#00A3C4] text-white text-[10px] font-bold px-2.5 py-1 rounded shadow">
          PROCESSED
        </div>
      </div>
    </div>
  );
}
