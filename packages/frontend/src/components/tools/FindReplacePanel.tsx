/**
 * FindReplacePanel — Side-by-side Find + Replace fields
 * Used by: replace_text_docx, find_replace_excel
 */
import React from 'react';
import { Search, Replace, ArrowRight } from 'lucide-react';

interface FindReplacePanelProps {
  findValue: string;
  replaceValue: string;
  onFindChange: (text: string) => void;
  onReplaceChange: (text: string) => void;
  findFieldName?: string;
  replaceFieldName?: string;
  accentColor?: string;
}

export function FindReplacePanel({
  findValue,
  replaceValue,
  onFindChange,
  onReplaceChange,
  findFieldName = 'Find',
  replaceFieldName = 'Replace with',
  accentColor = '#2B6CB0',
}: FindReplacePanelProps) {
  return (
    <div className="space-y-4">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Find & Replace
      </label>

      <div className="space-y-3">
        {/* Find field */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#434655] dark:text-slate-400 flex items-center gap-1.5">
            <Search size={12} style={{ color: accentColor }} />
            {findFieldName}
          </label>
          <input
            type="text"
            value={findValue}
            onChange={(e) => onFindChange(e.target.value)}
            placeholder="Text to search for..."
            className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
          />
        </div>

        {/* Arrow indicator */}
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
            <ArrowRight size={14} style={{ color: accentColor }} className="rotate-90" />
          </div>
        </div>

        {/* Replace field */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#434655] dark:text-slate-400 flex items-center gap-1.5">
            <Replace size={12} style={{ color: accentColor }} />
            {replaceFieldName}
          </label>
          <input
            type="text"
            value={replaceValue}
            onChange={(e) => onReplaceChange(e.target.value)}
            placeholder="Replacement text..."
            className="w-full px-3 py-2.5 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
          />
        </div>
      </div>
    </div>
  );
}
