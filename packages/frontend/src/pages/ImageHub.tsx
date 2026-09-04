/**
 * Screen 3 Specification: Image Tools Hub Screen (`/tools/image`)
 * Cyan Icon Badge, 6 Interactive Tool Cards Left | Quick Upload Sidebar Right
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon, Maximize2, Minimize2, UserX, RefreshCw,
  Crop, Droplet, UploadCloud, ArrowRight, Sparkles, CheckCircle2
} from 'lucide-react';

const IMAGE_TOOLS = [
  {
    id: 'resize_image',
    name: 'Resize Image',
    icon: Maximize2,
    description: 'Change dimensions while maintaining aspect ratio perfectly.',
  },
  {
    id: 'compress_image',
    name: 'Compress Image',
    icon: Minimize2,
    description: 'Reduce file size intelligently without losing visual quality.',
  },
  {
    id: 'remove_bg',
    name: 'Remove BG',
    icon: UserX,
    description: 'AI-powered background removal for portraits and objects.',
  },
  {
    id: 'convert_image',
    name: 'Convert to WebP',
    icon: RefreshCw,
    description: 'Optimize images for the web with modern WebP formatting.',
  },
  {
    id: 'crop_image',
    name: 'Crop Image',
    icon: Crop,
    description: 'Trim unwanted edges and focus on the main subject.',
  },
  {
    id: 'watermark_image',
    name: 'Watermark',
    icon: Droplet,
    description: 'Add text or image watermarks to protect your assets.',
  },
];

export function ImageHub() {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

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
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#00A3C4]/10 text-[#00A3C4] flex items-center justify-center flex-shrink-0 animate-pulse">
                <ImageIcon size={36} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191b23] dark:text-white tracking-tight">
                  Image Tools
                </h1>
                <p className="text-sm text-[#434655] dark:text-slate-400 mt-1">
                  Enhance, convert, and optimize your images with precision.
                </p>
              </div>
            </div>
          </div>

          {/* Tools Grid (grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {IMAGE_TOOLS.map((tool) => {
              const ToolIcon = tool.icon;

              return (
                <Link
                  key={tool.id}
                  to={`/tools/${tool.id}`}
                  className="group flex flex-col justify-between bg-white dark:bg-slate-900 p-6 rounded-xl border border-[#c3c6d7] dark:border-slate-800 hover:scale-[1.02] hover:border-[#00A3C4]/50 hover:shadow-md transition-all duration-200 no-underline"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[#00A3C4]/10 text-[#00A3C4] flex items-center justify-center font-bold">
                      <ToolIcon size={22} />
                    </div>
                    <h3 className="text-base font-bold text-[#191b23] dark:text-white group-hover:text-[#00A3C4] transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#434655] dark:text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#ededf9] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#00A3C4] group-hover:translate-x-1 transition-transform">
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
                    onClick={() => navigate('/tools/compress_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between"
                  >
                    <span>Compress to -50% size</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => navigate('/tools/convert_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between"
                  >
                    <span>Convert to WEBP format</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => navigate('/tools/resize_image')}
                    className="w-full text-left p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs font-bold text-[#00A3C4] hover:bg-cyan-100 flex items-center justify-between"
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
