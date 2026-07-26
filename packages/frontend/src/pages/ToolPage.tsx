/**
 * ToolPage — Execution page for an individual tool
 * Drag & Drop upload, parameters config, progress tracking, and file download
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, File, X, Play, Download, ArrowLeft,
  CheckCircle2, AlertCircle, RefreshCw, FileText, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchTool, processTool } from '../lib/api';
import type { ToolInfo, ApiToolResponse } from '../lib/api';
import { useUIStore } from '../stores/ui';

export function ToolPage() {
  const { id } = useParams<{ id: string }>();
  const [tool, setTool] = useState<ToolInfo | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ApiToolResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addToHistory = useUIStore((s) => s.addToHistory);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const t = await fetchTool(id!);
        setTool(t);
        // Initialize default parameter values
        const defaults: Record<string, string> = {};
        t.parameters.forEach((p) => {
          if (p.default !== undefined) {
            defaults[p.name] = String(p.default);
          }
        });
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: tool?.maxFiles || 100,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleRun = async () => {
    if (!tool || files.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const res = await processTool(tool.id, files, params);
      setResult(res);
      toast.success(res.message || 'Operation completed successfully!');

      addToHistory({
        toolId: tool.id,
        toolName: tool.name,
        files: files.map((f) => f.name),
        status: 'completed',
        downloadUrls: res.outputFiles?.map((f) => f.downloadUrl),
      });
    } catch (err: any) {
      const msg = err.message || 'An error occurred during processing';
      setError(msg);
      toast.error(msg);

      addToHistory({
        toolId: tool.id,
        toolName: tool.name,
        files: files.map((f) => f.name),
        status: 'failed',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!tool) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back button */}
      <Link to="/tools" className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 no-underline"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={14} /> Back to Tools
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="badge badge-brand text-xs uppercase font-bold tracking-wider">{tool.category}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Max files: {tool.maxFiles}</span>
        </div>
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>{tool.name}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tool.description}</p>
      </div>

      {/* Upload Zone */}
      <div className="mb-8">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <UploadCloud size={44} className="mx-auto mb-3" style={{ color: 'var(--color-brand-400)' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {isDragActive ? 'Drop your files here' : 'Drag & drop files here, or click to browse'}
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Supported formats: {tool.inputFormats.join(', ')}
          </p>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              <span>Uploaded Files ({files.length})</span>
              <button onClick={() => setFiles([])} className="hover:text-red-400">Clear all</button>
            </div>
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center gap-3 truncate">
                  <File size={18} style={{ color: 'var(--color-brand-400)' }} />
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button onClick={() => removeFile(i)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Options & Configuration */}
      {tool.parameters.length > 0 && (
        <div className="glass-card p-6 mb-8">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Options</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {tool.parameters.map((param) => (
              <div key={param.name} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {param.label} {param.required && <span className="text-red-400">*</span>}
                </label>
                {param.type === 'select' ? (
                  <select
                    value={params[param.name] || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="input"
                  >
                    {param.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : param.type === 'boolean' ? (
                  <select
                    value={params[param.name] || 'true'}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="input"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={param.type === 'number' || param.type === 'range' ? 'number' : 'text'}
                    value={params[param.name] || ''}
                    placeholder={param.placeholder || ''}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="input"
                  />
                )}
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{param.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end mb-8">
        <button
          onClick={handleRun}
          disabled={processing || files.length === 0}
          className="btn-primary text-base px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <>
              <RefreshCw size={18} className="animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Play size={18} /> Execute {tool.name}
            </>
          )}
        </button>
      </div>

      {/* Error Output */}
      {error && (
        <div className="p-4 rounded-xl mb-8 flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Processing Failed</h4>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Result & Download */}
      {result && result.outputFiles && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4 text-emerald-400">
            <CheckCircle2 size={24} />
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Processing Complete!</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Took {result.duration}ms</p>
            </div>
          </div>

          <div className="space-y-3">
            {result.outputFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center gap-3">
                  <FileText size={22} style={{ color: 'var(--color-brand-400)' }} />
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(1)} KB • {file.mimeType}
                    </p>
                  </div>
                </div>

                <a
                  href={file.downloadUrl}
                  download={file.name}
                  className="btn-primary py-2 px-4 text-xs no-underline"
                >
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
