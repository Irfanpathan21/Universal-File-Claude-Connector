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

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  Home, ChevronRight, UploadCloud, FileText, Trash2, X, Play,
  Download, CheckCircle2, RefreshCw, Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchTool, processTool } from '../lib/api';
import type { ToolInfo, ApiToolResponse, ToolParameter } from '../lib/api';
import { useUIStore } from '../stores/ui';
import { CATEGORIES_CONFIG } from '../config/categories';

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

export function ToolPage() {
  const { id } = useParams<{ id: string }>();
  const [tool, setTool] = useState<ToolInfo | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ApiToolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addToHistory = useUIStore((s) => s.addToHistory);

  // Load tool and initialize smart defaults
  useEffect(() => {
    if (!id) return;
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
          crop_image: { left: '100', top: '100', width: '800', height: '600' },
          resize_image: { width: '1920', height: '1080', fit: 'inside' },
          batch_resize: { width: '1920', height: '1080', fit: 'inside' },
          generate_thumbnail: { width: '200', height: '200' },
          rotate_image: { angle: '90' },
          rotate_pdf: { angle: '90' },
          flip_image: { direction: 'horizontal' },
          compress_pdf: { quality: 'medium' },
          compress_image: { quality: '80' },
          compress_video: { quality: 'medium' },
          convert_image: { format: 'webp', quality: '90' },
          convert_audio: { targetFormat: 'mp3' },
          extract_audio_from_video: { targetFormat: 'mp3' },
          watermark_image: { text: 'CONFIDENTIAL', opacity: '0.6', fontSize: '36', color: '#ffffff', position: 'center' },
          add_watermark: { text: 'CONFIDENTIAL', opacity: '0.3', fontSize: '48', position: 'center' },
          add_page_numbers: { position: 'bottom-center', format: 'numeric', startNumber: '1', fontSize: '12' },
          password_protect: { userPassword: '' },
          protect_workbook: { password: '' },
          images_to_pdf: { pageSize: 'A4' },
          resize_pdf_pages: { pageSize: 'A4' },
          json_to_csv: { delimiter: ',' },
          csv_to_json: { header: 'true' },
          format_json: { indent: '2' },
          image_blur: { sigma: '5' },
          image_sharpen: { sigma: '2' },
          image_adjust: { brightness: '1', saturation: '1' },
          gamma_image: { gamma: '2.2' },
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
        setFiles([]);
        setResult(null);
        setError(null);
      } catch (err) {
        toast.error('Failed to load tool configuration');
      }
    }
    load();
  }, [id]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: tool?.maxFiles || 100 });

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleParamChange = useCallback((name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRun = async () => {
    if (!tool) return;
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

  if (!tool) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const catTheme = CATEGORIES_CONFIG[tool.category] || CATEGORIES_CONFIG.pdf;
  const colors = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.default;

  // ─── Render the sidebar settings panel for each tool ────────────
  const renderSettingsPanel = () => {
    const toolId = tool.id;
    const accent = colors.main;

    // ── CROP ──
    if (toolId === 'crop_image') {
      return (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Crop Region</div>
          <div className="p-3 rounded-lg border border-dashed" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}06` }}>
            <div className="text-xs font-bold" style={{ color: accent }}>
              {params.width || 800} × {params.height || 600} px
            </div>
            <div className="text-[10px] text-[#737686] mt-0.5">
              Offset: X {params.left || 100}, Y {params.top || 100}
            </div>
          </div>
          <div className="text-[10px] text-[#737686]">
            Use the visual canvas on the left to drag and resize the crop area.
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
            <input type="text" value={params.text || 'CONFIDENTIAL'} onChange={(e) => handleParamChange('text', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#ededf9] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['CONFIDENTIAL', 'SAMPLE', 'DRAFT', 'DO NOT COPY', '© 2026'].map((txt) => (
              <button key={txt} type="button" onClick={() => handleParamChange('text', txt)}
                className="px-2 py-1 rounded bg-[#ededf9] dark:bg-slate-800 text-[10px] font-bold text-[#505f76] hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer">{txt}</button>
            ))}
          </div>
          <PositionPicker value={params.position || 'center'} onChange={(v) => handleParamChange('position', v)} accentColor={accent} />
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
      return <PageRangeInput value={params[paramName] || ''} onChange={(v) => handleParamChange(paramName, v)} accentColor={accent} />;
    }
    if (toolId === 'rearrange_pages') {
      return <PageRangeInput value={params.order || ''} onChange={(v) => handleParamChange('order', v)} accentColor={accent} mode="order" />;
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
          <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">Swap Pages</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-semibold text-[#737686]">Page A</span>
              <input type="number" min="1" value={params.pageA || '1'} onChange={(e) => handleParamChange('pageA', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-bold text-[#191b23] dark:text-white text-center" />
            </div>
            <div className="text-2xl font-bold mt-4" style={{ color: accent }}>⇄</div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-semibold text-[#737686]">Page B</span>
              <input type="number" min="1" value={params.pageB || '2'} onChange={(e) => handleParamChange('pageB', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-bold text-[#191b23] dark:text-white text-center" />
            </div>
          </div>
        </div>
      );
    }

    // ── PASSWORD ──
    if (toolId === 'password_protect') {
      return <PasswordInput value={params.userPassword || ''} onChange={(v) => handleParamChange('userPassword', v)} accentColor={accent} />;
    }
    if (toolId === 'protect_workbook') {
      return <PasswordInput value={params.password || ''} onChange={(v) => handleParamChange('password', v)} accentColor={accent} />;
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

    // ── EXCEL/SPREADSHEET sheet name ──
    if (['excel_to_csv', 'excel_to_json'].includes(toolId)) {
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

    // ── DEFAULT: Zero-parameter tools → NoSettingsCard ──
    return <NoSettingsCard toolName={tool.name} description={tool.description} accentColor={accent} />;
  };

  // ─── Determine which interactive canvas to show ────────
  const isImageCategory = tool.category === 'image';
  const isAudioVideo = tool.category === 'audio' || tool.category === 'video';
  const isDataCategory = tool.category === 'data' || tool.category === 'spreadsheet';
  const isPdfCategory = tool.category === 'pdf';

  const showCropCanvas = tool.id === 'crop_image';
  const showWatermarkCanvas = (tool.id === 'watermark_image' || tool.id === 'add_watermark') && files.length > 0;
  const showPdfGrid = (['rotate_pdf', 'split_pdf', 'extract_pages', 'delete_pages', 'merge_pdf', 'rearrange_pages'].includes(tool.id) || isPdfCategory) && files.length > 0 && files[0]?.name?.toLowerCase().endsWith('.pdf');
  const showImageWorkbench = (isImageCategory || tool.id.includes('image')) && !showCropCanvas && !showWatermarkCanvas && files.length > 0;
  const showMediaWorkbench = isAudioVideo && files.length > 0;
  const showDataWorkbench = (isDataCategory || tool.id.includes('json') || tool.id.includes('csv')) && files.length > 0;

  // 1-Click Sample File Loader for instant testing
  const handleLoadSample = () => {
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
        <Link to={`/tools?category=${tool.category}`} className="hover:text-[#004ac6] no-underline">{catTheme.name}</Link>
        <ChevronRight size={12} />
        <span className="text-[#191b23] dark:text-white font-bold">{tool.name}</span>
      </nav>

      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#191b23] dark:text-white tracking-tight">{tool.name}</h1>
        <p className="text-sm text-[#434655] dark:text-slate-400 leading-relaxed">{tool.description}</p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Interactive Canvas or Empty Dropzone */}
        <div className="lg:col-span-8 space-y-6">

          {/* STATE A: No files loaded yet → Show Hero Dropzone */}
          {files.length === 0 && !showCropCanvas && (
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
          {showCropCanvas && (
            <VisualImageCropper
              imageFile={files.length > 0 ? files[0] : null}
              accentColor={colors.main}
              onCropChange={({ left, top, width, height }) => {
                handleParamChange('left', String(left));
                handleParamChange('top', String(top));
                handleParamChange('width', String(width));
                handleParamChange('height', String(height));
              }}
            />
          )}

          {showWatermarkCanvas && (
            <VisualWatermarkEditor
              imageFile={files[0]}
              accentColor={colors.main}
              onWatermarkChange={({ text, opacity, fontSize, color, position }) => {
                handleParamChange('text', text);
                handleParamChange('opacity', String(opacity));
                handleParamChange('fontSize', String(fontSize));
                handleParamChange('color', color);
                handleParamChange('position', position);
              }}
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
              selectedPages={params.pages || params.ranges}
              onSelectedPagesChange={(pagesCsv) => {
                if (tool.id === 'split_pdf') handleParamChange('ranges', pagesCsv);
                else handleParamChange('pages', pagesCsv);
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

          {/* File management bar when files exist */}
          {files.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div {...getRootProps()} className="flex items-center gap-2 text-xs font-bold text-[#004ac6] dark:text-blue-400 hover:underline cursor-pointer">
                  <input {...getInputProps()} />
                  <UploadCloud size={16} /> + Add or replace files ({files.length} loaded)
                </div>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="flex items-center gap-1 text-xs font-bold text-[#E53E3E] hover:underline cursor-pointer"
                >
                  <Trash2 size={14} /> Clear all
                </button>
              </div>

              {/* File Pill List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/60 dark:border-slate-700/60 text-xs font-semibold text-[#191b23] dark:text-white">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-[10px] text-[#737686]">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-[#737686] hover:text-[#E53E3E] ml-1 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
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

            {/* Action Button */}
            <div className="pt-2 border-t border-[#ededf9] dark:border-slate-800">
              <button onClick={handleRun} disabled={processing}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ backgroundColor: colors.main }}>
                {processing ? (<><RefreshCw size={18} className="animate-spin" /> Processing...</>) : (<><Play size={18} /> Run {tool.name} Now</>)}
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
          <div className="space-y-2">
            {result.outputFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7]/60 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <FileText size={20} style={{ color: colors.main }} />
                  <div>
                    <h4 className="text-xs font-bold text-[#191b23] dark:text-white">{file.name}</h4>
                    <p className="text-[11px] text-[#505f76] dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <a href={file.downloadUrl} download={file.name}
                  className="px-4 py-2 rounded-lg text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 no-underline hover:opacity-90"
                  style={{ backgroundColor: colors.main }}>
                  <Download size={14} /> Download
                </a>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
