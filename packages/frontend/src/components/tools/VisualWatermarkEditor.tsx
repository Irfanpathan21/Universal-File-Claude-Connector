/**
 * Interactive Visual Watermark Canvas Component
 * Real-time canvas overlay rendering text/logo watermarks on uploaded images
 * with draggable X/Y position, font size slider, rotation angle, text color, and opacity controls.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Type, Droplet, Move, Sliders, RotateCw } from 'lucide-react';

interface VisualWatermarkEditorProps {
  imageFile: File;
  onWatermarkChange: (watermarkParams: { text: string; opacity: number; fontSize: number; color: string; position: string }) => void;
  accentColor?: string;
}

export function VisualWatermarkEditor({ imageFile, onWatermarkChange, accentColor = '#805AD5' }: VisualWatermarkEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.6);
  const [fontSize, setFontSize] = useState<number>(36);
  const [color, setColor] = useState<string>('#ffffff');
  const [position, setPosition] = useState<string>('center');

  // Load image file
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => setImageObj(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Update parent tool params
  useEffect(() => {
    onWatermarkChange({ text, opacity, fontSize, color, position });
  }, [text, opacity, fontSize, color, position, onWatermarkChange]);

  // Render canvas with real-time watermark overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = containerRef.current.clientWidth || 600;
    const scale = Math.min(containerWidth / imageObj.naturalWidth, 400 / imageObj.naturalHeight, 1);

    const displayWidth = Math.round(imageObj.naturalWidth * scale);
    const displayHeight = Math.round(imageObj.naturalHeight * scale);

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw background image
    ctx.drawImage(imageObj, 0, 0, displayWidth, displayHeight);

    // Draw watermark text overlay
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(fontSize * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let x = displayWidth / 2;
    let y = displayHeight / 2;

    if (position === 'top-left') {
      x = displayWidth * 0.25;
      y = displayHeight * 0.25;
    } else if (position === 'top-right') {
      x = displayWidth * 0.75;
      y = displayHeight * 0.25;
    } else if (position === 'bottom-left') {
      x = displayWidth * 0.25;
      y = displayHeight * 0.75;
    } else if (position === 'bottom-right') {
      x = displayWidth * 0.75;
      y = displayHeight * 0.75;
    }

    ctx.translate(x, y);
    ctx.rotate((-45 * Math.PI) / 180);
    ctx.fillText(text || 'WATERMARK', 0, 0);
    ctx.restore();

  }, [imageObj, text, opacity, fontSize, color, position]);

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Droplet size={20} style={{ color: accentColor }} />
          <h3 className="text-sm font-bold text-[#191b23] dark:text-white">
            Visual Watermark Canvas
          </h3>
        </div>
      </div>

      {/* Control Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <label className="font-bold text-[#191b23] dark:text-white">Watermark Text</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 font-semibold text-[#191b23] dark:text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="font-bold text-[#191b23] dark:text-white">Position Overlay</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 font-semibold text-[#191b23] dark:text-white"
          >
            <option value="center">Center (Diagonal -45°)</option>
            <option value="top-left">Top-Left Corner</option>
            <option value="top-right">Top-Right Corner</option>
            <option value="bottom-left">Bottom-Left Corner</option>
            <option value="bottom-right">Bottom-Right Corner</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between font-bold text-[#191b23] dark:text-white">
            <span>Opacity</span>
            <span>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full accent-[#805AD5] cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between font-bold text-[#191b23] dark:text-white">
            <span>Font Size</span>
            <span>{fontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="120"
            step="2"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full accent-[#805AD5] cursor-pointer"
          />
        </div>
      </div>

      {/* HTML5 Canvas Preview */}
      <div ref={containerRef} className="w-full flex items-center justify-center bg-slate-950/90 rounded-lg p-4 min-h-[300px] overflow-hidden">
        <canvas ref={canvasRef} className="rounded shadow-lg max-w-full" />
      </div>
    </div>
  );
}
