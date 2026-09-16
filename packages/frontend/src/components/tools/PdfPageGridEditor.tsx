/**
 * Interactive PDF Page Thumbnail Cards Grid Editor Component
 * Visual page thumbnails card preview showing PDF pages with drag-to-reorder,
 * per-page rotation (90° steps), bulk rotate, page selection with click-to-select,
 * and two-way synchronization with ToolPage parameters.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, RotateCw, RotateCcw, Trash2, CheckCircle2, ArrowUp, ArrowDown,
  Layers, Loader2
} from 'lucide-react';
import { getFilesPdfPageCounts } from '../../lib/pdfUtils';

interface PdfPageItem {
  id: string;
  fileName: string;
  pageNumber: number;
  rotation: number;
  selected: boolean;
}

interface PdfPageGridEditorProps {
  files: File[];
  toolId?: string;
  selectedPages?: string;
  onSelectedPagesChange?: (pagesCsv: string) => void;
  onPageSequenceChange?: (sequence: string[]) => void;
  accentColor?: string;
}

export function PdfPageGridEditor({
  files,
  toolId = 'merge_pdf',
  selectedPages,
  onSelectedPagesChange,
  onPageSequenceChange,
  accentColor = '#E53E3E',
}: PdfPageGridEditorProps) {
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Accurately detect real PDF page counts for all uploaded files
  useEffect(() => {
    let active = true;

    async function detectPages() {
      if (!files || files.length === 0) {
        setPages([]);
        return;
      }

      setLoading(true);
      try {
        const fileCounts = await getFilesPdfPageCounts(files);
        if (!active) return;

        const list: PdfPageItem[] = [];
        const initialSet = new Set<number>();
        if (selectedPages) {
          selectedPages.split(',').forEach((s) => {
            const p = parseInt(s.trim(), 10);
            if (!isNaN(p)) initialSet.add(p);
          });
        }
        if (initialSet.size === 0) initialSet.add(1);

        fileCounts.forEach(({ fileIndex, fileName, pageCount }) => {
          const total = Math.max(1, pageCount);
          for (let p = 1; p <= total; p++) {
            list.push({
              id: `${fileIndex}-${p}`,
              fileName,
              pageNumber: p,
              rotation: 0,
              selected: toolId === 'duplicate_pages' ? initialSet.has(p) : true,
            });
          }
        });

        setPages(list);
        if (onSelectedPagesChange) {
          if (toolId === 'duplicate_pages') {
            onSelectedPagesChange(Array.from(initialSet).sort((a, b) => a - b).join(', '));
          } else {
            const selectedNums = list.map((p) => p.pageNumber);
            onSelectedPagesChange(selectedNums.join(', '));
          }
        }
      } catch (err) {
        console.error('Failed to parse PDF page count:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    detectPages();

    return () => {
      active = false;
    };
  }, [files]);

  // Sync with selectedPages prop when in duplicate_pages multi-selection mode
  useEffect(() => {
    if (toolId === 'duplicate_pages' && selectedPages !== undefined && pages.length > 0) {
      const activeSet = new Set<number>();
      selectedPages.split(',').forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            const s = Math.max(1, Math.min(start, end));
            const e = Math.min(pages.length, Math.max(start, end));
            for (let i = s; i <= e; i++) activeSet.add(i);
          }
        } else {
          const n = parseInt(trimmed, 10);
          if (!isNaN(n) && n >= 1 && n <= pages.length) activeSet.add(n);
        }
      });

      setPages((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          const shouldBeSelected = activeSet.has(p.pageNumber);
          if (p.selected !== shouldBeSelected) {
            changed = true;
            return { ...p, selected: shouldBeSelected };
          }
          return p;
        });
        return changed ? next : prev;
      });
    }
  }, [selectedPages, toolId, pages.length]);

  // Sync with selectedPages prop when in rearrange_pages mode
  useEffect(() => {
    if (toolId === 'rearrange_pages' && selectedPages !== undefined && pages.length > 0) {
      const orderNums = selectedPages
        .replace(/[;|\s]+/g, ',')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1);

      if (orderNums.length > 0) {
        setPages((prev) => {
          const currentNums = prev.map((p) => p.pageNumber);
          const isMatch = orderNums.length === currentNums.length && orderNums.every((num, i) => num === currentNums[i]);
          if (isMatch) return prev;

          const pageMap = new Map<number, PdfPageItem>();
          prev.forEach((p) => pageMap.set(p.pageNumber, p));
          const reordered: PdfPageItem[] = [];
          const used = new Set<number>();
          for (const num of orderNums) {
            if (pageMap.has(num) && !used.has(num)) {
              reordered.push(pageMap.get(num)!);
              used.add(num);
            }
          }
          prev.forEach((p) => {
            if (!used.has(p.pageNumber)) reordered.push(p);
          });
          return reordered;
        });
      }
    }
  }, [selectedPages, toolId, pages.length]);

  // Sync selected pages to parent when selection changes
  const notifySelectedPages = (updated: PdfPageItem[]) => {
    if (!onSelectedPagesChange) return;
    const selectedNums = updated
      .filter((p) => p.selected)
      .map((p) => p.pageNumber)
      .sort((a, b) => a - b);
    onSelectedPagesChange(selectedNums.join(', '));
  };

  const rotatePage = (id: string) => {
    const next = pages.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
    setPages(next);
  };

  const rotateAllPagesCW = () => {
    const next = pages.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }));
    setPages(next);
  };

  const rotateAllPagesCCW = () => {
    const next = pages.map((p) => ({ ...p, rotation: (p.rotation - 90 + 360) % 360 }));
    setPages(next);
  };

  const removePage = (id: string) => {
    const next = pages.filter((p) => p.id !== id);
    setPages(next);
    notifySelectedPages(next);
  };

  const toggleSelect = (id: string) => {
    const next = pages.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p));
    setPages(next);
    notifySelectedPages(next);
  };

  const selectAll = (val: boolean) => {
    const next = pages.map((p) => ({ ...p, selected: val }));
    setPages(next);
    notifySelectedPages(next);
  };

  const selectOdd = () => {
    const next = pages.map((p) => ({ ...p, selected: p.pageNumber % 2 !== 0 }));
    setPages(next);
    notifySelectedPages(next);
  };

  const selectEven = () => {
    const next = pages.map((p) => ({ ...p, selected: p.pageNumber % 2 === 0 }));
    setPages(next);
    notifySelectedPages(next);
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const newPages = [...pages];
    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;
    setPages(newPages);

    const seqArr = newPages.map((p) => p.pageNumber.toString());
    if (onPageSequenceChange) {
      onPageSequenceChange(seqArr);
    }
    if (toolId === 'rearrange_pages' && onSelectedPagesChange) {
      onSelectedPagesChange(seqArr.join(', '));
    }
  };

  const selectedCount = pages.filter((p) => p.selected).length;

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-2xl p-5 shadow-md">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Layers size={20} style={{ color: accentColor }} />
          <div>
            <h3 className="text-sm font-bold text-[#191b23] dark:text-white">
              {toolId === 'duplicate_pages'
                ? 'Select Pages to Duplicate'
                : toolId === 'rearrange_pages'
                ? `Rearrange Page Sequence (${pages.length} Pages)`
                : `Visual Page Manager (${pages.length} Pages)`}
            </h3>
            <span className="text-[11px] text-[#737686]">
              {toolId === 'duplicate_pages'
                ? `${selectedCount} of ${pages.length} pages selected to duplicate`
                : toolId === 'rearrange_pages'
                ? 'Use the ↑ / ↓ arrows on cards or the sidebar controls to reorder pages'
                : `${selectedCount} of ${pages.length} pages selected`}
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {toolId !== 'duplicate_pages' && (
            <>
              {/* Rotate Controls */}
              <button
                type="button"
                onClick={rotateAllPagesCCW}
                className="p-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 text-xs font-bold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer flex items-center gap-1"
                title="Rotate All Left"
              >
                <RotateCcw size={13} /> Rotate All -90°
              </button>
              <button
                type="button"
                onClick={rotateAllPagesCW}
                className="p-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 text-xs font-bold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer flex items-center gap-1"
                title="Rotate All Right"
              >
                <RotateCw size={13} /> Rotate All +90°
              </button>
            </>
          )}

          {/* Page Selection Filters */}
          <button
            type="button"
            onClick={() => selectAll(true)}
            className="px-2 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 text-[11px] font-bold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer"
          >
            All
          </button>
          <button
            type="button"
            onClick={selectOdd}
            className="px-2 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 text-[11px] font-bold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer"
          >
            Odd
          </button>
          <button
            type="button"
            onClick={selectEven}
            className="px-2 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 text-[11px] font-bold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] border border-[#c3c6d7]/60 cursor-pointer"
          >
            Even
          </button>
          <button
            type="button"
            onClick={() => selectAll(false)}
            className="px-2 py-1.5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 text-[11px] font-bold text-[#737686] hover:text-[#E53E3E] border border-[#c3c6d7]/60 cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Interactive Page Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs font-semibold text-[#737686]">
          <Loader2 size={24} className="animate-spin text-[#004ac6]" />
          <span>Reading PDF pages...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
          {pages.map((page, idx) => (
          <div
            key={page.id}
            onClick={() => toggleSelect(page.id)}
            className={`group relative rounded-xl border p-2.5 flex flex-col items-center justify-between transition-all cursor-pointer select-none bg-[#f8f9fe] dark:bg-slate-800/90 ${
              page.selected
                ? 'border-[#004ac6] dark:border-blue-500 ring-2 ring-[#004ac6]/20 shadow-sm'
                : 'border-[#c3c6d7] dark:border-slate-700 opacity-50 grayscale'
            }`}
          >
            {/* Card Header & Controls */}
            <div className="w-full flex items-center justify-between gap-1 text-slate-500 mb-1.5" onClick={(e) => e.stopPropagation()}>
              <div
                onClick={() => toggleSelect(page.id)}
                className="p-0.5 text-[#004ac6] dark:text-blue-400 hover:scale-110 transition-transform cursor-pointer"
              >
                <CheckCircle2 size={16} className={page.selected ? 'fill-[#004ac6] dark:fill-blue-500 text-white' : 'text-slate-400'} />
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => movePage(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => movePage(idx, 'down')}
                  disabled={idx === pages.length - 1}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 cursor-pointer"
                >
                  <ArrowDown size={11} />
                </button>
              </div>
            </div>

            {/* Thumbnail Canvas Representation */}
            <div
              className="w-20 h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs flex flex-col items-center justify-center p-1.5 text-center transition-transform duration-300"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            >
              <FileText size={26} className="text-[#E53E3E] opacity-80 mb-1" />
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate w-full">
                {toolId === 'rearrange_pages' ? `Pos #${idx + 1}: Page ${page.pageNumber}` : `Page ${page.pageNumber}`}
              </span>
              <span className="text-[7px] text-slate-500 truncate w-full">
                {page.fileName}
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="w-full flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200 dark:border-slate-700 text-xs" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => rotatePage(page.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#004ac6] cursor-pointer"
                title="Rotate this page 90°"
              >
                <RotateCw size={11} /> {page.rotation !== 0 ? `${page.rotation}°` : 'Rotate'}
              </button>
              <button
                type="button"
                onClick={() => removePage(page.id)}
                className="p-1 text-slate-400 hover:text-[#E53E3E] transition-colors cursor-pointer"
                title="Delete this page"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
