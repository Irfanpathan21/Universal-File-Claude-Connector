/**
 * Interactive Crop Popup Window
 * A focused, distraction-free popup window opened by Claude / MCP when visual
 * cropping is requested. Features live 8-handle canvas, aspect presets,
 * resolution readout, and direct disk saving.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Crop, CheckCircle2, X, RefreshCw, Layers, ShieldCheck, Download, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { VisualImageCropper } from '../components/tools/VisualImageCropper';

export function InteractiveCropPopup() {
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('file') || '';
  const outputPath = searchParams.get('out') || '';

  const [cropBox, setCropBox] = useState({ left: 100, top: 100, width: 600, height: 400 });
  const [loading, setLoading] = useState(false);
  const [savedResult, setSavedResult] = useState<{ outputPath: string; dimensions?: string } | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');

  // Load image from query or sample
  useEffect(() => {
    if (filePath) {
      // Local backend preview endpoint
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const previewUrl = `${apiUrl}/api/image/preview-local?path=${encodeURIComponent(filePath)}`;
      setImageSrc(previewUrl);
    }
  }, [filePath]);

  const handleConfirmCrop = async () => {
    setLoading(true);
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

      if (filePath) {
        // Direct crop via disk path
        const res = await fetch(`${apiUrl}/api/image/crop-direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: filePath,
            left: cropBox.left,
            top: cropBox.top,
            width: cropBox.width,
            height: cropBox.height,
            outputPath: outputPath || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to crop image');

        setSavedResult({
          outputPath: data.outputPath,
          dimensions: `${cropBox.width} × ${cropBox.height} px`,
        });
        toast.success('Crop applied and saved to disk!');

        // Notify Claude window if opener exists
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'CROP_COMPLETED',
              outputPath: data.outputPath,
              crop: cropBox,
            },
            '*'
          );
        }
      } else {
        // Standalone browser mode without preloaded local path
        toast.success(`Crop box selected: ${cropBox.width}×${cropBox.height} px`);
        setSavedResult({
          outputPath: 'Local selection verified',
          dimensions: `${cropBox.width} × ${cropBox.height} px`,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error applying crop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f9] dark:bg-slate-950 text-[#191b23] dark:text-white flex flex-col justify-between font-sans">
      {/* Top Header Bar */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-[#c3c6d7] dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#004ac6]/10 text-[#004ac6] flex items-center justify-center font-bold">
            <Crop size={20} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold flex items-center gap-2">
              Visual Image Cropper
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Connected to Claude MCP
              </span>
            </h1>
            <p className="text-[11px] text-[#737686] truncate max-w-md">
              {filePath ? filePath : 'Interactive Visible Window'}
            </p>
          </div>
        </div>

        {/* Resolution Badge & Close */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#f0f3ff] dark:bg-slate-800 border border-[#004ac6]/30 text-[#004ac6] dark:text-blue-400 text-xs font-bold shadow-xs">
            {cropBox.width} × {cropBox.height} px
          </div>
          <button
            type="button"
            onClick={() => window.close()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[#737686] hover:text-[#E53E3E] cursor-pointer"
            title="Close Window"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Canvas Stage */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {savedResult ? (
          <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-lg text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-[#191b23] dark:text-white">
                Crop Applied Successfully!
              </h2>
              <p className="text-xs text-[#505f76] dark:text-slate-400">
                Your cropped image has been written directly to disk.
              </p>
            </div>

            <div className="p-3 bg-[#f8f9fe] dark:bg-slate-800/80 rounded-xl border border-[#c3c6d7]/60 dark:border-slate-700 text-left text-xs font-mono text-[#191b23] dark:text-slate-200 break-all">
              {savedResult.outputPath}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.close()}
                className="w-full py-3 rounded-xl bg-[#004ac6] text-white text-xs font-bold shadow-md hover:bg-[#003da8] cursor-pointer"
              >
                Close Window & Return to Claude
              </button>
              <button
                type="button"
                onClick={() => setSavedResult(null)}
                className="w-full py-2.5 rounded-xl border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#505f76] hover:text-[#004ac6] cursor-pointer"
              >
                Adjust Crop Again
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <VisualImageCropper
              imageFile={customFile}
              sampleImageUrl={imageSrc || undefined}
              accentColor="#004ac6"
              onCropChange={(box) => setCropBox(box)}
            />
          </div>
        )}
      </main>

      {/* Bottom Floating Action Bar */}
      {!savedResult && (
        <footer className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-[#c3c6d7] dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#505f76] dark:text-slate-400">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>
              Target: <strong className="text-[#191b23] dark:text-white">{outputPath || 'Overwriting original / saving to disk'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.close()}
              className="px-4 py-2.5 rounded-xl border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#505f76] hover:text-[#191b23] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#004ac6] hover:bg-[#003da8] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Applying Crop...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Confirm Crop & Apply to Claude
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
