/**
 * Interactive Data Workbench Component
 * Parses uploaded CSV / JSON / Excel files and renders a clean, live
 * data table preview or JSON tree preview with row/column counts.
 */

import React, { useState, useEffect } from 'react';
import { Table, FileSpreadsheet, FileJson, Check } from 'lucide-react';

interface InteractiveDataWorkbenchProps {
  dataFile: File;
  toolId: string;
  delimiter?: string;
  accentColor?: string;
}

export function InteractiveDataWorkbench({
  dataFile,
  toolId,
  delimiter = ',',
  accentColor = '#004ac6',
}: InteractiveDataWorkbenchProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [rawJson, setRawJson] = useState<string>('');
  const [totalLines, setTotalLines] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      if (!text) {
        setLoading(false);
        return;
      }

      if (dataFile.name.endsWith('.json') || toolId.includes('json')) {
        try {
          const parsed = JSON.parse(text);
          setRawJson(JSON.stringify(parsed, null, 2).slice(0, 1500));
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            const h = Object.keys(parsed[0]);
            setHeaders(h);
            setRows(parsed.slice(0, 8).map((obj) => h.map((k) => String(obj[k] ?? ''))));
            setTotalLines(parsed.length);
          }
        } catch {
          setRawJson(text.slice(0, 1000));
        }
      } else {
        // Parse CSV/TSV with current delimiter
        const delim = delimiter === '\\t' ? '\t' : delimiter || ',';
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        setTotalLines(lines.length);

        if (lines.length > 0) {
          const firstLine = lines[0].split(delim).map((c) => c.replace(/^["']|["']$/g, '').trim());
          setHeaders(firstLine);

          const sampleRows = lines.slice(1, 9).map((l) =>
            l.split(delim).map((c) => c.replace(/^["']|["']$/g, '').trim())
          );
          setRows(sampleRows);
        }
      }
      setLoading(false);
    };

    // Read only the first 50KB for fast instant preview
    const blob = dataFile.slice(0, 50000);
    reader.readAsText(blob);
  }, [dataFile, delimiter, toolId]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8f9fe] dark:bg-slate-800/80 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          {dataFile.name.endsWith('.json') ? (
            <FileJson size={18} style={{ color: accentColor }} />
          ) : (
            <FileSpreadsheet size={18} style={{ color: accentColor }} />
          )}
          <span className="text-xs font-bold text-[#191b23] dark:text-white truncate max-w-[200px]">
            {dataFile.name}
          </span>
          <span className="text-[11px] font-semibold text-[#737686]">
            {(dataFile.size / 1024).toFixed(1)} KB
          </span>
        </div>
        {totalLines > 0 && (
          <div className="text-xs font-bold text-[#004ac6] dark:text-blue-400">
            Previewing ~{totalLines} {dataFile.name.endsWith('.json') ? 'items' : 'rows'}
          </div>
        )}
      </div>

      {/* Content Stage */}
      <div className="p-4 bg-[#f0f2f8] dark:bg-slate-950 min-h-[260px] max-h-[420px] overflow-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs text-[#737686]">
            Reading file contents...
          </div>
        ) : rows.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#c3c6d7] dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f3f3fe] dark:bg-slate-800 text-[#191b23] dark:text-white font-bold border-b border-[#c3c6d7] dark:border-slate-700">
                  <th className="p-2.5 text-center text-[#737686] w-10 font-medium">#</th>
                  {headers.map((h, i) => (
                    <th key={i} className="p-2.5 border-l border-[#c3c6d7]/50 dark:border-slate-700/50 truncate max-w-[150px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[#434655] dark:text-slate-300">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-2 text-center text-[10px] text-[#737686] font-mono">{rIdx + 1}</td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 border-l border-[#c3c6d7]/30 dark:border-slate-700/30 truncate max-w-[150px]">
                        {cell || <span className="text-slate-400 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rawJson ? (
          <div className="bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-xs overflow-auto max-h-[360px]">
            <pre>{rawJson}</pre>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-[#737686]">
            File loaded ready for processing
          </div>
        )}
      </div>

      <div className="px-5 py-2.5 bg-[#f8f9fe] dark:bg-slate-900 border-t border-[#ededf9] dark:border-slate-800 text-[11px] text-[#737686] flex items-center justify-between">
        <span>Table schema detected automatically</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Check size={12} /> Ready to convert
        </span>
      </div>
    </div>
  );
}
