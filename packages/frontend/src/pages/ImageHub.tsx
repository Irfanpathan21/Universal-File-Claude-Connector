/**
 * Screen 3 Specification: Image Tools Hub Screen (`/tools/image`)
 * Cyan Icon Badge, All 21 Interactive Image Tool Cards Left | Quick Upload Sidebar Right
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon, Maximize2, Minimize2, UserX, RefreshCw,
  Crop, Droplet, UploadCloud, ArrowRight, Sparkles, CheckCircle2,
  RotateCw, FlipHorizontal, EyeOff, Zap, Sliders, Sun, Info,
  ShieldCheck, Layers, Contrast, SlidersHorizontal, Palette, Scissors, Search
} from 'lucide-react';
import { tools as ALL_TOOLS } from '@uft/shared';

const TOOL_ICON_MAP: Record<string, any> = {
  resize_image: Maximize2,
  crop_image: Crop,
  rotate_image: RotateCw,
  flip_image: FlipHorizontal,
  compress_image: Minimize2,
  convert_image: RefreshCw,
  image_blur: EyeOff,
  image_sharpen: Zap,
  image_adjust: Sliders,
  image_grayscale: Palette,
  image_metadata: Info,
  remove_exif: ShieldCheck,
  generate_thumbnail: ImageIcon,
  batch_resize: Layers,
  watermark_image: Droplet,
  remove_bg: UserX,
  invert_image: Contrast,
  gamma_image: Sun,
  threshold_image: SlidersHorizontal,
  dominant_colors: Palette,
  trim_transparent_edges: Scissors,
};

export function ImageHub() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  const allImageTools = ALL_TOOLS.filter((t) => t.category === 'image');
  const imageTools = allImageTools.filter((t) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedImage(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-8 py-2">
      
      {/* 2-Column Layout (grid lg:grid-cols-12 gap-6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Span 8): Category Header & Tools Grid */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Category Header */}
          <div className="space-y-4 pb-4 border-b border-[#c3c6d7]/60 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#00A3C4]/10 text-[#00A3C4] flex items-center justify-center flex-shrink-0 animate-pulse">
                  <ImageIcon size={36} />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191b23] dark:text-white tracking-tight">
                    Image Tools ({allImageTools.length})
                  </h1>
                  <p className="text-sm text-[#434655] dark:text-slate-400 mt-1">
                    Enhance, convert, and optimize your images with all {allImageTools.length} precision tools.
                  </p>
                </div>
              </div>
            </div>

            {/* In-Category Search */}
            <div className="relative pt-2">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search among all ${allImageTools.length} image tools...`}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 shadow-xs focus:ring-2 focus:ring-[#00A3C4]"
              />
            </div>
          </div>

          {/* Tools Grid (grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageTools.map((tool) => {
              const ToolIcon = TOOL_ICON_MAP[tool.id] || ImageIcon;

              return (
                <Link
                  key={tool.id}
                  to={`/tools/${tool.id}`}
                  className="group flex flex-col justify-between bg-white dark:bg-slate-900 p-5 rounded-xl border border-[#c3c6d7] dark:border-slate-800 hover:scale-[1.02] hover:border-[#00A3C4]/50 hover:shadow-md transition-all duration-200 no-underline"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#00A3C4]/10 text-[#00A3C4] flex items-center justify-center font-bold">
                      <ToolIcon size={20} />
                    </div>
                    <h3 className="text-sm font-bold text-[#191b23] dark:text-white group-hover:text-[#00A3C4] transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#434655] dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#ededf9] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#00A3C4] group-hover:translate-x-1 transition-transform">
                    <span>Open Tool</span>
                    <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>

        </div>

        {/* Right Column: Quick Upload Sidebar (Span 4) */}
        <div className="lg:col-span-4 sticky top-24">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-[#c3c6d7] dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#191b23] dark:text-white">
                Quick Upload
              </h3>
              <p className="text-xs text-[#434655] dark:text-slate-400 mt-0.5">
                Drop an image here. We'll suggest the best tools.
              </p>
            </div>

            {/* Dashed Upload Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer bg-[#faf8ff] dark:bg-slate-800/40 ${
                isDragOver ? 'border-[#00A3C4] bg-cyan-50/50' : 'border-[#c3c6d7] hover:border-[#00A3C4]'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              {!uploadedImage ? (
                <div className="space-y-3">
                  <UploadCloud size={32} className="mx-auto text-[#00A3C4]" />
                  <p className="text-xs font-bold text-[#191b23] dark:text-white">
                    Drag & drop files or browse files
                  </p>

                  {/* Format Pills */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <span className="bg-[#00A3C4]/10 text-[#00A3C4] text-[10px] font-bold px-2 py-0.5 rounded">JPG</span>
                    <span className="bg-[#00A3C4]/10 text-[#00A3C4] text-[10px] font-bold px-2 py-0.5 rounded">PNG</span>
                    <span className="bg-[#00A3C4]/10 text-[#00A3C4] text-[10px] font-bold px-2 py-0.5 rounded">WEBP</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 z-20 relative text-center">
                  <CheckCircle2 size={28} className="mx-auto text-[#00A3C4]" />
                  <span className="text-xs font-bold text-[#191b23] dark:text-white truncate block">
                    {uploadedImage.name}
                  </span>
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="text-[11px] text-red-500 font-semibold hover:underline"
                  >
                    Change Image
                  </button>
                </div>
              )}
            </div>

            {/* Smart Suggestions Panel */}
            {uploadedImage && (
              <div className="space-y-2 pt-2 border-t border-[#ededf9] dark:border-slate-800">
                <div className="flex items-center gap-1 text-xs font-bold text-[#00A3C4]">
                  <Sparkles size={14} /> Smart Tool Suggestions
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => navigate('/tools/remove_bg')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between cursor-pointer"
                  >
                    <span>Remove Background with AI</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => navigate('/tools/crop_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between cursor-pointer"
                  >
                    <span>Crop Image (8-Point)</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => navigate('/tools/compress_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between cursor-pointer"
                  >
                    <span>Compress to -50% size</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => navigate('/tools/convert_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between cursor-pointer"
                  >
                    <span>Convert to WEBP format</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => navigate('/tools/resize_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between cursor-pointer"
                  >
                    <span>Resize Dimensions</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
