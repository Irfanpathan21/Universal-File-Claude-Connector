/**
 * CommandPalette / Global Search Modal
 * Triggered by Ctrl+K (or Cmd+K) or clicking the Search option in Header.
 * Features:
 * - Instant full-text search across all 100+ tools (name, description, tags, category, input/output formats)
 * - Keyboard navigation (Up / Down arrows, Enter to select, Esc to close)
 * - Category filter chips (PDF, Image, Word, Excel, PowerPoint, Data, AI/OCR)
 * - Popular / Recommended tools shown when search input is empty
 * - Smooth Framer Motion transitions and dark/light mode typography
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ArrowRight, CornerDownLeft, Sparkles, FileText, Table,
  FileSpreadsheet, Image as ImageIcon, Presentation, FileCode, Archive,
  Split, FilePlus, Scissors, RefreshCw, Maximize2, Shield, Eye, Wrench
} from 'lucide-react';
import { useUIStore } from '../../stores/ui';
import { LOCAL_TOOLS } from '../../lib/api';
import type { ToolInfo } from '../../lib/api';

// Map icon names / categories to Lucide components
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

const CATEGORY_COLORS: Record<string, { color: string; label: string }> = {
  pdf: { color: '#E53E3E', label: 'PDF' },
  image: { color: '#00A3C4', label: 'Image' },
  document: { color: '#2B6CB0', label: 'Word' },
  spreadsheet: { color: '#2F855A', label: 'Excel' },
  presentation: { color: '#DD6B20', label: 'PowerPoint' },
  data: { color: '#4C51BF', label: 'Data & Text' },
  ai: { color: '#9F7AEA', label: 'AI' },
  ocr: { color: '#DD6B20', label: 'OCR' },
  archive: { color: '#718096', label: 'Archive' },
  default: { color: '#004ac6', label: 'Tool' },
};

const CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Image' },
  { id: 'document', label: 'Word' },
  { id: 'spreadsheet', label: 'Excel' },
  { id: 'presentation', label: 'PowerPoint' },
  { id: 'data', label: 'Data' },
  { id: 'ai', label: 'AI & OCR' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const isOpen = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedCategory('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter tools based on query & category
  const filteredTools = useMemo(() => {
    const q = query.toLowerCase().trim();

    return (LOCAL_TOOLS as any[]).filter((tool) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'all' ||
        tool.category === selectedCategory ||
        (selectedCategory === 'ai' && (tool.category === 'ai' || tool.category === 'ocr'));

      if (!matchesCategory) return false;

      // Search query filter
      if (!q) return true;

      const nameMatch = tool.name.toLowerCase().includes(q);
      const descMatch = tool.description.toLowerCase().includes(q);
      const idMatch = tool.id.toLowerCase().includes(q);
      const tagMatch = (tool.tags || []).some((t: string) => t.toLowerCase().includes(q));
      const formatMatch = (tool.inputFormats || []).some((f: string) => f.toLowerCase().includes(q)) ||
                          (tool.outputFormats || []).some((f: string) => f.toLowerCase().includes(q));

      return nameMatch || descMatch || idMatch || tagMatch || formatMatch;
    });
  }, [query, selectedCategory]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelectTool = (toolId: string) => {
    setOpen(false);
    navigate(`/tools/${toolId}`);
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredTools.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredTools.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTools.length > 0 && filteredTools[selectedIndex]) {
        handleSelectTool(filteredTools[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[8vh] sm:pt-[12vh] p-3 sm:p-4 animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* 1. Search Input Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900 relative">
            <Search size={20} className="text-[#004ac6] dark:text-blue-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search all 100+ tools (e.g. merge pdf, docx, compress, ocr)..."
              className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md">
              ESC
            </kbd>
          </div>

          {/* 2. Category Quick Filters */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#004ac6] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 3. Results List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{query ? `Search Results (${filteredTools.length})` : 'Popular & Available Tools'}</span>
              <span className="text-[10px] normal-case font-normal text-slate-400">Navigate with ↑ ↓</span>
            </div>

            {filteredTools.length > 0 ? (
              filteredTools.map((tool, idx) => {
                const ToolIcon = resolveToolIcon(tool);
                const categoryStyle = CATEGORY_COLORS[tool.category] || CATEGORY_COLORS.default;
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={tool.id}
                    data-index={idx}
                    onClick={() => handleSelectTool(tool.id)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-100 flex items-center justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? 'bg-[#f3f3fe] dark:bg-slate-800/90 border border-[#004ac6]/30 dark:border-blue-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: categoryStyle.color }}
                      >
                        <ToolIcon size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#004ac6] dark:group-hover:text-blue-400 transition-colors truncate">
                            {tool.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {categoryStyle.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelected && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#004ac6] dark:text-blue-400">
                          Open <CornerDownLeft size={12} />
                        </span>
                      )}
                      <ArrowRight
                        size={15}
                        className={`text-slate-400 transition-transform ${
                          isSelected ? 'translate-x-0.5 text-[#004ac6] dark:text-blue-400' : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  No tools found matching "{query}"
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Try searching for keywords like "merge", "pdf", "word", "excel", "resize", or "convert".
                </p>
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#f3f3fe] dark:bg-slate-800 text-[#004ac6] dark:text-blue-400 hover:bg-[#ededf9] cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. Footer Shortcuts */}
          <div className="p-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold">ESC</kbd>
                <span>Close</span>
              </span>
            </div>

            <div className="font-semibold text-slate-400">
              {filteredTools.length} tools available
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
