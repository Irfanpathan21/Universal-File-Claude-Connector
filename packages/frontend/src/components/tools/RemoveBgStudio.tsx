/**
 * Dedicated Remove.bg Studio Component
 * Replicates the exact workflow, design, and features of https://www.remove.bg:
 * - 100% Automatic removal upon upload
 * - Before / After comparison slider and tab switcher
 * - Classic transparency checkerboard canvas
 * - "Add Background" with solid color presets, custom color picker, and background blur
 * - High-speed download in full resolution
 * - Paste image (Ctrl+V) & 1-click sample images
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  UploadCloud, Download, Sparkles, RefreshCw, Check,
  Eye, ArrowLeftRight, Palette, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';
import { processTool, type ToolInfo } from '../../lib/api';

interface RemoveBgStudioProps {
  tool: ToolInfo;
}

const COLOR_PRESETS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Off-White', value: '#F8FAFC' },
  { name: 'Light Gray', value: '#E2E8F0' },
  { name: 'Dark Slate', value: '#1E293B' },
  { name: 'Black', value: '#000000' },
  { name: 'Crimson Red', value: '#EF4444' },
  { name: 'Vibrant Orange', value: '#F97316' },
  { name: 'Amber Gold', value: '#F59E0B' },
  { name: 'Emerald Green', value: '#10B981' },
  { name: 'Cyan Aqua', value: '#06B6D4' },
  { name: 'Sky Blue', value: '#0EA5E9' },
  { name: 'Royal Blue', value: '#3B82F6' },
  { name: 'Deep Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink Rose', value: '#EC4899' },
];

export function RemoveBgStudio({ tool: _tool }: RemoveBgStudioProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [cutoutUrl, setCutoutUrl] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [_error, setError] = useState<string | null>(null);

  // View & Customization States
  const [activeTab, setActiveTab] = useState<'cutout' | 'original' | 'slider'>('cutout');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [selectedBg, setSelectedBg] = useState<string>('transparent');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [blurLevel, setBlurLevel] = useState<number>(0); // 0, 8, 16, 28
  const [model, setModel] = useState<string>('u2net');
  const [format, setFormat] = useState<'png' | 'webp'>('png');
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef<boolean>(false);

  // Clean object URLs on change / unmount
  useEffect(() => {
    return () => {
      if (originalUrl && originalUrl.startsWith('blob:')) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  // Execute Background Removal automatically
  const runRemoval = useCallback(async (inputFile: File, targetModel: string, targetFormat: 'png' | 'webp') => {
    setIsProcessing(true);
    setError(null);
    if (inputFile.size === 0) {
      const warningMsg = 'The File You have uploaded is empty';
      setError(warningMsg);
      toast.warning(warningMsg);
      setIsProcessing(false);
      return;
    }

    try {
      const origUrl = URL.createObjectURL(inputFile);
      setOriginalUrl(origUrl);

      // Measure dimensions
      const img = new window.Image();
      img.onload = () => {
        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = origUrl;

      const res = await processTool('remove_bg', [inputFile], {
        model: targetModel,
        format: targetFormat,
      });

      if (res.outputFiles && res.outputFiles.length > 0) {
        const out = res.outputFiles[0];
        setCutoutUrl(out.downloadUrl);
        setDownloadFilename(out.name || `${inputFile.name.replace(/\.[^/.]+$/, '')}_no_bg.${targetFormat}`);
        toast.success('Background removed automatically!');
      } else {
        throw new Error('No output file returned from background removal service');
      }
    } catch (err: any) {
      console.error('Removal error:', err);
      const msg = err.message || 'Failed to remove background';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle incoming file selection
  const handleSelectFile = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    runRemoval(selectedFile, model, format);
  }, [model, format, runRemoval]);

  // Dropzone Setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleSelectFile(acceptedFiles[0]);
    }
  }, [handleSelectFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.avif'] },
    maxFiles: 1,
    multiple: false,
  });

  // Global Clipboard Paste Handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleSelectFile(blob);
            toast.info('Pasted image from clipboard!');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleSelectFile]);

  // Handle Model Change & Reprocess
  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    if (file) {
      runRemoval(file, newModel, format);
    }
  };

  // Slider Mouse/Touch Handlers
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  }, []);

  const onMouseDownSlider = () => {
    isDraggingSlider.current = true;
  };

  useEffect(() => {
    const onMouseUp = () => {
      isDraggingSlider.current = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider.current && e.touches.length > 0) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [handleSliderMove]);

  // Load Sample Images
  const handleLoadSample = (sampleType: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sampleType === 'ganesha') {
      ctx.fillStyle = '#22201e';
      ctx.fillRect(0, 0, 700, 700);

      ctx.beginPath();
      ctx.arc(350, 350, 320, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a8a';
      ctx.fill();
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#eab308';
      ctx.stroke();

      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(350, 310, 150, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('माझामोरया', 350, 520);
    } else if (sampleType === 'portrait') {
      const grad = ctx.createLinearGradient(0, 0, 0, 700);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#4ade80');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 700, 700);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(350, 260, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(350, 560, 180, 220, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sampleType === 'product') {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 700, 700);

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(200, 320, 300, 120, 30);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RUNNER PRO', 350, 395);
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 700, 700);
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(350, 350, 200, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const sampleFile = new File([blob], `${sampleType}-sample.png`, { type: 'image/png' });
        handleSelectFile(sampleFile);
      }
    });
  };

  // Download Output File with chosen background
  const handleDownload = async () => {
    if (!cutoutUrl) return;

    if (selectedBg === 'transparent' && blurLevel === 0) {
      const a = document.createElement('a');
      a.href = cutoutUrl;
      a.download = downloadFilename || 'cutout.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Downloaded transparent cutout!');
      return;
    }

    try {
      const cutoutImg = new window.Image();
      cutoutImg.crossOrigin = 'anonymous';

      const origImg = new window.Image();
      origImg.crossOrigin = 'anonymous';

      await Promise.all([
        new Promise((resolve, reject) => {
          cutoutImg.onload = resolve;
          cutoutImg.onerror = reject;
          cutoutImg.src = cutoutUrl;
        }),
        blurLevel > 0
          ? new Promise((resolve, reject) => {
              origImg.onload = resolve;
              origImg.onerror = reject;
              origImg.src = originalUrl;
            })
          : Promise.resolve(),
      ]);

      const w = cutoutImg.naturalWidth;
      const h = cutoutImg.naturalHeight;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;

      if (blurLevel > 0 && origImg.complete) {
        ctx.save();
        ctx.filter = `blur(${blurLevel}px)`;
        ctx.drawImage(origImg, -20, -20, w + 40, h + 40);
        ctx.restore();
      } else if (selectedBg !== 'transparent') {
        ctx.fillStyle = selectedBg === 'custom' ? customColor : selectedBg;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(cutoutImg, 0, 0, w, h);

      offCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = downloadFilename || 'cutout_custom.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Downloaded customized image!');
        }
      }, 'image/png');
    } catch (e: any) {
      console.error('Composite download error:', e);
      const a = document.createElement('a');
      a.href = cutoutUrl;
      a.download = downloadFilename || 'cutout.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const activeBackgroundColor = selectedBg === 'custom' ? customColor : selectedBg;

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: HERO UPLOAD SCREEN (when no image has been uploaded)
  // ──────────────────────────────────────────────────────────────────────────
  if (!file) {
    return (
      <div className="w-full max-w-5xl mx-auto py-8 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide">
            <Sparkles size={14} className="text-blue-600" />
            AI-POWERED BACKGROUND REMOVER
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Remove Image Background
          </h1>
          <p className="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-300">
            100% Automatically and <span className="text-blue-600 dark:text-blue-400 font-bold">Free</span>
          </p>
        </div>

        {/* Big Remove.bg Upload Card */}
        <div className="max-w-2xl mx-auto">
          <div
            {...getRootProps()}
            className={`relative overflow-hidden rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all border-3 border-dashed shadow-xl bg-white dark:bg-slate-900 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.02]'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:shadow-2xl'
            }`}
          >
            <input {...getInputProps()} />

            <div className="space-y-6 flex flex-col items-center justify-center">
              <button
                type="button"
                className="px-10 py-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
              >
                <UploadCloud size={26} strokeWidth={2.5} />
                Upload Image
              </button>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  or drop a file here, paste image (<kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs">Ctrl+V</kbd>)
                </p>
                <p className="text-xs text-slate-400">
                  Supports PNG, JPG, WEBP, AVIF • Up to 500 MB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Sample Images Bar */}
        <div className="text-center space-y-3 pt-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            No image? Try one of these:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { id: 'ganesha', label: '🕉️ Ganesha / Art' },
              { id: 'portrait', label: '👤 Portrait' },
              { id: 'product', label: '👟 Product' },
              { id: 'graphic', label: '🎨 Graphic' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleLoadSample(s.id)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:border-blue-300 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 max-w-4xl mx-auto">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
              ⚡
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Auto-Detection</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI immediately isolates people, products, animals, and artwork within seconds.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
              ✨
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Crisp Edges</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Deep neural segmentation captures fine hair, fur, transparent glass, and complex borders.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
              🎨
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Custom Backgrounds</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add solid colors, blur the original scene, or keep pure transparent alpha.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: PROCESSING STATE ("Removing background...")
  // ──────────────────────────────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 space-y-8 text-center">
        <div className="relative max-w-md mx-auto aspect-square rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {originalUrl && (
            <img
              src={originalUrl}
              alt="Original Preview"
              className="w-full h-full object-contain filter blur-[2px] opacity-70 scale-105"
            />
          )}

          {/* Animated Scanning Beam */}
          <motion.div
            className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_#3b82f6]"
            initial={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          />

          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center gap-4 text-white p-6">
            <RefreshCw size={36} className="animate-spin text-blue-400" />
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold tracking-tight">Removing Background...</h3>
              <p className="text-xs text-slate-300">
                AI is isolating foreground subjects with high precision
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: REMOVE.BG RESULT & EDIT STUDIO
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto py-4 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('cutout')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cutout'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Sparkles size={14} /> Removed Background
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('original')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'original'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Eye size={14} /> Original
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('slider')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'slider'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight size={14} /> Compare Slider
          </button>
        </div>

        {/* Right: Upload Another File */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setCutoutUrl('');
              setOriginalUrl('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <UploadCloud size={14} /> Upload Another Image
          </button>
        </div>
      </div>

      {/* Main Two-Column Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Big Interactive Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div
            ref={containerRef}
            className="relative w-full min-h-[460px] max-h-[620px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center select-none"
            style={{
              backgroundColor: selectedBg === 'transparent' ? undefined : activeBackgroundColor,
            }}
          >
            {/* Transparency Checkerboard Grid Background */}
            {selectedBg === 'transparent' && blurLevel === 0 && (
              <div className="absolute inset-0 bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] opacity-80" />
            )}

            {/* Blurred Original Background if selected */}
            {blurLevel > 0 && originalUrl && (
              <img
                src={originalUrl}
                alt="Blurred Background"
                className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none"
                style={{ filter: `blur(${blurLevel}px)` }}
              />
            )}

            {/* TAB 1: Removed Background Cutout */}
            {activeTab === 'cutout' && cutoutUrl && (
              <div
                className="relative z-10 w-full h-full flex items-center justify-center p-6 transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={cutoutUrl}
                  alt="Cutout Result"
                  className="max-h-[500px] w-auto max-w-full object-contain drop-shadow-md pointer-events-none"
                />
              </div>
            )}

            {/* TAB 2: Original Image */}
            {activeTab === 'original' && originalUrl && (
              <div
                className="relative z-10 w-full h-full flex items-center justify-center p-6 transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={originalUrl}
                  alt="Original Image"
                  className="max-h-[500px] w-auto max-w-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* TAB 3: Interactive Split Slider */}
            {activeTab === 'slider' && originalUrl && cutoutUrl && (
              <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
                <div className="relative max-h-[500px] max-w-full overflow-hidden flex items-center justify-center">
                  <img
                    src={originalUrl}
                    alt="Original Layer"
                    className="max-h-[500px] w-auto max-w-full object-contain pointer-events-none"
                  />

                  <div
                    className="absolute inset-0 overflow-hidden flex items-center justify-center"
                    style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                  >
                    <img
                      src={cutoutUrl}
                      alt="Cutout Layer"
                      className="max-h-[500px] w-auto max-w-full object-contain pointer-events-none"
                    />
                  </div>

                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 cursor-ew-resize flex items-center justify-center"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={onMouseDownSlider}
                    onTouchStart={onMouseDownSlider}
                  >
                    <div className="w-8 h-8 rounded-full bg-white text-slate-800 shadow-lg border border-slate-200 flex items-center justify-center cursor-ew-resize">
                      <ArrowLeftRight size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="text-[11px] font-bold px-1 text-slate-700 dark:text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer text-[10px] font-bold"
                title="Reset Zoom"
              >
                1:1
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
            <span>
              💡 Drag the slider handle or choose a custom background color from the panel on the right.
            </span>
            {imgDimensions && (
              <span className="font-bold">
                {imgDimensions.width} × {imgDimensions.height} px
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Remove.bg Controls & Download Studio */}
        <div className="lg:col-span-4 space-y-6">
          {/* Download Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Download Cutout</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                100% Free
              </span>
            </h3>

            {/* Big Blue Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg hover:shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Download size={20} strokeWidth={2.5} />
              Download Image
            </button>

            {/* Format Picker */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">Format:</span>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setFormat('png')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    format === 'png'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  PNG (Lossless)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('webp')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    format === 'webp'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  WebP
                </button>
              </div>
            </div>
          </div>

          {/* Add Background Customizer (Like remove.bg) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette size={16} className="text-blue-600" />
                Add Background
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Replace background with a solid color or blur
              </p>
            </div>

            {/* Color Swatches Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Colors
              </div>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((c) => {
                  const isSelected = selectedBg === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setSelectedBg(c.value);
                        setBlurLevel(0);
                      }}
                      className={`h-11 rounded-xl border relative transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/50 scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:scale-102'
                      }`}
                      style={{
                        backgroundColor: c.value === 'transparent' ? undefined : c.value,
                      }}
                      title={c.name}
                    >
                      {c.value === 'transparent' && (
                        <div className="absolute inset-0 rounded-xl bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)] bg-[size:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0]" />
                      )}
                      {isSelected && (
                        <div
                          className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-md ${
                            c.value === '#FFFFFF' || c.value === 'transparent' || c.value === '#F8FAFC' || c.value === '#E2E8F0'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-blue-600'
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Picker */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setSelectedBg('custom');
                    setBlurLevel(0);
                  }}
                  className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setSelectedBg('custom');
                    setBlurLevel(0);
                  }}
                  placeholder="#ffffff"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Background Blur Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Blur Original Background
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Off', val: 0 },
                  { label: 'Low', val: 8 },
                  { label: 'Medium', val: 16 },
                  { label: 'High', val: 28 },
                ].map((b) => (
                  <button
                    key={b.val}
                    type="button"
                    onClick={() => {
                      setBlurLevel(b.val);
                      if (b.val > 0) setSelectedBg('transparent');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      blurLevel === b.val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Precision Engine Selector */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                AI Segmentation Engine
              </h3>
            </div>
            <div className="space-y-2">
              {[
                { id: 'u2net', label: 'U²-Net High Precision (Recommended)', desc: 'Full deep neural net for complete outlines & complex details' },
                { id: 'isnet-general-use', label: 'IS-Net Crisp Edge AI', desc: 'Isolates central foreground subjects with fine edge detection' },
                { id: 'u2netp', label: 'Fast Mobile AI (u2netp)', desc: 'Ultra-fast inference for simple portraits and high-contrast images' },
              ].map((m) => {
                const isSelected = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelChange(m.id)}
                    className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold">{m.label}</span>
                      {isSelected && <Check size={14} className="text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
