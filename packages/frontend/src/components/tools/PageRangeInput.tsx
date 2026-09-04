/**
 * PageRangeInput — Clickable page number chips instead of typing "1-5,10-15"
 * Used by: split_pdf, extract_pages, delete_pages, rearrange_pages
 */
import React, { useState } from 'react';
import { CheckSquare, Square, Layers } from 'lucide-react';

interface PageRangeInputProps {
  value: string;
  onChange: (ranges: string) => void;
  totalPages?: number;
  accentColor?: string;
  mode?: 'select' | 'order'; // 'select' for extract/delete, 'order' for rearrange
}

export function PageRangeInput({ value, onChange, totalPages = 12, accentColor = '#E53E3E', mode = 'select' }: PageRangeInputProps) {
  const [selectedPages, setSelectedPages] = useState<Set<number>>(() => {
    const set = new Set<number>();
    if (value) {
      value.split(',').forEach((part) => {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(Number);
          for (let i = start; i <= end; i++) set.add(i);
        } else {
          const n = parseInt(trimmed);
          if (!isNaN(n)) set.add(n);
        }
      });
    }
    return set;
  });

  const togglePage = (page: number) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(page)) {
      newSet.delete(page);
    } else {
      newSet.add(page);
    }
    setSelectedPages(newSet);
    const sorted = Array.from(newSet).sort((a, b) => a - b);
    onChange(sorted.join(','));
  };

  const selectAll = () => {
    const allPages = new Set<number>();
    for (let i = 1; i <= totalPages; i++) allPages.add(i);
    setSelectedPages(allPages);
    onChange(Array.from(allPages).join(','));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
    onChange('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          Select Pages
        </label>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
          {selectedPages.size} of {totalPages} selected
        </span>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#ededf9] dark:bg-slate-800 text-[#505f76] dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
        >
          <CheckSquare size={10} /> Select All
        </button>
        <button
          type="button"
          onClick={deselectAll}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#ededf9] dark:bg-slate-800 text-[#505f76] dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
        >
          <Square size={10} /> Clear
        </button>
      </div>

      {/* Page grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isSelected = selectedPages.has(page);
          return (
            <button
              key={page}
              type="button"
              onClick={() => togglePage(page)}
              className={`relative w-full aspect-[3/4] rounded-lg border-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:border-slate-400'
              }`}
              style={isSelected ? { borderColor: accentColor, backgroundColor: accentColor } : {}}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Manual input fallback */}
      <div className="pt-2 border-t border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers size={12} className="text-[#737686] flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or type: 1-5, 8, 10-12"
            className="flex-1 px-2 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-[10px] font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
          />
        </div>
      </div>
    </div>
  );
}
