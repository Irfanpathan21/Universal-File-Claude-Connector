import { LOCAL_TOOLS } from './api';
import type { ToolInfo } from './api';

export interface FileTypeInfo {
  extension: string;
  label: string;
  category: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFileTypeInfo(fileName: string): FileTypeInfo {
  const ext = ('.' + fileName.split('.').pop()?.toLowerCase()) || '';

  switch (ext) {
    case '.docx':
    case '.doc':
      return {
        extension: ext,
        label: 'Microsoft Word Document',
        category: 'document',
        color: '#2B6CB0',
        badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
        badgeText: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
      };
    case '.pdf':
      return {
        extension: ext,
        label: 'PDF Document',
        category: 'pdf',
        color: '#E53E3E',
        badgeBg: 'bg-red-500/10 dark:bg-red-500/20',
        badgeText: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50',
      };
    case '.xlsx':
    case '.xls':
      return {
        extension: ext,
        label: 'Excel Spreadsheet',
        category: 'spreadsheet',
        color: '#2F855A',
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        badgeText: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
      };
    case '.csv':
    case '.tsv':
      return {
        extension: ext,
        label: 'CSV Spreadsheet Data',
        category: 'spreadsheet',
        color: '#2F855A',
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        badgeText: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
      };
    case '.pptx':
    case '.ppt':
      return {
        extension: ext,
        label: 'PowerPoint Presentation',
        category: 'presentation',
        color: '#DD6B20',
        badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
        badgeText: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
      };
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.gif':
    case '.bmp':
    case '.svg':
    case '.tiff':
      return {
        extension: ext,
        label: `${ext.replace('.', '').toUpperCase()} Image`,
        category: 'image',
        color: '#00A3C4',
        badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        badgeText: 'text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50',
      };
    case '.json':
      return {
        extension: ext,
        label: 'JSON Data File',
        category: 'data',
        color: '#4C51BF',
        badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        badgeText: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
      };
    case '.html':
    case '.htm':
      return {
        extension: ext,
        label: 'HTML Web Page',
        category: 'data',
        color: '#DD6B20',
        badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
        badgeText: 'text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
      };
    case '.txt':
    case '.md':
      return {
        extension: ext,
        label: ext === '.md' ? 'Markdown Document' : 'Plain Text Document',
        category: 'text',
        color: '#4A5568',
        badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
        badgeText: 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
      };
    case '.zip':
    case '.tar':
    case '.gz':
    case '.7z':
    case '.rar':
      return {
        extension: ext,
        label: 'Compressed Archive',
        category: 'archive',
        color: '#718096',
        badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
        badgeText: 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
      };
    default:
      return {
        extension: ext,
        label: `${ext.replace('.', '').toUpperCase()} File`,
        category: 'default',
        color: '#004ac6',
        badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
        badgeText: 'text-[#004ac6] dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
      };
  }
}

export function getToolsForFile(fileName: string, isMultiple = false): ToolInfo[] {
  const ext = ('.' + fileName.split('.').pop()?.toLowerCase()) || '';
  const fileInfo = getFileTypeInfo(fileName);

  const matched = (LOCAL_TOOLS as any[]).filter((tool) => {
    if (!tool.inputFormats || tool.inputFormats.length === 0) return false;

    return tool.inputFormats.some((rawFmt: string) => {
      const fmt = rawFmt.toLowerCase();
      if (fmt === ext) return true;
      if (ext === '.docx' && (fmt === '.doc' || fmt === '.docx')) return true;
      if (ext === '.doc' && (fmt === '.docx' || fmt === '.doc')) return true;
      if (ext === '.xlsx' && (fmt === '.xls' || fmt === '.xlsx' || fmt === '.csv')) return true;
      if (ext === '.xls' && (fmt === '.xlsx' || fmt === '.xls')) return true;
      if (ext === '.csv' && (fmt === '.xlsx' || fmt === '.csv')) return true;
      if ((ext === '.jpg' || ext === '.jpeg') && (fmt === '.jpg' || fmt === '.jpeg' || fmt === '.png')) return true;
      if (ext === '.htm' && fmt === '.html') return true;
      return false;
    });
  });

  // Sort tools so native category tools appear first
  return [...matched].sort((a, b) => {
    // If multiple files dropped, prioritize multi-file / merge tools
    if (isMultiple) {
      const aMulti = (a.maxFiles && a.maxFiles > 1) || a.id.includes('merge') || a.id.includes('batch');
      const bMulti = (b.maxFiles && b.maxFiles > 1) || b.id.includes('merge') || b.id.includes('batch');
      if (aMulti && !bMulti) return -1;
      if (!aMulti && bMulti) return 1;
    }

    // Native category first (e.g. document for docx, pdf for pdf, spreadsheet for xlsx)
    const aIsNative = a.category === fileInfo.category;
    const bIsNative = b.category === fileInfo.category;
    if (aIsNative && !bIsNative) return -1;
    if (!aIsNative && bIsNative) return 1;

    return a.name.localeCompare(b.name);
  });
}
