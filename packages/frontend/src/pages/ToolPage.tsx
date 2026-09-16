/**
 * Universal File Toolkit — ToolPage with Intuitive Visual Controls for EVERY Tool
 * 
 * Maps all 90+ tools to appropriate visual control components:
 * - Crop: 8-handle canvas cropper
 * - Rotate: Visual rotation cards
 * - Flip: Horizontal/Vertical card picker
 * - Resize: Scale presets + resolution cards
 * - Compress: Extreme/Balanced/Quality level cards
 * - Convert: Format card grid with quality slider
 * - Watermark: Canvas editor with position grid
 * - PDF pages: Clickable page number chips
 * - Audio/Video: HH:MM:SS timestamp input
 * - Password: Show/hide + strength indicator
 * - Find/Replace: Dual panel
 * - Filters: Intensity slider with presets
 * - Zero-param: "No settings needed" card
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  Home, ChevronRight, UploadCloud, FileText, Trash2, X, Play,
  Download, CheckCircle2, RefreshCw, Sliders, Archive, Plus, Layers, Image as ImageIcon,
  Check, FileSpreadsheet, Sparkles, FileCode, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchTool, processTool } from '../lib/api';
import type { ToolInfo, ApiToolResponse, ToolParameter } from '../lib/api';
import { useUIStore } from '../stores/ui';
import { getPendingFiles, clearPendingFiles } from '../stores/fileTransfer';
import { CATEGORIES_CONFIG } from '../config/categories';
import { getPdfPageCount } from '../lib/pdfUtils';

// Visual control components
import { VisualImageCropper } from '../components/tools/VisualImageCropper';
import { VisualWatermarkEditor } from '../components/tools/VisualWatermarkEditor';
import { PdfPageGridEditor } from '../components/tools/PdfPageGridEditor';
import { InteractiveImageWorkbench } from '../components/tools/InteractiveImageWorkbench';
import { InteractiveMediaWorkbench } from '../components/tools/InteractiveMediaWorkbench';
import { InteractiveDataWorkbench } from '../components/tools/InteractiveDataWorkbench';
import { RotationPicker } from '../components/tools/RotationPicker';
import { FlipPicker } from '../components/tools/FlipPicker';
import { CompressionLevelPicker } from '../components/tools/CompressionLevelPicker';
import { FormatConvertPicker, IMAGE_FORMATS, AUDIO_FORMATS } from '../components/tools/FormatConvertPicker';
import { QualitySlider } from '../components/tools/QualitySlider';
import { PageRangeInput } from '../components/tools/PageRangeInput';
import { PositionPicker } from '../components/tools/PositionPicker';
import { TimestampInput } from '../components/tools/TimestampInput';
import { PasswordInput } from '../components/tools/PasswordInput';
import { MetadataForm } from '../components/tools/MetadataForm';
import { FindReplacePanel } from '../components/tools/FindReplacePanel';
import { PageSizePicker } from '../components/tools/PageSizePicker';
import { ResizeDimensionPicker } from '../components/tools/ResizeDimensionPicker';
import { ImageFilterPreview } from '../components/tools/ImageFilterPreview';
import { RemoveBgStudio } from '../components/tools/RemoveBgStudio';
import { VisualThresholdStudio } from '../components/tools/VisualThresholdStudio';
import { VisualTrimStudio } from '../components/tools/VisualTrimStudio';
import { DelimiterPicker } from '../components/tools/DelimiterPicker';
import { NoSettingsCard } from '../components/tools/NoSettingsCard';

// Category Accent Colors
const CATEGORY_COLORS: Record<string, { main: string; bgLight: string; bgDark: string; border: string }> = {
  pdf: { main: '#E53E3E', bgLight: 'bg-red-50/50', bgDark: 'dark:bg-red-950/20', border: 'border-[#E53E3E]/50 hover:border-[#E53E3E]' },
  image: { main: '#00A3C4', bgLight: 'bg-cyan-50/50', bgDark: 'dark:bg-cyan-950/20', border: 'border-[#00A3C4]/50 hover:border-[#00A3C4]' },
  document: { main: '#2B6CB0', bgLight: 'bg-blue-50/50', bgDark: 'dark:bg-blue-950/20', border: 'border-[#2B6CB0]/50 hover:border-[#2B6CB0]' },
  spreadsheet: { main: '#2F855A', bgLight: 'bg-green-50/50', bgDark: 'dark:bg-green-950/20', border: 'border-[#2F855A]/50 hover:border-[#2F855A]' },
  presentation: { main: '#805AD5', bgLight: 'bg-purple-50/50', bgDark: 'dark:bg-purple-950/20', border: 'border-[#805AD5]/50 hover:border-[#805AD5]' },
  audio: { main: '#D69E2E', bgLight: 'bg-yellow-50/50', bgDark: 'dark:bg-yellow-950/20', border: 'border-[#D69E2E]/50 hover:border-[#D69E2E]' },
  video: { main: '#805AD5', bgLight: 'bg-purple-50/50', bgDark: 'dark:bg-purple-950/20', border: 'border-[#805AD5]/50 hover:border-[#805AD5]' },
  data: { main: '#004ac6', bgLight: 'bg-blue-50/50', bgDark: 'dark:bg-blue-950/20', border: 'border-[#004ac6]/50 hover:border-[#004ac6]' },
  archive: { main: '#718096', bgLight: 'bg-slate-50/50', bgDark: 'dark:bg-slate-950/20', border: 'border-[#718096]/50 hover:border-[#718096]' },
  ocr: { main: '#DD6B20', bgLight: 'bg-orange-50/50', bgDark: 'dark:bg-orange-950/20', border: 'border-[#DD6B20]/50 hover:border-[#DD6B20]' },
  metadata: { main: '#38B2AC', bgLight: 'bg-teal-50/50', bgDark: 'dark:bg-teal-950/20', border: 'border-[#38B2AC]/50 hover:border-[#38B2AC]' },
  ai: { main: '#9F7AEA', bgLight: 'bg-purple-50/50', bgDark: 'dark:bg-purple-950/20', border: 'border-[#9F7AEA]/50 hover:border-[#9F7AEA]' },
  text: { main: '#4A5568', bgLight: 'bg-slate-50/50', bgDark: 'dark:bg-slate-950/20', border: 'border-[#4A5568]/50 hover:border-[#4A5568]' },
  default: { main: '#004ac6', bgLight: 'bg-blue-50/50', bgDark: 'dark:bg-blue-950/20', border: 'border-[#004ac6]/50 hover:border-[#004ac6]' },
};

function BatchImageCard({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [thumb, setThumb] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden border border-[#c3c6d7] dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex flex-col shadow-xs">
      {thumb ? (
        <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400">
          <ImageIcon size={24} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 opacity-90 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
        <div>
          <div className="text-[11px] font-bold text-white truncate drop-shadow-xs">{file.name}</div>
          <div className="text-[9px] text-slate-300">{(file.size / 1024).toFixed(1)} KB</div>
        </div>
      </div>
    </div>
  );
}

export function ToolPage() {
  const { id } = useParams<{ id: string }>();
  const [tool, setTool] = useState<ToolInfo | null>(null);
  const [files, setFiles] = useState<File[]>(() => {
    const pending = getPendingFiles();
    return pending.length > 0 ? pending : [];
  });
  const prevIdRef = useRef<string | undefined>(id);
  const [params, setParams] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ApiToolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);
  const addToHistory = useUIStore((s) => s.addToHistory);

  // Accurately update real page count whenever uploaded files change
  useEffect(() => {
    let active = true;
    async function updatePageCount() {
      if (files.length > 0 && (files[0].name.toLowerCase().endsWith('.pdf') || files[0].type === 'application/pdf')) {
        const count = await getPdfPageCount(files[0]);
        if (active && count > 0) {
          setPdfPageCount(count);
          if (id === 'rearrange_pages') {
            setParams((prev) => {
              if (!prev.order || prev.order.trim() === '') {
                return { ...prev, order: Array.from({ length: count }, (_, i) => i + 1).join(', ') };
              }
              return prev;
            });
          }
        }
      } else {
        if (active) setPdfPageCount(1);
      }
    }
    updatePageCount();
    return () => {
      active = false;
    };
  }, [files]);

  // Load tool and initialize smart defaults
  useEffect(() => {
    if (!id) return;
    const isIdChange = prevIdRef.current !== undefined && prevIdRef.current !== id;
    prevIdRef.current = id;

    async function load() {
      try {
        const t = await fetchTool(id!);
        setTool(t);
        const defaults: Record<string, string> = {};
        if (t.parameters) {
          t.parameters.forEach((p) => {
            if (p.default !== undefined) defaults[p.name] = String(p.default);
          });
        }
        // Tool-specific smart defaults
        const smartDefaults: Record<string, Record<string, string>> = {
          crop_image: { left: '0', top: '0', width: '', height: '', ratio: 'free' },
          remove_bg: { model: 'u2netp', format: 'png' },
          remove_background: { model: 'u2netp', format: 'png' },
          resize_image: { width: '1920', height: '1080', fit: 'inside' },
          batch_resize: { width: '1920', height: '1080', fit: 'inside' },
          generate_thumbnail: { width: '200', height: '200' },
          rotate_image: { angle: '90' },
          rotate_pdf: { angle: '90' },
          pdf_to_images: { mode: 'auto', format: 'png' },
          duplicate_pages: { page: '1', pages: '1' },
          flip_image: { direction: 'horizontal' },
          compress_pdf: { quality: 'medium' },
          compress_image: { quality: '80' },
          compress_video: { quality: 'medium' },
          convert_image: { format: 'webp', quality: '90' },
          convert_audio: { targetFormat: 'mp3' },
          extract_audio_from_video: { targetFormat: 'mp3' },
          watermark_image: { text: 'CONFIDENTIAL', opacity: '0.6', fontSize: '36', color: '#ffffff', position: 'center', angle: '-30' },
          add_watermark: { text: 'CONFIDENTIAL', opacity: '0.3', fontSize: '48', position: 'center' },
          add_page_numbers: { position: 'bottom-center', format: 'numeric', startNumber: '1', fontSize: '12' },
          password_protect: { userPassword: '', password: '' },
          protect_workbook: { userPassword: '', password: '' },
          images_to_pdf: { pageSize: 'A4' },
          resize_pdf_pages: { pageSize: 'A4' },
          json_to_csv: { delimiter: ',' },
          csv_to_json: { header: 'true' },
          format_json: { indent: '2' },
          image_blur: { sigma: '5' },
          image_sharpen: { sigma: '2' },
          image_adjust: { brightness: '1', saturation: '1' },
          gamma_image: { gamma: '2.2' },
          threshold_image: { threshold: '128', invert: 'false', background: 'transparent' },
          trim_audio: { startTime: '00:00:00', endTime: '00:00:30' },
          trim_video: { startTime: '00:00:00', endTime: '00:00:30' },
          generate_video_thumbnail: { timestamp: '00:00:01' },
          swap_pages: { pageA: '1', pageB: '2' },
          summarize_text: { maxSentences: '5' },
          extract_text_from_image_ocr: { language: 'eng' },
          split_pdf: { ranges: '' },
          extract_pages: { pages: '' },
          delete_pages: { pages: '' },
          rearrange_pages: { order: '' },
          replace_text_docx: { targetText: '', replacementText: '' },
          find_replace_excel: { targetValue: '', replacementValue: '' },
        };
        const sd = smartDefaults[t.id] || {};
        Object.entries(sd).forEach(([k, v]) => { if (!defaults[k]) defaults[k] = v; });
        setParams(defaults);
        const pending = getPendingFiles();
        if (pending && pending.length > 0) {
          setFiles(pending);
          toast.success(`Loaded ${pending[0].name}${pending.length > 1 ? ` (+${pending.length - 1} more)` : ''}`);
          setTimeout(() => {
            clearPendingFiles();
          }, 3000);
        } else if (isIdChange) {
          setFiles([]);
        }
        setResult(null);
        setError(null);
      } catch (err) {
        toast.error('Failed to load tool configuration');
      }
    }
    load();
  }, [id]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const empty = acceptedFiles.find((f) => f.size === 0);
    if (empty) {
      const warningMsg = 'The File You have uploaded is empty';
      setError(warningMsg);
      toast.warning(warningMsg);
    } else {
      setError(null);
    }
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: tool?.maxFiles || 100 });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (!updated.some((f) => f.size === 0)) {
        setError(null);
      }
      return updated;
    });
  };

  const handleParamChange = useCallback((name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRun = async () => {
    if (!tool) return;
    if (files.length === 0) {
      toast.error('Please upload a file to proceed');
      return;
    }
    const emptyFile = files.find((f) => f.size === 0);
    if (emptyFile) {
      const warningMsg = 'The File You have uploaded is empty';
      setError(warningMsg);
      toast.warning(warningMsg);
      return;
    }
    if ((tool.id === 'password_protect' || tool.id === 'protect_workbook') && !params.userPassword && !params.password) {
      toast.error('Please enter a password');
      return;
    }
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await processTool(tool.id, files, params);
      setResult(res);
      toast.success(res.message || `${tool.name} completed!`);
      addToHistory({ toolId: tool.id, toolName: tool.name, files: files.map(f => f.name), status: 'completed', downloadUrls: res.outputFiles?.map(f => f.downloadUrl) });
    } catch (err: any) {
      const msg = err.message || `Error during ${tool.name}`;
      setError(msg);
      toast.error(msg);
      addToHistory({ toolId: tool.id, toolName: tool.name, files: files.map(f => f.name), status: 'failed' });
    } finally {
      setProcessing(false);
    }
  };

  // Dynamically update document title with tool name and category shortName
  useEffect(() => {
    if (tool) {
      const theme = CATEGORIES_CONFIG[tool.category] || CATEGORIES_CONFIG.pdf;
      document.title = `${tool.name} — ${theme.shortName} | Universal File Toolkit`;
    }
  }, [tool]);

  if (!tool) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  // If this is the Remove Background tool, render the dedicated Remove.bg Studio!
  if (tool.id === 'remove_bg' || tool.id === 'remove_background') {
    return <RemoveBgStudio tool={tool} />;
  }

  const catTheme = CATEGORIES_CONFIG[tool.category] || CATEGORIES_CONFIG.pdf;
  const colors = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.default;

  // ─── Render the sidebar settings panel for each tool ────────────
  const renderSettingsPanel = () => {
    const toolId = tool.id;
    const accent = colors.main;

    // ── CROP ──
    if (toolId === 'crop_image') {
      const activeRatio = params.ratio || 'free';
      const ratios = [
        { id: 'free', label: 'Freeform' },
        { id: '1:1', label: '1:1 Square' },
        { id: '16:9', label: '16:9 Landscape' },
        { id: '9:16', label: '9:16 Story' },
        { id: '4:3', label: '4:3 Standard' },
        { id: '3:2', label: '3:2 Photo' },
      ];

      return (
        <div className="space-y-4">
          {/* Aspect Ratio Options */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
              Aspect Ratio Preset
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ratios.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleParamChange('ratio', r.id)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center ${
                    activeRatio === r.id
                      ? 'text-white shadow-xs'
                      : 'bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-slate-400'
                  }`}
                  style={activeRatio === r.id ? { backgroundColor: accent, borderColor: accent } : {}}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Dimensions in Pixels */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
              Manual Dimensions (Pixels)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-[#737686]">Width (px)</span>
                <input
                  type="number"
                  min="1"
                  value={params.width || ''}
                  onChange={(e) => {
                    handleParamChange('width', e.target.value);
                    if (params.ratio && params.ratio !== 'free') {
                      handleParamChange('ratio', 'free');
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Width"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#737686]">Height (px)</span>
                <input
                  type="number"
                  min="1"
                  value={params.height || ''}
                  onChange={(e) => {
                    handleParamChange('height', e.target.value);
                    if (params.ratio && params.ratio !== 'free') {
                      handleParamChange('ratio', 'free');
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Height"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#737686]">Offset X (Left)</span>
                <input
                  type="number"
                  min="0"
                  value={params.left || '0'}
                  onChange={(e) => handleParamChange('left', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Left"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-[#737686]">Offset Y (Top)</span>
                <input
                  type="number"
                  min="0"
                  value={params.top || '0'}
                  onChange={(e) => handleParamChange('top', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="Top"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Current Crop Box Summary Badge */}
          <div className="p-3 rounded-xl border border-dashed" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}08` }}>
            <div className="text-xs font-bold" style={{ color: accent }}>
              {params.width || 0} × {params.height || 0} px
            </div>
            <div className="text-[10px] text-[#737686] mt-0.5">
              Position: X {params.left || 0}, Y {params.top || 0} • Ratio: {activeRatio.toUpperCase()}
            </div>
          </div>

          <div className="text-[10px] text-[#737686]">
            💡 Drag inside or move the handles on the canvas to manually position and resize the crop area.
          </div>
        </div>
      );
    }

    // ── REMOVE BACKGROUND ──
    if (toolId === 'remove_bg' || toolId === 'remove_background') {
      const activeModel = params.model || 'u2netp';
      const activeFormat = params.format || 'png';
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#191b23] dark:text-white flex items-center gap-1.5">
              <span>✨</span> AI Removal Engine
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleParamChange('model', 'u2netp')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  activeModel === 'u2netp'
                    ? 'border-transparent text-white shadow-sm ring-2 ring-offset-1'
                    : 'bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-slate-400'
                }`}
                style={activeModel === 'u2netp' ? { backgroundColor: accent } : {}}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>⚡ Fast AI (Recommended)</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded bg-white/20">~0.5s</span>
                </div>
                <div className={`text-[11px] mt-1 ${activeModel === 'u2netp' ? 'text-white/80' : 'text-[#737686]'}`}>
                  Ultra-fast neural segmentation ideal for portraits, products, and graphics.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleParamChange('model', 'u2net')}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  activeModel === 'u2net'
                    ? 'border-transparent text-white shadow-sm ring-2 ring-offset-1'
                    : 'bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-slate-400'
                }`}
                style={activeModel === 'u2net' ? { backgroundColor: accent } : {}}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🎯 High Precision AI</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded bg-white/20">Deep</span>
                </div>
                <div className={`text-[11px] mt-1 ${activeModel === 'u2net' ? 'text-white/80' : 'text-[#737686]'}`}>
                  Full U²-Net architecture for complex foregrounds, fine hair, and fur.
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Output Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleParamChange('format', 'png')}
                className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                  activeFormat === 'png'
                    ? 'text-white shadow-xs'
                    : 'bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700'
                }`}
                style={activeFormat === 'png' ? { backgroundColor: accent, borderColor: accent } : {}}
              >
                PNG (Lossless)
              </button>
              <button
                type="button"
                onClick={() => handleParamChange('format', 'webp')}
                className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                  activeFormat === 'webp'
                    ? 'text-white shadow-xs'
                    : 'bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700'
                }`}
                style={activeFormat === 'webp' ? { backgroundColor: accent, borderColor: accent } : {}}
              >
                WebP (Web Size)
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
            ✨ Output images feature genuine RGBA alpha channel transparency ready for graphics, e-commerce, and design.
          </div>
        </div>
      );
    }

    // ── ROTATE (Image + PDF) ──
    if (toolId === 'rotate_image' || toolId === 'rotate_pdf') {
      return <RotationPicker value={params.angle || '90'} onChange={(v) => handleParamChange('angle', v)} accentColor={accent} />;
    }

    // ── FLIP ──
    if (toolId === 'flip_image') {
      return <FlipPicker value={params.direction || 'horizontal'} onChange={(v) => handleParamChange('direction', v)} accentColor={accent} />;
    }

    // ── RESIZE ──
    if (toolId === 'resize_image' || toolId === 'batch_resize' || toolId === 'generate_thumbnail') {
      return (
        <ResizeDimensionPicker
          width={params.width || '1920'}
          height={params.height || '1080'}
          onWidthChange={(v) => handleParamChange('width', v)}
          onHeightChange={(v) => handleParamChange('height', v)}
          accentColor={accent}
        />
      );
    }

    // ── COMPRESS ──
    if (toolId === 'compress_pdf' || toolId === 'compress_video') {
      return <CompressionLevelPicker value={params.quality || 'medium'} onChange={(v) => handleParamChange('quality', v)} accentColor={accent} />;
    }
    if (toolId === 'compress_image') {
      return (
        <div className="space-y-4">
          <QualitySlider value={params.quality || '80'} onChange={(v) => handleParamChange('quality', v)} accentColor={accent} />
          <FormatConvertPicker
            value={params.format || ''}
            onChange={(v) => handleParamChange('format', v)}
            formats={[{ value: '', label: 'Original', benefit: 'Keep current format' }, ...IMAGE_FORMATS]}
            accentColor={accent}
          />
        </div>
      );
    }

    // ── CONVERT IMAGE ──
    if (toolId === 'convert_image') {
      return (
        <FormatConvertPicker
          value={params.format || 'webp'}
          onChange={(v) => handleParamChange('format', v)}
          formats={IMAGE_FORMATS}
          accentColor={accent}
          showQuality
          quality={params.quality || '90'}
          onQualityChange={(v) => handleParamChange('quality', v)}
        />
      );
    }

    // ── CONVERT AUDIO / EXTRACT AUDIO ──
    if (toolId === 'convert_audio' || toolId === 'extract_audio_from_video') {
      return (
        <FormatConvertPicker
          value={params.targetFormat || 'mp3'}
          onChange={(v) => handleParamChange('targetFormat', v)}
          formats={AUDIO_FORMATS}
          accentColor={accent}
        />
      );
    }

    // ── WATERMARK IMAGE ──
    if (toolId === 'watermark_image') {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Watermark Text</label>
            <input
              type="text"
              value={params.text ?? 'CONFIDENTIAL'}
              onChange={(e) => handleParamChange('text', e.target.value)}
              placeholder="Enter your watermark text..."
              className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['CONFIDENTIAL', 'SAMPLE', 'DRAFT', 'DO NOT COPY', '© 2026'].map((txt) => (
              <button
                key={txt}
                type="button"
                onClick={() => handleParamChange('text', txt)}
                className="px-2 py-1 rounded bg-[#ededf9] dark:bg-slate-800 text-[10px] font-bold text-[#505f76] hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer"
              >
                {txt}
              </button>
            ))}
          </div>
          <PositionPicker
            value={params.position || 'center'}
            onChange={(v) => handleParamChange('position', v)}
            accentColor={accent}
          />
          {/* Slant Angle Presets */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
                Slant Angle
              </label>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded text-white shadow-xs" style={{ backgroundColor: accent }}>
                {params.angle === '0' ? 'Horizontal (0°)' : `${params.angle || '-30'}° Slanted`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: '📐 Slanted (-30°)', value: '-30' },
                { label: '📐 Diagonal (-45°)', value: '-45' },
                { label: '➖ Horizontal (0°)', value: '0' },
                { label: '📐 Slanted Up (+30°)', value: '30' },
              ].map((sp) => {
                const isSel = (params.angle || '-30') === sp.value;
                return (
                  <button
                    key={sp.value}
                    type="button"
                    onClick={() => handleParamChange('angle', sp.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      isSel
                        ? 'text-white shadow-xs border-transparent'
                        : 'bg-[#ededf9] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border-[#c3c6d7] dark:border-slate-700 hover:border-blue-400'
                    }`}
                    style={isSel ? { backgroundColor: accent } : {}}
                  >
                    {sp.label}
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              step="5"
              value={params.angle || '-30'}
              onChange={(e) => handleParamChange('angle', e.target.value)}
              className="w-full cursor-pointer mt-1"
              style={{ accentColor: accent }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#191b23] dark:text-white">
                <span>Opacity</span>
                <span>{Math.round(parseFloat(params.opacity || '0.6') * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={params.opacity || '0.6'}
                onChange={(e) => handleParamChange('opacity', e.target.value)}
                className="w-full cursor-pointer"
                style={{ accentColor: accent }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#191b23] dark:text-white">
                <span>Font Size</span>
                <span>{params.fontSize || '36'}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="120"
                step="2"
                value={params.fontSize || '36'}
                onChange={(e) => handleParamChange('fontSize', e.target.value)}
                className="w-full cursor-pointer"
                style={{ accentColor: accent }}
              />
            </div>
          </div>
        </div>
      );
    }

    // ── THRESHOLD IMAGE ──
    if (toolId === 'threshold_image') {
      const currentVal = parseInt(params.threshold || '128', 10);
      const isInkMode = params.invert === 'true';
      const bgMode = params.background || 'transparent';
      const presets = [
        { label: 'Low (64)', value: '64' },
        { label: 'Standard (128)', value: '128' },
        { label: 'High (192)', value: '192' },
      ];

      return (
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={14} style={{ color: accent }} />
                Threshold Cutoff Level
              </label>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold text-white shadow-xs" style={{ backgroundColor: accent }}>
                {params.threshold || '128'}
              </span>
            </div>
            <p className="text-[11px] text-[#737686]">
              {isInkMode
                ? 'Black Ink on White Paper: dark strokes become black ink, bright areas become white.'
                : 'Binary Cutoff: pixels ≥ threshold turn white; pixels below turn black.'}
            </p>
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Quick Presets</div>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => {
                const isActive = (params.threshold || '128') === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleParamChange('threshold', p.value)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold text-center border cursor-pointer transition-all ${
                      isActive
                        ? 'text-white shadow-sm border-transparent'
                        : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:border-[#004ac6]'
                    }`}
                    style={isActive ? { backgroundColor: accent } : {}}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider & Exact Value */}
          <div className="space-y-2.5 p-3.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/60 dark:border-slate-700/60">
            <div className="flex justify-between items-center text-xs font-bold text-[#191b23] dark:text-white">
              <span>Threshold Range (0 - 255)</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#737686]">Value:</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={params.threshold || '128'}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value || '0', 10);
                    const v = isNaN(raw) ? 128 : Math.min(255, Math.max(0, raw));
                    handleParamChange('threshold', String(v));
                  }}
                  className="w-16 px-2 py-1 text-center text-xs font-bold rounded-lg border border-[#c3c6d7] dark:border-slate-600 bg-white dark:bg-slate-900 text-[#191b23] dark:text-white"
                />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={255}
              step={1}
              value={isNaN(currentVal) ? 128 : currentVal}
              onChange={(e) => handleParamChange('threshold', e.target.value)}
              className="w-full cursor-pointer h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-700"
              style={{ accentColor: accent }}
            />
            <div className="flex justify-between text-[10px] text-[#737686] font-semibold">
              <span>0 (All White)</span>
              <span className="font-bold text-[#191b23] dark:text-white">128 (Standard Default)</span>
              <span>255 (All Black)</span>
            </div>
          </div>

          {/* Stencil Mode & Background Toggles */}
          <div className="space-y-2 pt-1 border-t border-[#ededf9] dark:border-slate-800">
            <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Output Style</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleParamChange('invert', isInkMode ? 'false' : 'true')}
                className={`py-2 px-2 rounded-xl text-xs font-bold text-center border cursor-pointer transition-all ${
                  isInkMode
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                }`}
              >
                {isInkMode ? '✓ Ink on White' : 'White on Black'}
              </button>
              <button
                type="button"
                onClick={() => handleParamChange('background', bgMode === 'white' ? 'transparent' : 'white')}
                className={`py-2 px-2 rounded-xl text-xs font-bold text-center border cursor-pointer transition-all ${
                  bgMode === 'white'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 shadow-xs'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                }`}
              >
                {bgMode === 'white' ? '✓ Paper White BG' : 'Transparent BG'}
              </button>
            </div>
          </div>

          {/* Reset to 128 button */}
          {(params.threshold || '128') !== '128' && (
            <button
              type="button"
              onClick={() => handleParamChange('threshold', '128')}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-[#004ac6] dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 cursor-pointer transition-colors text-center"
            >
              ↺ Reset to Standard 128
            </button>
          )}
        </div>
      );
    }

    // ── ADD PDF WATERMARK ──
    if (toolId === 'add_watermark') {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Watermark Text</label>
            <input type="text" value={params.text || 'CONFIDENTIAL'} onChange={(e) => handleParamChange('text', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white" />
          </div>
          <PositionPicker value={params.position || 'center'} onChange={(v) => handleParamChange('position', v)} accentColor={accent} />
          <QualitySlider value={String(Math.round((parseFloat(params.opacity) || 0.3) * 100))} onChange={(v) => handleParamChange('opacity', String(parseInt(v) / 100))} label="Opacity" min={5} max={100} accentColor={accent} />
        </div>
      );
    }

    // ── ADD PAGE NUMBERS ──
    if (toolId === 'add_page_numbers') {
      return (
        <div className="space-y-4">
          <PositionPicker value={params.position || 'bottom-center'} onChange={(v) => handleParamChange('position', v)} accentColor={accent} />
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Number Format</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'numeric', label: '1, 2, 3' },
                { id: 'roman', label: 'I, II, III' },
                { id: 'alpha', label: 'A, B, C' },
              ].map((fmt) => (
                <button key={fmt.id} type="button" onClick={() => handleParamChange('format', fmt.id)}
                  className={`py-2 rounded-lg text-xs font-bold text-center border cursor-pointer transition-all ${
                    (params.format || 'numeric') === fmt.id ? 'text-white shadow-sm' : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655]'
                  }`}
                  style={(params.format || 'numeric') === fmt.id ? { backgroundColor: accent, borderColor: accent } : {}}
                >{fmt.label}</button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── PDF PAGE OPERATIONS ──
    if (['split_pdf', 'extract_pages', 'delete_pages'].includes(toolId)) {
      const paramName = toolId === 'split_pdf' ? 'ranges' : 'pages';
      return (
        <PageRangeInput
          value={params[paramName] || ''}
          onChange={(v) => handleParamChange(paramName, v)}
          totalPages={pdfPageCount}
          accentColor={accent}
        />
      );
    }
    if (toolId === 'rearrange_pages') {
      const currentOrderStr = params.order || (pdfPageCount > 1 ? Array.from({ length: pdfPageCount }, (_, i) => i + 1).join(', ') : '1');
      const orderItems = currentOrderStr
        .replace(/[;|\s]+/g, ',')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n >= 1);

      const moveOrderLeft = (idx: number) => {
        if (idx <= 0) return;
        const next = [...orderItems];
        const temp = next[idx];
        next[idx] = next[idx - 1];
        next[idx - 1] = temp;
        handleParamChange('order', next.join(', '));
      };

      const moveOrderRight = (idx: number) => {
        if (idx >= orderItems.length - 1) return;
        const next = [...orderItems];
        const temp = next[idx];
        next[idx] = next[idx + 1];
        next[idx + 1] = temp;
        handleParamChange('order', next.join(', '));
      };

      const reverseOrder = () => {
        const next = [...orderItems].reverse();
        handleParamChange('order', next.join(', '));
      };

      const resetOrder = () => {
        const next = Array.from({ length: pdfPageCount || 1 }, (_, i) => i + 1);
        handleParamChange('order', next.join(', '));
      };

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
              Rearrange Page Order
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>
              {pdfPageCount} {pdfPageCount === 1 ? 'Page' : 'Pages'}
            </span>
          </div>

          <p className="text-[11px] text-[#505f76] dark:text-slate-400">
            Arrange the page sequence below or use the card arrows in the visual preview.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
              Page Sequence (Comma-separated)
            </label>
            <input
              type="text"
              value={params.order || ''}
              onChange={(e) => handleParamChange('order', e.target.value)}
              placeholder={`e.g. ${pdfPageCount > 2 ? '3, 1, 2' : '2, 1'}`}
              className="w-full px-3 py-2 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white focus:outline-none"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reverseOrder}
              className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-[#ededf9] dark:bg-slate-800 hover:bg-[#e0e0f5] dark:hover:bg-slate-700 text-[#434655] dark:text-slate-300 border border-[#c3c6d7]/60 cursor-pointer flex items-center justify-center gap-1"
            >
              ⇄ Reverse Order
            </button>
            <button
              type="button"
              onClick={resetOrder}
              className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-[#ededf9] dark:bg-slate-800 hover:bg-[#e0e0f5] dark:hover:bg-slate-700 text-[#434655] dark:text-slate-300 border border-[#c3c6d7]/60 cursor-pointer"
            >
              Reset (1-{pdfPageCount})
            </button>
          </div>

          {/* Interactive Sequence Preview Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">
              Sequence Preview (Click ‹ / › to shift)
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-[#f8f9fe] dark:bg-slate-800/60 border border-[#c3c6d7]/40">
              {orderItems.map((pageNum, idx) => (
                <div
                  key={`${pageNum}-${idx}`}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-[#c3c6d7] dark:border-slate-600 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => moveOrderLeft(idx)}
                    disabled={idx === 0}
                    className="text-[#737686] hover:text-[#004ac6] disabled:opacity-20 cursor-pointer text-xs font-bold"
                    title="Move earlier"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-extrabold text-[#191b23] dark:text-white px-1">
                    P{pageNum}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveOrderRight(idx)}
                    disabled={idx === orderItems.length - 1}
                    className="text-[#737686] hover:text-[#004ac6] disabled:opacity-20 cursor-pointer text-xs font-bold"
                    title="Move later"
                  >
                    ›
                  </button>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#505f76] dark:text-slate-400 font-semibold px-1">
              New PDF Order: {orderItems.map(p => `Page ${p}`).join(' → ')}
            </div>
          </div>
        </div>
      );
    }

    // ── MERGE PDF ──
    if (toolId === 'merge_pdf') {
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Output Filename</label>
            <input type="text" value={params.outputFilename || 'merged.pdf'} onChange={(e) => handleParamChange('outputFilename', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white" />
          </div>
          {files.length > 1 && (
            <div className="text-[11px] text-[#505f76] dark:text-slate-400 p-3 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/40">
              📄 {files.length} PDF files will be merged in the order shown above. Drag to reorder if needed.
            </div>
          )}
        </div>
      );
    }

    // ── SWAP PAGES ──
    if (toolId === 'swap_pages') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
            Swap Pages (Total: {pdfPageCount} {pdfPageCount === 1 ? 'Page' : 'Pages'})
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-semibold text-[#737686]">Page A (1 - {pdfPageCount})</span>
              <input type="number" min="1" max={pdfPageCount} value={params.pageA || '1'} onChange={(e) => handleParamChange('pageA', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-bold text-[#191b23] dark:text-white text-center" />
            </div>
            <div className="text-2xl font-bold mt-4" style={{ color: accent }}>⇄</div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-semibold text-[#737686]">Page B (1 - {pdfPageCount})</span>
              <input type="number" min="1" max={pdfPageCount} value={params.pageB || String(Math.min(2, pdfPageCount))} onChange={(e) => handleParamChange('pageB', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-bold text-[#191b23] dark:text-white text-center" />
            </div>
          </div>
        </div>
      );
    }

    // ── DUPLICATE PDF PAGES ──
    if (toolId === 'duplicate_pages') {
      const selectedValue = params.pages || params.page || '1';
      // parse selected pages into a Set for button highlighting
      const selectedSet = new Set<string>();
      selectedValue.split(',').forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              selectedSet.add(String(i));
            }
          }
        } else {
          const n = parseInt(trimmed, 10);
          if (!isNaN(n)) selectedSet.add(String(n));
        }
      });

      const togglePageInList = (pNum: string) => {
        const nextSet = new Set(selectedSet);
        if (nextSet.has(pNum)) {
          nextSet.delete(pNum);
          if (nextSet.size === 0) nextSet.add(pNum);
        } else {
          nextSet.add(pNum);
        }
        const sorted = Array.from(nextSet)
          .map((n) => parseInt(n, 10))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b)
          .join(', ');
        handleParamChange('page', sorted);
        handleParamChange('pages', sorted);
      };

      const setPreset = (type: 'all' | 'odd' | 'even' | 'first') => {
        let list: number[] = [];
        if (type === 'all') {
          for (let i = 1; i <= pdfPageCount; i++) list.push(i);
        } else if (type === 'odd') {
          for (let i = 1; i <= pdfPageCount; i += 2) list.push(i);
        } else if (type === 'even') {
          for (let i = 2; i <= pdfPageCount; i += 2) list.push(i);
        } else {
          list = [1];
        }
        const val = list.join(', ');
        handleParamChange('page', val);
        handleParamChange('pages', val);
      };

      const countSelected = selectedSet.size;

      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
              Which page(s) you want to Duplicate?
            </label>
            <p className="text-[11px] text-[#505f76] dark:text-slate-400">
              Total pages: <strong className="text-[#191b23] dark:text-white">{pdfPageCount}</strong>. Select single or multiple pages (e.g., <strong>1, 3</strong> or <strong>1-3</strong>).
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={selectedValue}
                placeholder="e.g. 1, 3 or 1-3"
                onChange={(e) => {
                  const val = e.target.value;
                  handleParamChange('page', val);
                  handleParamChange('pages', val);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-bold text-[#191b23] dark:text-white text-center"
              />
              <span className="text-[10px] text-[#737686] mt-1 block text-center">
                Comma-separated (1, 3) or ranges (1-3)
              </span>
            </div>

            {/* Quick Action Filters */}
            {pdfPageCount > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 justify-center pt-0.5">
                <button
                  type="button"
                  onClick={() => setPreset('all')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border border-[#c3c6d7]/60 hover:text-[#004ac6] cursor-pointer"
                >
                  All ({pdfPageCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('odd')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border border-[#c3c6d7]/60 hover:text-[#004ac6] cursor-pointer"
                >
                  Odd
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('even')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300 border border-[#c3c6d7]/60 hover:text-[#004ac6] cursor-pointer"
                >
                  Even
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('first')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f3f3fe] dark:bg-slate-800 text-[#737686] border border-[#c3c6d7]/60 hover:text-[#004ac6] cursor-pointer"
                >
                  Reset (Page 1)
                </button>
              </div>
            )}

            {/* Page Multi-select Chips */}
            {pdfPageCount > 1 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-[#737686]">Click page chips to toggle:</span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {Array.from({ length: Math.min(pdfPageCount, 24) }, (_, i) => String(i + 1)).map((pNum) => {
                    const isSelected = selectedSet.has(pNum);
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => togglePageInList(pNum)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'border-[#c3c6d7] dark:border-slate-700 bg-[#ededf9] dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:border-slate-400'
                        }`}
                        style={isSelected ? { backgroundColor: accent, borderColor: accent } : {}}
                      >
                        {isSelected ? '✓ ' : ''}Page {pNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#ededf9]/70 dark:bg-slate-800/70 border border-[#c3c6d7]/50 text-xs text-[#505f76] dark:text-slate-400">
            📄 <strong>{countSelected}</strong> page(s) selected: <strong>{selectedValue}</strong>. Each will be duplicated directly after itself in the generated PDF.
          </div>
        </div>
      );
    }

    // ── PDF TO IMAGES ──
    if (toolId === 'pdf_to_images') {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Conversion Mode</label>
            <p className="text-[11px] text-[#505f76] dark:text-slate-400">
              Extract embedded photos or convert full document pages into images.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'auto', label: '⚡ Auto (Recommended)', sub: 'Extracts pictures, or converts pages if text-only' },
              { id: 'pages', label: '📄 Every Page to Image', sub: 'Renders all pages into high-resolution images' },
              { id: 'embedded', label: '🖼️ Embedded Photos Only', sub: 'Extracts graphics and illustrations from document' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleParamChange('mode', opt.id)}
                className={`p-3 rounded-xl text-left border-2 cursor-pointer transition-all ${
                  (params.mode || 'auto') === opt.id
                    ? 'shadow-sm'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800'
                }`}
                style={(params.mode || 'auto') === opt.id ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
              >
                <div className="text-xs font-bold text-[#191b23] dark:text-white">{opt.label}</div>
                <div className="text-[10px] text-[#737686]">{opt.sub}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Output Format</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'png', label: 'PNG Image', sub: 'Lossless, Crisp' },
                { id: 'jpg', label: 'JPG Image', sub: 'Standard Photo' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => handleParamChange('format', fmt.id)}
                  className={`p-2.5 rounded-xl text-center border-2 cursor-pointer transition-all ${
                    (params.format || 'png') === fmt.id
                      ? 'shadow-sm'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800'
                  }`}
                  style={(params.format || 'png') === fmt.id ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
                >
                  <div className="text-xs font-bold text-[#191b23] dark:text-white">{fmt.label}</div>
                  <div className="text-[9px] text-[#737686]">{fmt.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── PASSWORD ──
    if (toolId === 'password_protect' || toolId === 'protect_workbook') {
      return (
        <PasswordInput
          value={params.userPassword || params.password || ''}
          onChange={(v) => {
            handleParamChange('userPassword', v);
            handleParamChange('password', v);
          }}
          accentColor={accent}
        />
      );
    }

    // ── METADATA ──
    if (toolId === 'pdf_metadata' || toolId === 'edit_pdf_metadata') {
      return <MetadataForm values={params} onChange={handleParamChange} accentColor={accent} />;
    }

    // ── FIND & REPLACE ──
    if (toolId === 'replace_text_docx') {
      return <FindReplacePanel findValue={params.targetText || ''} replaceValue={params.replacementText || ''} onFindChange={(v) => handleParamChange('targetText', v)} onReplaceChange={(v) => handleParamChange('replacementText', v)} accentColor={accent} />;
    }
    if (toolId === 'find_replace_excel') {
      return <FindReplacePanel findValue={params.targetValue || ''} replaceValue={params.replacementValue || ''} onFindChange={(v) => handleParamChange('targetValue', v)} onReplaceChange={(v) => handleParamChange('replacementValue', v)} accentColor={accent} />;
    }

    // ── PAGE SIZE ──
    if (toolId === 'images_to_pdf' || toolId === 'resize_pdf_pages') {
      return <PageSizePicker value={params.pageSize || 'A4'} onChange={(v) => handleParamChange('pageSize', v)} accentColor={accent} />;
    }

    // ── TRIM AUDIO/VIDEO ──
    if (toolId === 'trim_audio' || toolId === 'trim_video') {
      return <TimestampInput startValue={params.startTime || '00:00:00'} endValue={params.endTime || '00:00:30'} onStartChange={(v) => handleParamChange('startTime', v)} onEndChange={(v) => handleParamChange('endTime', v)} showEnd accentColor={accent} />;
    }
    if (toolId === 'generate_video_thumbnail') {
      return <TimestampInput startValue={params.timestamp || '00:00:01'} onStartChange={(v) => handleParamChange('timestamp', v)} showEnd={false} accentColor={accent} />;
    }

    // ── IMAGE FILTERS ──
    if (toolId === 'image_blur') {
      return <ImageFilterPreview paramName="sigma" value={params.sigma || '5'} onChange={(v) => handleParamChange('sigma', v)} label="Blur Amount" min={0.3} max={100} step={0.5} defaultVal={5} accentColor={accent} />;
    }
    if (toolId === 'image_sharpen') {
      return <ImageFilterPreview paramName="sigma" value={params.sigma || '2'} onChange={(v) => handleParamChange('sigma', v)} label="Sharpness" min={0.5} max={10} step={0.5} defaultVal={2} accentColor={accent} />;
    }
    if (toolId === 'image_adjust') {
      return (
        <ImageFilterPreview
          paramName="brightness" value={params.brightness || '1'} onChange={(v) => handleParamChange('brightness', v)}
          label="Brightness" min={0.1} max={3} step={0.1} defaultVal={1} accentColor={accent}
          extraSliders={[{
            paramName: 'saturation', value: params.saturation || '1', onChange: (v: string) => handleParamChange('saturation', v),
            label: 'Saturation', min: 0, max: 3, step: 0.1,
          }]}
        />
      );
    }
    if (toolId === 'gamma_image') {
      return <ImageFilterPreview paramName="gamma" value={params.gamma || '2.2'} onChange={(v) => handleParamChange('gamma', v)} label="Gamma Level" min={0.1} max={5} step={0.1} defaultVal={2.2} accentColor={accent} />;
    }

    // ── TRIM TRANSPARENT EDGES ──
    if (toolId === 'trim_transparent_edges' || toolId === 'trim_edges') {
      const mode = params.mode || 'transparent';
      const threshold = params.threshold !== undefined && params.threshold !== '' ? parseInt(params.threshold, 10) : 10;
      const padding = params.padding !== undefined && params.padding !== '' ? parseInt(params.padding, 10) : 0;

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#191b23] dark:text-white">
              Trim Detection Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'transparent', label: 'Transparent Alpha' },
                { id: 'auto', label: 'Corner Color' },
                { id: 'white', label: 'White Border' },
                { id: 'black', label: 'Black Border' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleParamChange('mode', m.id)}
                  className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                    mode === m.id
                      ? 'shadow-sm'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                  }`}
                  style={mode === m.id ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#191b23] dark:text-white">
                Tolerance / Threshold
              </label>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#191b23] dark:text-white">
                {threshold}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => handleParamChange('threshold', e.target.value)}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700"
              style={{ accentColor: accent }}
            />
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: 'Exact (0)', value: 0 },
                { label: 'Standard (10)', value: 10 },
                { label: 'Medium (25)', value: 25 },
                { label: 'Aggressive (50)', value: 50 },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleParamChange('threshold', String(p.value))}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    threshold === p.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#505f76]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#191b23] dark:text-white">
              Padding Margin (px)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 5, 10, 20].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleParamChange('padding', String(p))}
                  className={`py-2 rounded-xl text-center border-2 text-xs font-bold transition-all cursor-pointer ${
                    padding === p
                      ? 'shadow-xs'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                  }`}
                  style={padding === p ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
                >
                  {p}px
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ── DELIMITER ──
    if (toolId === 'json_to_csv') {
      return <DelimiterPicker value={params.delimiter || ','} onChange={(v) => handleParamChange('delimiter', v)} accentColor={accent} />;
    }

    // ── FORMAT JSON indent ──
    if (toolId === 'format_json') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Indentation</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: '2', label: '2 spaces' }, { id: '4', label: '4 spaces' }].map((opt) => (
              <button key={opt.id} type="button" onClick={() => handleParamChange('indent', opt.id)}
                className={`py-3 rounded-xl text-center border-2 text-xs font-bold cursor-pointer transition-all ${
                  (params.indent || '2') === opt.id ? 'shadow-sm' : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800'
                }`}
                style={(params.indent || '2') === opt.id ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      );
    }

    // ── CSV TO JSON header toggle ──
    if (toolId === 'csv_to_json') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Options</label>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 cursor-pointer">
            <input type="checkbox" checked={params.header !== 'false'} onChange={(e) => handleParamChange('header', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded" style={{ accentColor: accent }} />
            <div>
              <div className="text-xs font-bold text-[#191b23] dark:text-white">First row is header</div>
              <div className="text-[10px] text-[#737686]">Use first row as column names</div>
            </div>
          </label>
        </div>
      );
    }

    // ── MARKDOWN TO HTML wrap toggle ──
    if (toolId === 'markdown_to_html') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Options</label>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 cursor-pointer">
            <input type="checkbox" checked={params.wrapInHtml !== 'false'} onChange={(e) => handleParamChange('wrapInHtml', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded" style={{ accentColor: accent }} />
            <div>
              <div className="text-xs font-bold text-[#191b23] dark:text-white">Full HTML document</div>
              <div className="text-[10px] text-[#737686]">Wrap in complete HTML with styling</div>
            </div>
          </label>
        </div>
      );
    }

    // ── OCR Language ──
    if (toolId === 'extract_text_from_image_ocr') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">OCR Language</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'eng', label: '🇬🇧 English' },
              { id: 'spa', label: '🇪🇸 Spanish' },
              { id: 'fra', label: '🇫🇷 French' },
              { id: 'deu', label: '🇩🇪 German' },
              { id: 'hin', label: '🇮🇳 Hindi' },
              { id: 'jpn', label: '🇯🇵 Japanese' },
            ].map((lang) => (
              <button key={lang.id} type="button" onClick={() => handleParamChange('language', lang.id)}
                className={`py-2 rounded-lg text-[11px] font-bold text-center border cursor-pointer transition-all ${
                  (params.language || 'eng') === lang.id ? 'text-white shadow-sm' : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655]'
                }`}
                style={(params.language || 'eng') === lang.id ? { backgroundColor: accent, borderColor: accent } : {}}
              >{lang.label}</button>
            ))}
          </div>
        </div>
      );
    }

    // ── AI SUMMARIZER ──
    if (toolId === 'summarize_text') {
      return (
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Summary Length</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '3', label: 'Brief', sub: '3 sentences' },
              { id: '5', label: 'Standard', sub: '5 sentences' },
              { id: '10', label: 'Detailed', sub: '10 sentences' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => handleParamChange('maxSentences', opt.id)}
                className={`p-2.5 rounded-xl text-center border-2 cursor-pointer transition-all ${
                  (params.maxSentences || '5') === opt.id ? 'shadow-sm' : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800'
                }`}
                style={(params.maxSentences || '5') === opt.id ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
              >
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[9px] opacity-70">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // ── EXCEL TO CSV (All Sheets ZIP / Single Sheet) ──
    if (toolId === 'excel_to_csv') {
      const isSingleSheet = Boolean(params.sheetName && params.sheetName.trim().length > 0);

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
              Sheet Conversion Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleParamChange('sheetName', '')}
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                  !isSingleSheet
                    ? 'shadow-sm'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                }`}
                style={!isSingleSheet ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
              >
                <div className="flex items-center justify-between">
                  <span>🗂️ All Sheets (ZIP)</span>
                  {!isSingleSheet && <Check size={14} style={{ color: accent }} />}
                </div>
                <div className="text-[10px] font-normal text-[#737686] mt-0.5">
                  Separate all sheets into a ZIP
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!params.sheetName) handleParamChange('sheetName', 'Sheet1');
                }}
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                  isSingleSheet
                    ? 'shadow-sm'
                    : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                }`}
                style={isSingleSheet ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
              >
                <div className="flex items-center justify-between">
                  <span>📄 Single Sheet</span>
                  {isSingleSheet && <Check size={14} style={{ color: accent }} />}
                </div>
                <div className="text-[10px] font-normal text-[#737686] mt-0.5">
                  Export 1 specific sheet
                </div>
              </button>
            </div>
          </div>

          {isSingleSheet && (
            <div className="space-y-1.5 p-3 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700">
              <label className="text-xs font-bold text-[#191b23] dark:text-white">
                Sheet Name or Number
              </label>
              <input
                type="text"
                value={params.sheetName || ''}
                onChange={(e) => handleParamChange('sheetName', e.target.value)}
                placeholder="e.g. Sheet1, 1, Employees"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
              CSV Delimiter
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: ',', label: 'Comma (,)' },
                { id: ';', label: 'Semicolon (;)' },
                { id: '\t', label: 'Tab (\\t)' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleParamChange('delimiter', d.id)}
                  className={`py-2 px-1 rounded-xl text-center border-2 text-xs font-bold transition-all cursor-pointer ${
                    (params.delimiter || ',') === d.id
                      ? 'shadow-xs'
                      : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 text-[#434655] dark:text-slate-300'
                  }`}
                  style={(params.delimiter || ',') === d.id ? { borderColor: accent, backgroundColor: `${accent}10`, color: accent } : {}}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-[#004ac6] dark:text-blue-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Archive size={14} /> Multi-Sheet ZIP Packaging Active
            </div>
            <p className="text-[11px] leading-relaxed text-[#505f76] dark:text-slate-400">
              When an Excel file with multiple sheets (such as 3 sheets) is processed, each sheet will be converted into its own clean CSV and bundled into a ZIP archive for 1-click download.
            </p>
          </div>
        </div>
      );
    }

    // ── EXCEL TO JSON sheet name ──
    if (toolId === 'excel_to_json') {
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#191b23] dark:text-white">Sheet Name</label>
          <input type="text" value={params.sheetName || ''} onChange={(e) => handleParamChange('sheetName', e.target.value)} placeholder="Leave empty for first sheet"
            className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white placeholder-[#737686]" />
        </div>
      );
    }

    // ── ARCHIVE filename ──
    if (toolId === 'create_zip') {
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#191b23] dark:text-white">ZIP Filename</label>
          <input type="text" value={params.outputFilename || 'archive.zip'} onChange={(e) => handleParamChange('outputFilename', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white" />
        </div>
      );
    }

    // ── REMOVE CSV DUPLICATES ──
    if (toolId === 'remove_csv_duplicates') {
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#191b23] dark:text-white">Unique Column Header</label>
          <input type="text" value={params.columnHeader || ''} onChange={(e) => handleParamChange('columnHeader', e.target.value)} placeholder="Leave empty to check full row"
            className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white placeholder-[#737686]" />
        </div>
      );
    }

    // ── XML ROOT ──
    if (toolId === 'json_to_xml') {
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#191b23] dark:text-white">Root Element Name</label>
          <input type="text" value={params.rootName || 'root'} onChange={(e) => handleParamChange('rootName', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white" />
        </div>
      );
    }

    // ── EXTRACT DOCX IMAGES ──
    if (toolId === 'extract_docx_images') {
      return (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-[#004ac6]/20 dark:border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#004ac6] dark:text-blue-400">
              <Archive size={16} /> Automatic ZIP Bundling
            </div>
            <p className="text-[11px] text-[#505f76] dark:text-slate-400 leading-relaxed">
              All extracted photos, graphics, charts, and embedded media are unpacked losslessly and bundled into a single ZIP folder for instant 1-click download.
            </p>
          </div>
          <div className="space-y-2 pt-1 text-xs text-[#505f76] dark:text-slate-400">
            <div className="flex justify-between items-center py-1 border-b border-[#ededf9] dark:border-slate-800">
              <span className="font-semibold text-[#191b23] dark:text-white">Extraction Engine</span>
              <span className="font-bold text-[#004ac6] dark:text-blue-400">Direct OpenXML Stream</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#ededf9] dark:border-slate-800">
              <span className="font-semibold text-[#191b23] dark:text-white">Quality</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Original Lossless</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#ededf9] dark:border-slate-800">
              <span className="font-semibold text-[#191b23] dark:text-white">Supported Media</span>
              <span>PNG, JPG, WebP, SVG, EMF</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-[#191b23] dark:text-white">Package Format</span>
              <span className="font-bold text-[#004ac6] dark:text-blue-400">ZIP Folder</span>
            </div>
          </div>
        </div>
      );
    }

    // ── MERGE DOCX ──
    if (toolId === 'merge_docx') {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Output Filename</label>
            <input
              type="text"
              value={params.outputFilename || 'merged_document.docx'}
              onChange={(e) => handleParamChange('outputFilename', e.target.value)}
              placeholder="merged_document.docx"
              className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#191b23] dark:text-white">Document Separation</label>
            <select
              value={params.pageBreak || 'true'}
              onChange={(e) => handleParamChange('pageBreak', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white cursor-pointer"
            >
              <option value="true">Page Break (Each doc starts on new page)</option>
              <option value="false">Continuous Flow (Joined continuously)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-[#004ac6]/20 dark:border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#004ac6] dark:text-blue-400">
              <Sparkles size={15} /> High-Fidelity Alignment Preserved
            </div>
            <p className="text-[11px] text-[#505f76] dark:text-slate-400 leading-relaxed">
              All centered titles, justified paragraphs, tables, bold headings, bullet points, font styles, and images from each document are retained in exact alignment.
            </p>
          </div>
        </div>
      );
    }

    // ── FALLBACK FOR ALL TOOLS WITH PARAMETERS ──
    if (tool.parameters && tool.parameters.length > 0) {
      return (
        <div className="space-y-4">
          <div className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
            Tool Options
          </div>
          {tool.parameters.map((p) => {
            const val = params[p.name] !== undefined ? params[p.name] : (p.default !== undefined ? String(p.default) : '');
            if (p.type === 'select' && p.options) {
              return (
                <div key={p.name} className="space-y-1">
                  <label className="text-xs font-bold text-[#191b23] dark:text-white">{p.label}</label>
                  {p.description && <p className="text-[10px] text-[#737686]">{p.description}</p>}
                  <select
                    value={val}
                    onChange={(e) => handleParamChange(p.name, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white cursor-pointer"
                  >
                    {p.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (p.type === 'range') {
              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#191b23] dark:text-white">
                    <span>{p.label}</span>
                    <span style={{ color: accent }}>{val}</span>
                  </div>
                  {p.description && <p className="text-[10px] text-[#737686]">{p.description}</p>}
                  <input
                    type="range"
                    min={p.min ?? 0}
                    max={p.max ?? 100}
                    step={p.step ?? 1}
                    value={val}
                    onChange={(e) => handleParamChange(p.name, e.target.value)}
                    className="w-full cursor-pointer"
                    style={{ accentColor: accent }}
                  />
                </div>
              );
            }
            if (p.type === 'number') {
              return (
                <div key={p.name} className="space-y-1">
                  <label className="text-xs font-bold text-[#191b23] dark:text-white">{p.label}</label>
                  {p.description && <p className="text-[10px] text-[#737686]">{p.description}</p>}
                  <input
                    type="number"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    placeholder={p.placeholder}
                    onChange={(e) => handleParamChange(p.name, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
                  />
                </div>
              );
            }
            return (
              <div key={p.name} className="space-y-1">
                <label className="text-xs font-bold text-[#191b23] dark:text-white">{p.label}</label>
                {p.description && <p className="text-[10px] text-[#737686]">{p.description}</p>}
                <input
                  type="text"
                  value={val}
                  placeholder={p.placeholder}
                  onChange={(e) => handleParamChange(p.name, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
                />
              </div>
            );
          })}
        </div>
      );
    }

    // ── DEFAULT: Zero-parameter tools → NoSettingsCard ──
    return <NoSettingsCard toolName={tool.name} description={tool.description} accentColor={accent} />;
  };

  // ─── Determine which interactive canvas to show ────────
  const isImageCategory = tool.category === 'image';
  const isAudioVideo = tool.category === 'audio' || tool.category === 'video';
  const isDataCategory = tool.category === 'data' || tool.category === 'spreadsheet';
  const isPdfCategory = tool.category === 'pdf';

  const hasValidFile = files.length > 0 && files[0].size > 0;
  const showCropCanvas = tool.id === 'crop_image' && hasValidFile;
  const showBatchResizeGrid = tool.id === 'batch_resize' && files.length > 0 && files.every((f) => f.size > 0);
  const showWatermarkCanvas = (tool.id === 'watermark_image' || tool.id === 'add_watermark') && hasValidFile;
  const showThresholdStudio = tool.id === 'threshold_image' && hasValidFile;
  const showTrimStudio = (tool.id === 'trim_transparent_edges' || tool.id === 'trim_edges') && hasValidFile;
  const showPdfGrid = (['rotate_pdf', 'split_pdf', 'extract_pages', 'delete_pages', 'merge_pdf', 'rearrange_pages'].includes(tool.id) || isPdfCategory) && hasValidFile && files[0]?.name?.toLowerCase().endsWith('.pdf');
  const showImageWorkbench = isImageCategory && !showCropCanvas && !showWatermarkCanvas && !showBatchResizeGrid && !showThresholdStudio && !showTrimStudio && hasValidFile;
  const showMediaWorkbench = isAudioVideo && hasValidFile;
  const showDataWorkbench = (isDataCategory || tool.id.includes('json') || tool.id.includes('csv')) && hasValidFile;

  // 1-Click Sample File Loader for instant testing
  const handleLoadSample = async () => {
    if (tool.id === 'batch_resize') {
      // Generate 3 sample images for testing batch resize
      const samples: File[] = [];
      const presets = [
        { name: 'photo_landscape.png', c1: '#004ac6', c2: '#00A3C4', title: 'Batch Photo 1 (Landscape)', w: 800, h: 500 },
        { name: 'photo_portrait.png', c1: '#7c3aed', c2: '#db2777', title: 'Batch Photo 2 (Portrait)', w: 500, h: 800 },
        { name: 'photo_nature.png', c1: '#059669', c2: '#10b981', title: 'Batch Photo 3 (Nature)', w: 700, h: 700 },
      ];
      for (const p of presets) {
        const canvas = document.createElement('canvas');
        canvas.width = p.w;
        canvas.height = p.h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, p.w, p.h);
          grad.addColorStop(0, p.c1);
          grad.addColorStop(1, p.c2);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, p.w, p.h);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 26px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.title, p.w / 2, p.h / 2);
        }
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              samples.push(new File([blob], p.name, { type: 'image/png' }));
            }
            resolve();
          });
        });
      }
      setFiles(samples);
      return;
    }

    if (tool.id === 'trim_transparent_edges' || tool.id === 'trim_edges') {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 800, 600);
        // Draw centered rounded card with transparent borders (150px left/right, 120px top/bottom)
        const grad = ctx.createLinearGradient(150, 120, 650, 480);
        grad.addColorStop(0, '#004ac6');
        grad.addColorStop(0.5, '#7c3aed');
        grad.addColorStop(1, '#db2777');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(150, 120, 500, 360, 24);
        } else {
          ctx.rect(150, 120, 500, 360);
        }
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Universal File Toolkit', 400, 290);
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Sample Transparent Edge Trim Test', 400, 330);
      }
      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'sample-transparent-badge.png', { type: 'image/png' });
          setFiles([sampleFile]);
        }
      });
      return;
    }

    if (isImageCategory || tool.id.includes('image')) {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 800, 500);
        grad.addColorStop(0, '#004ac6');
        grad.addColorStop(0.5, '#7c3aed');
        grad.addColorStop(1, '#db2777');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 500);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Universal File Toolkit', 400, 230);
        ctx.font = '18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText('Live Interactive Testing Canvas', 400, 280);
      }
      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'sample-photo.png', { type: 'image/png' });
          setFiles([sampleFile]);
        }
      });
    } else if (tool.category === 'document' || tool.inputFormats.some((f) => f === '.docx' || f === '.doc')) {
      // Load real DOCX sample file for Word tools
      if (tool.id === 'merge_docx') {
        try {
          const [res1, res2] = await Promise.all([
            fetch('/sample-document.docx'),
            fetch('/sample-document-images.docx'),
          ]);
          if (res1.ok && res2.ok) {
            const blob1 = await res1.blob();
            const blob2 = await res2.blob();
            const file1 = new File([blob1], 'Document_Part1_Introduction.docx', {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            const file2 = new File([blob2], 'Document_Part2_Report_Media.docx', {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            setFiles([file1, file2]);
            return;
          }
        } catch {
          // fallback
        }
      }

      try {
        const sampleUrl = tool.id === 'extract_docx_images' ? '/sample-document-images.docx' : '/sample-document.docx';
        const sampleDocName = tool.id === 'extract_docx_images' ? 'sample-document-images.docx' : 'sample-document.docx';
        const res = await fetch(sampleUrl);
        if (res.ok) {
          const blob = await res.blob();
          const sampleFile = new File([blob], sampleDocName, {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
          setFiles([sampleFile]);
          return;
        }
      } catch {
        // fallback
      }
      const sampleText = "Universal File Toolkit - Sample Word Document\n\nThis is a sample document for testing Word processing tools.\nIt contains multiple paragraphs and text formatting elements.";
      const sampleFile = new File([sampleText], 'sample-document.txt', { type: 'text/plain' });
      setFiles([sampleFile]);
    } else if (tool.category === 'spreadsheet' || tool.inputFormats.some((f) => f === '.xlsx' || f === '.xls')) {
      // Load real XLSX sample file for Excel tools
      try {
        const sampleUrl = (tool.id === 'excel_to_csv' || tool.id === 'excel_to_json' || tool.id === 'merge_excel_sheets' || tool.id === 'split_workbook')
          ? '/sample-multi-sheet.xlsx'
          : '/sample-data.xlsx';
        const sampleName = (tool.id === 'excel_to_csv' || tool.id === 'excel_to_json' || tool.id === 'merge_excel_sheets' || tool.id === 'split_workbook')
          ? 'sample-multi-sheet.xlsx'
          : 'sample-data.xlsx';
        const res = await fetch(sampleUrl);
        if (res.ok) {
          const blob = await res.blob();
          const sampleFile = new File([blob], sampleName, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          setFiles([sampleFile]);
          return;
        }
      } catch {
        // fallback
      }
      const csvContent = "id,name,department,role,salary,status\n101,Sarah Connor,Security,Director,120000,Active\n102,John Doe,Engineering,Lead Architect,145000,Active\n103,Emily Clark,Design,Senior UI/UX,95000,Active\n104,Michael Chang,Product,Principal PM,135000,Active\n105,Jessica Taylor,Marketing,Growth Specialist,88000,Active";
      const sampleFile = new File([csvContent], 'sample-data.csv', { type: 'text/csv' });
      setFiles([sampleFile]);
    } else if (tool.category === 'presentation' || tool.inputFormats.some((f) => f === '.pptx' || f === '.ppt')) {
      // Load real PPTX sample file for PowerPoint tools
      try {
        const res = await fetch('/sample-presentation.pptx');
        if (res.ok) {
          const blob = await res.blob();
          const sampleFile = new File([blob], 'Smart_Portal_Management.pptx', {
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          });
          setFiles([sampleFile]);
          return;
        }
      } catch {
        // fallback
      }
    } else if (tool.category === 'ocr' || tool.id === 'extract_text_from_image_ocr') {
      // Create a crisp sample image for OCR testing
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 420);
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 26px Arial, sans-serif';
        ctx.fillText('Universal File Toolkit - OCR Test', 50, 75);
        ctx.font = 'normal 18px Arial, sans-serif';
        ctx.fillText('Optical Character Recognition extracts text from images with precision.', 50, 125);
        ctx.fillText('Sample Invoice Number: INV-2026-9481', 50, 175);
        ctx.fillText('Total Billed: $1,450.00 USD (Status: Paid)', 50, 225);
        ctx.fillText('Client Account: Global Enterprise Solutions', 50, 275);
        ctx.fillText('Date: September 15, 2026 | Verified by Antigravity', 50, 325);
      }
      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'sample-ocr-document.png', { type: 'image/png' });
          setFiles([sampleFile]);
        }
      });
      return;
    } else if (tool.category === 'ai' || ['summarize_text', 'extract_keywords', 'sentiment_analysis'].includes(tool.id)) {
      // Create rich sample text for AI document analysis
      const aiText = `Universal File Toolkit is an ultra-fast, 100% private document processing platform.
It performs Optical Character Recognition (OCR), document conversion, batch image optimization, and advanced natural language analysis.
Because all processing is executed locally and securely, confidential records, invoices, and sensitive financial reports are never exposed to external cloud servers.
The platform delivers remarkable speed, exceptional data integrity, and positive user feedback across global developer communities.`;
      const sampleFile = new File([aiText], 'sample-ai-analysis.txt', { type: 'text/plain' });
      setFiles([sampleFile]);
      return;
    } else if (tool.category === 'archive') {
      if (tool.id === 'extract_zip' || tool.id === 'list_archive_contents') {
        const emptyZipBytes = new Uint8Array([
          0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);
        const sampleFile = new File([emptyZipBytes], 'sample-archive.zip', { type: 'application/zip' });
        setFiles([sampleFile]);
        return;
      } else {
        const sampleText = "Universal File Toolkit - Sample Data File for Extra Tools Archive Compression.\nGenerated for instant local testing.";
        const sampleFile = new File([sampleText], 'sample-document.txt', { type: 'text/plain' });
        setFiles([sampleFile]);
        return;
      }
    } else if (isDataCategory || tool.id.includes('csv') || tool.id.includes('json')) {
      const csvContent = "id,name,department,role,salary,status\n101,Sarah Connor,Security,Director,120000,Active\n102,John Doe,Engineering,Lead Architect,145000,Active\n103,Emily Clark,Design,Senior UI/UX,95000,Active\n104,Michael Chang,Product,Principal PM,135000,Active\n105,Jessica Taylor,Marketing,Growth Specialist,88000,Active";
      const sampleFile = new File([csvContent], 'sample-data.csv', { type: 'text/csv' });
      setFiles([sampleFile]);
    } else {
      const sampleContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF";
      const sampleFile = new File([sampleContent], 'sample-document.pdf', { type: 'application/pdf' });
      setFiles([sampleFile]);
    }
  };

  return (
    <div className="w-full space-y-8 py-2">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-[#505f76] dark:text-slate-400">
        <Link to="/" className="flex items-center gap-1 hover:text-[#004ac6] no-underline"><Home size={14} /> Home</Link>
        <ChevronRight size={12} />
        <Link to={`/tools?category=${tool.category === 'ai' ? 'ocr' : (tool.category === 'text' ? 'data' : tool.category)}`} className="hover:text-[#004ac6] no-underline">{catTheme.name}</Link>
        <ChevronRight size={12} />
        <span className="text-[#191b23] dark:text-white font-bold">{tool.name}</span>
      </nav>

      {/* Page Header with Category Badge Tag */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="flex items-center justify-center">
          <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full border tracking-wide uppercase ${catTheme.badgeBg} ${catTheme.badgeText}`}>
            {catTheme.shortName}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191b23] dark:text-white tracking-tight">{tool.name}</h1>
        <p className="text-sm text-[#434655] dark:text-slate-400 leading-relaxed">{tool.description}</p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Interactive Canvas or Empty Dropzone */}
        <div className="lg:col-span-8 space-y-6">

          {/* STATE A: No files loaded yet → Show Hero Dropzone */}
          {files.length === 0 && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-10 text-center transition-all cursor-pointer shadow-md border-2 border-dashed flex flex-col items-center justify-center gap-4 ${colors.border} ${
                  isDragActive ? `${colors.bgLight} ${colors.bgDark} scale-[1.01]` : 'hover:shadow-lg'
                }`}
              >
                <input {...getInputProps()} />
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-inner transition-transform group-hover:scale-110 animate-pulse"
                  style={{ backgroundColor: `${colors.main}15`, color: colors.main }}
                >
                  <UploadCloud size={44} />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-xl font-extrabold text-[#191b23] dark:text-white">
                    Choose your {tool.inputFormats[0]?.toUpperCase() || 'file'} or drag & drop here
                  </h3>
                  <p className="text-xs text-[#505f76] dark:text-slate-400">
                    Supports {tool.inputFormats.join(', ').toUpperCase()} • Up to {(tool.maxFileSize / (1024 * 1024 * 1024)).toFixed(0)} GB
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                    style={{ backgroundColor: colors.main }}
                  >
                    <UploadCloud size={18} /> + Select Files
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample();
                    }}
                    className="px-4 py-3 rounded-xl font-bold text-xs bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-[#434655] dark:text-slate-200 hover:text-[#004ac6] shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    ⚡ Try with Sample
                  </button>
                </div>
              </div>

              {/* Feature Trust Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#c3c6d7]/70 dark:border-slate-800 shadow-xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-sm font-bold">⚡</div>
                  <div>
                    <div className="text-xs font-bold text-[#191b23] dark:text-white">Instant Speed</div>
                    <div className="text-[10px] text-[#737686]">Zero waiting queues</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#c3c6d7]/70 dark:border-slate-800 shadow-xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600 bg-blue-50 dark:bg-blue-950/40 text-sm font-bold">🔒</div>
                  <div>
                    <div className="text-xs font-bold text-[#191b23] dark:text-white">100% Private</div>
                    <div className="text-[10px] text-[#737686]">Auto-deleted in 1 hour</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#c3c6d7]/70 dark:border-slate-800 shadow-xs flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-purple-600 bg-purple-50 dark:bg-purple-950/40 text-sm font-bold">✨</div>
                  <div>
                    <div className="text-xs font-bold text-[#191b23] dark:text-white">Full Quality</div>
                    <div className="text-[10px] text-[#737686]">High-fidelity output</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATE B: File is Loaded → Direct Manipulation Workbenches */}
          {showCropCanvas && files.length > 0 && (
            <VisualImageCropper
              imageFile={files[0]}
              cropValues={
                params.width && params.height
                  ? {
                      left: parseInt(params.left || '0', 10),
                      top: parseInt(params.top || '0', 10),
                      width: parseInt(params.width, 10),
                      height: parseInt(params.height, 10),
                    }
                  : undefined
              }
              aspectRatio={params.ratio || 'free'}
              onAspectRatioChange={(r) => handleParamChange('ratio', r)}
              accentColor={colors.main}
              onCropChange={({ left, top, width, height }) => {
                setParams((prev) => ({
                  ...prev,
                  left: String(left),
                  top: String(top),
                  width: String(width),
                  height: String(height),
                }));
              }}
            />
          )}

          {/* Dedicated Multi-Image Queue for Batch Resize */}
          {showBatchResizeGrid && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#ededf9] dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: colors.main }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#191b23] dark:text-white">
                      Batch Resize Queue ({files.length} {files.length === 1 ? 'image' : 'images'})
                    </h4>
                    <p className="text-[11px] text-[#737686]">
                      Target size: <span className="font-semibold text-[#191b23] dark:text-white">{params.width || '1920'} × {params.height || '1080'} px</span> • Mode: <span className="font-semibold capitalize text-[#191b23] dark:text-white">{params.fit || 'inside'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div {...getRootProps()} className="px-3 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/70 dark:border-slate-700 text-xs font-bold text-[#004ac6] dark:text-blue-400 hover:bg-[#ededf9] cursor-pointer flex items-center gap-1.5 transition-colors">
                    <input {...getInputProps()} />
                    <Plus size={14} /> Add Images
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#E53E3E] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Multi-Image Thumbnail Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto p-1">
                {files.map((file, idx) => (
                  <BatchImageCard
                    key={`${file.name}-${idx}`}
                    file={file}
                    onRemove={() => removeFile(idx)}
                  />
                ))}

                {/* Dropzone tile to add more */}
                <div
                  {...getRootProps()}
                  className="aspect-square rounded-xl border-2 border-dashed border-[#c3c6d7] dark:border-slate-700 hover:border-[#004ac6] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all group"
                >
                  <input {...getInputProps()} />
                  <div className="w-8 h-8 rounded-full bg-[#f3f3fe] dark:bg-slate-800 text-[#004ac6] dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Plus size={18} />
                  </div>
                  <span className="text-xs font-bold text-[#191b23] dark:text-white">Add More</span>
                  <span className="text-[10px] text-[#737686]">Drop images</span>
                </div>
              </div>

              {/* Information / ZIP Packaging Notice */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs text-[#004ac6] dark:text-blue-300">
                <Archive size={18} className="flex-shrink-0" />
                <span>
                  All {files.length} images will be resized simultaneously and bundled into a single organized <strong className="font-bold">ZIP folder (.zip)</strong> for instant one-click download.
                </span>
              </div>
            </div>
          )}

          {showThresholdStudio && (
            <VisualThresholdStudio
              imageFile={files[0]}
              threshold={parseInt(params.threshold || '128', 10)}
              onThresholdChange={(val) => handleParamChange('threshold', String(val))}
              invert={params.invert === 'true'}
              onInvertChange={(inv) => handleParamChange('invert', inv ? 'true' : 'false')}
              backgroundMode={(params.background as 'transparent' | 'white') || 'transparent'}
              onBackgroundModeChange={(bg) => handleParamChange('background', bg)}
              accentColor={colors.main}
              onApply={handleRun}
              processing={processing}
            />
          )}

          {showWatermarkCanvas && (
            <VisualWatermarkEditor
              imageFile={files[0]}
              text={params.text ?? 'CONFIDENTIAL'}
              position={params.position || 'center'}
              opacity={params.opacity ? parseFloat(params.opacity) : 0.6}
              fontSize={params.fontSize ? parseInt(params.fontSize, 10) : 36}
              color={params.color || '#ffffff'}
              angle={params.angle !== undefined && params.angle !== '' ? parseFloat(params.angle) : -30}
              accentColor={colors.main}
              onWatermarkChange={({ text, opacity, fontSize, color, position, angle }) => {
                handleParamChange('text', text);
                handleParamChange('opacity', String(opacity));
                handleParamChange('fontSize', String(fontSize));
                handleParamChange('color', color);
                handleParamChange('position', position);
                handleParamChange('angle', String(angle));
              }}
              onApply={handleRun}
              processing={processing}
            />
          )}

          {showTrimStudio && (
            <VisualTrimStudio
              imageFile={files[0]}
              mode={params.mode || 'transparent'}
              onModeChange={(m) => handleParamChange('mode', m)}
              threshold={params.threshold !== undefined && params.threshold !== '' ? parseInt(params.threshold, 10) : 10}
              onThresholdChange={(val) => handleParamChange('threshold', String(val))}
              padding={params.padding !== undefined && params.padding !== '' ? parseInt(params.padding, 10) : 0}
              onPaddingChange={(val) => handleParamChange('padding', String(val))}
              accentColor={colors.main}
              onApply={handleRun}
              processing={processing}
            />
          )}

          {showImageWorkbench && (
            <InteractiveImageWorkbench
              imageFile={files[0]}
              toolId={tool.id}
              params={params}
              accentColor={colors.main}
              onRotate={(angle) => handleParamChange('angle', angle)}
              onFlip={(dir) => handleParamChange('direction', dir)}
            />
          )}

          {showMediaWorkbench && (
            <InteractiveMediaWorkbench
              mediaFile={files[0]}
              toolId={tool.id}
              startTime={params.startTime}
              endTime={params.endTime}
              onStartTimeChange={(t) => handleParamChange('startTime', t)}
              onEndTimeChange={(t) => handleParamChange('endTime', t)}
              accentColor={colors.main}
            />
          )}

          {showPdfGrid && (
            <PdfPageGridEditor
              files={files}
              toolId={tool.id}
              selectedPages={
                tool.id === 'rearrange_pages'
                  ? (params.order || '')
                  : tool.id === 'duplicate_pages'
                  ? (params.page || params.pages || '1')
                  : (params.pages || params.ranges)
              }
              onSelectedPagesChange={(pagesCsv) => {
                if (tool.id === 'split_pdf') handleParamChange('ranges', pagesCsv);
                else if (tool.id === 'duplicate_pages') {
                  handleParamChange('page', pagesCsv);
                  handleParamChange('pages', pagesCsv);
                } else if (tool.id === 'rearrange_pages') {
                  handleParamChange('order', pagesCsv);
                } else {
                  handleParamChange('pages', pagesCsv);
                }
              }}
              onPageSequenceChange={(sequence) => {
                if (tool.id === 'rearrange_pages') {
                  handleParamChange('order', sequence.join(', '));
                }
              }}
              accentColor={colors.main}
            />
          )}

          {showDataWorkbench && (
            <InteractiveDataWorkbench
              dataFile={files[0]}
              toolId={tool.id}
              delimiter={params.delimiter}
              accentColor={colors.main}
            />
          )}

          {tool.id === 'extract_docx_images' && files.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#004ac6] text-white flex items-center justify-center shadow-md flex-shrink-0">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#191b23] dark:text-white">{files[0].name}</h4>
                  <p className="text-xs text-[#505f76] dark:text-slate-400">
                    {(files[0].size / 1024).toFixed(1)} KB • Microsoft Word Document
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-[#004ac6]/15 dark:border-blue-500/20 text-xs text-[#505f76] dark:text-slate-300 space-y-2">
                <div className="font-bold text-[#004ac6] dark:text-blue-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Ready to Extract Embedded Images
                </div>
                <p className="leading-relaxed">
                  Click <strong>Extract Images &amp; Download ZIP</strong> to scan the document, extract all embedded graphics, photos, and figures losslessly in original resolution, and bundle them into an organized ZIP archive.
                </p>
              </div>
            </div>
          )}

          {tool.id === 'merge_docx' && files.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#ededf9] dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-[#004ac6] shadow-sm">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#191b23] dark:text-white">
                      Word Documents to Merge ({files.length} {files.length === 1 ? 'file' : 'files'})
                    </h4>
                    <p className="text-[11px] text-[#737686]">
                      {files.length >= 2 ? 'Documents will be merged in the exact sequence shown below.' : 'Please add at least 1 more Word document to merge.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div {...getRootProps()} className="px-3 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/70 dark:border-slate-700 text-xs font-bold text-[#004ac6] dark:text-blue-400 hover:bg-[#ededf9] cursor-pointer flex items-center gap-1.5 transition-colors">
                    <input {...getInputProps()} />
                    <Plus size={14} /> Add Word Document
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#E53E3E] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Document Sequence List with Move Up / Move Down & Delete */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#f3f3fe] dark:bg-slate-800/90 border border-[#c3c6d7]/70 dark:border-slate-700 gap-3 shadow-2xs hover:border-[#004ac6]/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#004ac6] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#004ac6] dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#191b23] dark:text-white truncate max-w-[280px] sm:max-w-[360px]">
                          {file.name}
                        </h5>
                        <p className="text-[10px] text-[#737686]">
                          {(file.size / 1024).toFixed(1)} KB • Part {idx + 1} of {files.length}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const newFiles = [...files];
                          const temp = newFiles[idx - 1];
                          newFiles[idx - 1] = newFiles[idx];
                          newFiles[idx] = temp;
                          setFiles(newFiles);
                        }}
                        title="Move Up"
                        className="p-1.5 rounded-lg text-[#505f76] dark:text-slate-400 hover:text-[#004ac6] hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === files.length - 1}
                        onClick={() => {
                          const newFiles = [...files];
                          const temp = newFiles[idx + 1];
                          newFiles[idx + 1] = newFiles[idx];
                          newFiles[idx] = temp;
                          setFiles(newFiles);
                        }}
                        title="Move Down"
                        className="p-1.5 rounded-lg text-[#505f76] dark:text-slate-400 hover:text-[#004ac6] hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        title="Remove Document"
                        className="p-1.5 rounded-lg text-[#737686] hover:text-[#E53E3E] hover:bg-red-50 dark:hover:bg-red-950/30 ml-1 cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Merge Flow Guidance */}
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-slate-800/50 border border-[#004ac6]/15 dark:border-blue-500/20 text-xs text-[#505f76] dark:text-slate-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#004ac6] dark:text-blue-400">Merge Sequence:</span>
                  <span className="text-[11px] font-medium truncate max-w-[340px]">
                    {files.map(f => f.name).join(' ➔ ')}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-shrink-0">
                  <Check size={13} /> Aligned OpenXML Flow
                </span>
              </div>
            </div>
          )}

          {/* STATE C: Document / Generic File Loaded Hero Card */}
          {files.length > 0 && !showCropCanvas && !showBatchResizeGrid && !showWatermarkCanvas && !showThresholdStudio && !showTrimStudio && !showPdfGrid && !showImageWorkbench && !showMediaWorkbench && !showDataWorkbench && tool.id !== 'extract_docx_images' && tool.id !== 'merge_docx' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 p-6 shadow-sm space-y-5">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    File Loaded &amp; Ready
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <div {...getRootProps()} className="flex items-center gap-1.5 text-xs font-bold text-[#004ac6] dark:text-blue-400 hover:underline cursor-pointer">
                    <input {...getInputProps()} />
                    <UploadCloud size={15} /> Change File
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="flex items-center gap-1 text-xs font-bold text-[#E53E3E] hover:underline cursor-pointer"
                  >
                    <Trash2 size={14} /> Clear all
                  </button>
                </div>
              </div>

              {/* Primary File Hero Display */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xs flex-shrink-0"
                  style={{ backgroundColor: colors.main }}
                >
                  {tool.category === 'spreadsheet' ? (
                    <FileSpreadsheet size={28} />
                  ) : tool.category === 'data' ? (
                    <FileCode size={28} />
                  ) : (
                    <FileText size={28} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {files[0].name}
                    </h5>
                    {files[0].size === 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex-shrink-0">
                        Empty File
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0 flex items-center gap-1">
                        <Check size={11} /> Ready
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {files[0].size === 0
                        ? '0 Bytes'
                        : files[0].size > 1024 * 1024
                        ? `${(files[0].size / (1024 * 1024)).toFixed(2)} MB`
                        : `${(files[0].size / 1024).toFixed(1)} KB`}
                    </span>
                    <span>•</span>
                    <span className="uppercase font-semibold">
                      {files[0].name.split('.').pop() || 'FILE'}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Uploaded &amp; ready to process
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-file list if more than 1 file */}
              {files.length > 1 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Additional files in queue ({files.length - 1}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {files.slice(1).map((file, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                          file.size === 0
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : 'bg-[#f3f3fe] dark:bg-slate-800 border-[#c3c6d7]/60 dark:border-slate-700/60 text-[#191b23] dark:text-white'
                        }`}
                      >
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <span className="text-[10px] text-[#737686]">
                          {file.size === 0 ? '(0 B)' : `(${(file.size / 1024).toFixed(1)} KB)`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i + 1)}
                          className="text-[#737686] hover:text-[#E53E3E] ml-1 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Action Instructions */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/20 text-[#004ac6] dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  ✨
                </div>
                <div>
                  <p className="font-semibold">File is already uploaded and configured.</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Adjust any desired options in the sidebar, then click <strong className="underline font-bold">Run {tool.name} Now</strong> to start processing immediately.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings Panel */}
        <div className="lg:col-span-4 sticky top-24">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#c3c6d7] dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="pb-3 border-b border-[#ededf9] dark:border-slate-800">
              <h3 className="text-base font-bold text-[#191b23] dark:text-white flex items-center gap-2">
                <Sliders size={18} style={{ color: colors.main }} />
                {tool.name} Settings
              </h3>
            </div>

            {renderSettingsPanel()}

            {/* Action / Proceed Button */}
            <div className="pt-2 border-t border-[#ededf9] dark:border-slate-800 space-y-3">
              {(error || files.some((f) => f.size === 0)) && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="font-semibold">{error || 'The File You have uploaded is empty'}</span>
                </div>
              )}
              <button onClick={handleRun} disabled={processing || (tool.id === 'merge_docx' && files.length < 2)}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: colors.main }}>
                {processing ? (
                  <><RefreshCw size={18} className="animate-spin" /> Processing...</>
                ) : tool.id === 'watermark_image' ? (
                  <><Play size={18} /> Apply Watermark &amp; Download</>
                ) : tool.id === 'trim_transparent_edges' || tool.id === 'trim_edges' ? (
                  <><Play size={18} /> Apply Trim &amp; Download</>
                ) : tool.id === 'threshold_image' ? (
                  <><Play size={18} /> Apply Threshold ({params.threshold || '128'}) &amp; Download</>
                ) : tool.id === 'excel_to_csv' ? (
                  <><Play size={18} /> Convert Excel to CSV &amp; Download</>
                ) : tool.id === 'extract_docx_images' ? (
                  <><Play size={18} /> Extract Images &amp; Download ZIP</>
                ) : tool.id === 'split_workbook' ? (
                  <><Play size={18} /> Split Excel Workbook &amp; Download</>
                ) : tool.id === 'protect_workbook' ? (
                  <><Play size={18} /> Protect Excel Workbook &amp; Download</>
                ) : tool.id === 'password_protect' ? (
                  <><Play size={18} /> Protect PDF &amp; Download</>
                ) : tool.id === 'merge_docx' ? (
                  files.length < 2 ? (
                    <><Play size={18} /> Add At Least 2 Word Docs to Merge</>
                  ) : (
                    <><Play size={18} /> Merge {files.length} Word Documents &amp; Download</>
                  )
                ) : (
                  <><Play size={18} /> Run {tool.name} Now</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Result Box */}
      {result && result.outputFiles && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={24} />
            <div>
              <h3 className="font-bold text-base text-[#191b23] dark:text-white">{tool.name} Completed!</h3>
              <p className="text-xs text-[#505f76] dark:text-slate-400">Processed in {result.duration || 120}ms</p>
            </div>
          </div>
          <div className="space-y-3">
            {result.outputFiles.map((file) => {
              const isZip = file.name.toLowerCase().endsWith('.zip') || file.mimeType === 'application/zip';
              const isImage = !isZip && (file.mimeType?.startsWith('image/') || /\.(png|webp|jpg|jpeg)$/i.test(file.name));
              const containedFiles = (result.metadata?.containedFiles as Array<{ name: string; size: number }>) || [];

              if (isZip) {
                return (
                  <div
                    key={file.id || file.name}
                    className="flex flex-col p-5 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-800 dark:to-slate-800/80 border-2 border-[#004ac6]/30 dark:border-blue-500/30 gap-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                          <Archive size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-[#191b23] dark:text-white">{file.name}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                              ZIP ARCHIVE
                            </span>
                          </div>
                          <p className="text-xs text-[#505f76] dark:text-slate-400 mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB • {tool.id === 'excel_to_csv' ? 'All Excel sheets separated into individual CSV files' : tool.id === 'excel_to_json' ? 'All Excel sheets separated into individual JSON files' : tool.id === 'split_workbook' ? 'All Excel sheets split into separate well-structured Excel workbooks' : tool.id === 'batch_resize' ? 'All resized images bundled into a single ZIP folder' : tool.id === 'extract_docx_images' ? 'All embedded Word images extracted into a single ZIP folder' : tool.id === 'extract_pptx_images' ? 'All embedded PowerPoint images extracted into a single ZIP folder' : 'All files bundled into a single ZIP folder'}
                          </p>
                        </div>
                      </div>
                      <a
                        href={file.downloadUrl}
                        download={file.name}
                        className="px-6 py-3.5 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 no-underline hover:scale-[1.02] transition-all flex-shrink-0 cursor-pointer"
                        style={{ backgroundColor: colors.main }}
                      >
                        <Download size={18} /> Download ZIP Folder
                      </a>
                    </div>

                    {/* Contained Files Preview */}
                    {containedFiles.length > 0 && (
                      <div className="pt-3 border-t border-[#c3c6d7]/50 dark:border-slate-700/60">
                        <div className="text-[11px] font-bold text-[#505f76] dark:text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                          <Layers size={13} />
                          {tool.id === 'excel_to_csv' ? `Separated Sheet CSV Files (${containedFiles.length}):` : tool.id === 'excel_to_json' ? `Separated Sheet JSON Files (${containedFiles.length}):` : tool.id === 'split_workbook' ? `Split Excel Sheet Workbooks (${containedFiles.length}):` : tool.id === 'extract_docx_images' ? `Extracted Word Images (${containedFiles.length}):` : tool.id === 'extract_pptx_images' ? `Extracted PowerPoint Images (${containedFiles.length}):` : `Files Packaged Inside ZIP (${containedFiles.length}):`}
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                          {containedFiles.map((cf, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7]/60 dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white flex items-center gap-1.5 shadow-2xs"
                            >
                              {tool.id === 'excel_to_csv' || cf.name.endsWith('.csv') ? (
                                <FileSpreadsheet size={13} className="text-[#004ac6] dark:text-blue-400" />
                              ) : tool.id === 'excel_to_json' || cf.name.endsWith('.json') ? (
                                <FileCode size={13} className="text-[#004ac6] dark:text-blue-400" />
                              ) : tool.id === 'split_workbook' || cf.name.endsWith('.xlsx') ? (
                                <FileSpreadsheet size={13} className="text-[#004ac6] dark:text-blue-400" />
                              ) : (
                                <ImageIcon size={13} className="text-[#004ac6] dark:text-blue-400" />
                              )}
                              <span className="truncate max-w-[180px]">{cf.name}</span>
                              <span className="text-[10px] text-[#737686]">({(cf.size / 1024).toFixed(1)} KB)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={file.id || file.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/60 dark:border-slate-700/60 gap-4">
                  <div className="flex items-center gap-3">
                    {isImage ? (
                      <div className="w-14 h-14 rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-inner bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:10px_10px] bg-[position:0_0,0_5px,5px_-5px,-5px_0]">
                        <img src={file.downloadUrl} alt={file.name} className="max-w-full max-h-full object-contain p-1" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                        <FileText size={22} style={{ color: colors.main }} />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-[#191b23] dark:text-white break-all">{file.name}</h4>
                      <p className="text-xs text-[#505f76] dark:text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB {isImage && '• Transparent Cutout Ready'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={file.downloadUrl}
                    download={file.name}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 no-underline hover:opacity-95 hover:scale-[1.02] transition-all flex-shrink-0 cursor-pointer"
                    style={{ backgroundColor: colors.main }}
                  >
                    <Download size={15} /> {tool.id === 'watermark_image' ? 'Download Watermarked Image' : (tool.id === 'trim_transparent_edges' || tool.id === 'trim_edges' ? 'Download Trimmed Image' : tool.id === 'excel_to_csv' ? 'Download CSV File' : tool.id === 'merge_docx' ? 'Download Merged Word Document' : 'Download File')}
                  </a>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
