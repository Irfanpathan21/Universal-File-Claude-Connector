import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, FileText, Table, FileSpreadsheet, Image as ImageIcon,
  Sparkles, Layers, Globe, FileCode, Presentation, Archive, ArrowRight,
  Split, FilePlus, Scissors, RefreshCw, Maximize2, Shield, Eye, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { ToolInfo } from '../../lib/api';
import { getFileTypeInfo, getToolsForFile, formatFileSize } from '../../lib/fileTools';

interface FileDropActionModalProps {
  isOpen: boolean;
  files: File[];
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
}

// Map tool icon names / categories to Lucide icons
function resolveToolIcon(tool: ToolInfo) {
  const icon = (tool.icon || '').toLowerCase();
  switch (icon) {
    case 'file-plus': return FilePlus;
    case 'scissors': return Scissors;
    case 'minimize-2': return Maximize2;
    case 'rotate-cw': return RefreshCw;
    case 'table': return Table;
    case 'file-spreadsheet': return FileSpreadsheet;
    case 'image': return ImageIcon;
    case 'sparkles': return Sparkles;
    case 'layers': return Layers;
    case 'globe': return Globe;
    case 'presentation': return Presentation;
    case 'file-code': return FileCode;
    case 'shield': return Shield;
    case 'eye': return Eye;
    case 'split': return Split;
    case 'archive': return Archive;
    default:
      if (tool.category === 'spreadsheet') return Table;
      if (tool.category === 'image') return ImageIcon;
      if (tool.category === 'presentation') return Presentation;
      if (tool.category === 'data') return FileCode;
      if (tool.category === 'ai' || tool.category === 'ocr') return Sparkles;
      return FileText;
  }
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  document: { color: '#2B6CB0', bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/30 hover:border-blue-500' },
  pdf: { color: '#E53E3E', bg: 'bg-red-500/10 dark:bg-red-500/20', border: 'border-red-500/30 hover:border-red-500' },
  spreadsheet: { color: '#2F855A', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/30 hover:border-emerald-500' },
  presentation: { color: '#DD6B20', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/30 hover:border-amber-500' },
  image: { color: '#00A3C4', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', border: 'border-cyan-500/30 hover:border-cyan-500' },
  data: { color: '#4C51BF', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', border: 'border-indigo-500/30 hover:border-indigo-500' },
  ai: { color: '#9F7AEA', bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-500/30 hover:border-purple-500' },
  ocr: { color: '#DD6B20', bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-500/30 hover:border-orange-500' },
  archive: { color: '#718096', bg: 'bg-slate-500/10 dark:bg-slate-500/20', border: 'border-slate-500/30 hover:border-slate-500' },
  text: { color: '#4A5568', bg: 'bg-slate-500/10 dark:bg-slate-500/20', border: 'border-slate-500/30 hover:border-slate-500' },
  default: { color: '#004ac6', bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/30 hover:border-[#004ac6]' },
};

export function FileDropActionModal({ isOpen, files, onClose, onSelectTool }: FileDropActionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset filters when opening new files
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategoryFilter('all');
    }
  }, [isOpen, files]);

  const primaryFile = files[0];
  const fileInfo = useMemo(() => {
    if (!primaryFile) return null;
    return getFileTypeInfo(primaryFile.name);
  }, [primaryFile]);

  const matchingTools = useMemo(() => {
    if (!primaryFile) return [];
    return getToolsForFile(primaryFile.name, files.length > 1);
  }, [primaryFile, files.length]);

  // Category filters present in matching tools
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    matchingTools.forEach((t) => {
      const c = t.category || 'other';
      catMap.set(c, (catMap.get(c) || 0) + 1);
    });
    return Array.from(catMap.entries()).map(([id, count]) => ({ id, count }));
  }, [matchingTools]);

  // Filter tools by query & active category
  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return matchingTools.filter((tool) => {
      const matchesQuery =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        (tool.tags || []).some((tag) => tag.toLowerCase().includes(q));

      const matchesCategory =
        activeCategoryFilter === 'all' || tool.category === activeCategoryFilter;

      return matchesQuery && matchesCategory;
    });
  }, [matchingTools, searchQuery, activeCategoryFilter]);

  if (!isOpen || !primaryFile || !fileInfo) return null;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* 1. Modal Top Banner & File Details */}
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* File Category Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: `${fileInfo.color}18`, color: fileInfo.color }}
                >
                  {fileInfo.category === 'document' && <FileText size={30} />}
                  {fileInfo.category === 'pdf' && <FileText size={30} />}
                  {fileInfo.category === 'spreadsheet' && <Table size={30} />}
                  {fileInfo.category === 'presentation' && <Presentation size={30} />}
                  {fileInfo.category === 'image' && <ImageIcon size={30} />}
                  {fileInfo.category === 'data' && <FileCode size={30} />}
                  {fileInfo.category === 'archive' && <Archive size={30} />}
                  {!['document', 'pdf', 'spreadsheet', 'presentation', 'image', 'data', 'archive'].includes(fileInfo.category) && (
                    <FileText size={30} />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${fileInfo.badgeBg} ${fileInfo.badgeText}`}
                    >
                      {fileInfo.label}
                    </span>
                    {files.length > 1 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#004ac6]/10 text-[#004ac6] dark:bg-blue-500/20 dark:text-blue-300">
                        {files.length} Files Selected
                      </span>
                    )}
                  </div>

                  <h3
                    className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate"
                    title={primaryFile.name}
                  >
                    {primaryFile.name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(totalSize)}
                    {files.length > 1 && ` total • ${files.length} items`}
                    {' • '}
                    {totalSize === 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        ⚠️ The File You have uploaded is empty
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Ready to process
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {totalSize === 0 && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="font-semibold">The File You have uploaded is empty (0 Bytes).</span>
              </div>
            )}

            {/* Subheading & Search */}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/80">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Choose what you want to do:
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an action below to instantly load and process this file.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${matchingTools.length} available tools...`}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004ac6] focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills (if tool options span multiple categories) */}
            {availableCategories.length > 1 && (
              <div className="flex items-center gap-2 pt-3 flex-wrap">
                <button
                  onClick={() => setActiveCategoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeCategoryFilter === 'all'
                      ? 'bg-[#004ac6] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({matchingTools.length})
                </button>
                {availableCategories.map(({ id, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveCategoryFilter(id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                      activeCategoryFilter === id
                        ? 'bg-[#004ac6] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {id} ({count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Tool Options Grid */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {filteredTools.map((tool) => {
                  const ToolIcon = resolveToolIcon(tool);
                  const style = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.default;
                  const isMulti = files.length > 1 && (tool.maxFiles > 1 || tool.id.includes('merge') || tool.id.includes('batch'));

                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        if (primaryFile.size === 0) {
                          toast.warning('The File You have uploaded is empty');
                          return;
                        }
                        onSelectTool(tool.id);
                      }}
                      className={`group relative text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer flex flex-col justify-between ${style.border}`}
                      style={{ borderTopWidth: '3px', borderTopColor: style.color }}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-2xs group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: style.color }}
                          >
                            <ToolIcon size={20} />
                          </div>

                          <div className="flex items-center gap-1">
                            {isMulti && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Multi-file
                              </span>
                            )}
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {tool.category}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#004ac6] dark:group-hover:text-blue-400 transition-colors">
                            {tool.name}
                          </h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-[#004ac6] dark:text-blue-400">
                        <span>Select &amp; Process</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Empty Search State */
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search size={26} />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  No matching tools found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  No tools matched "{searchQuery}". Try a different search term or view all available tools.
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f3f3fe] dark:bg-slate-800 text-[#004ac6] dark:text-blue-400 hover:bg-[#ededf9] transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. Modal Footer */}
          <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              Need something else?{' '}
              <a
                href="/tools"
                className="font-bold text-[#004ac6] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Browse all 99+ tools <ArrowRight size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
