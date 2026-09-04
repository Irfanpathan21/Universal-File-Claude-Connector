/**
 * MetadataForm — Clean labeled form for document metadata editing
 * Used by: pdf_metadata, edit_pdf_metadata
 */
import React from 'react';
import { FileText, User, BookOpen, Trash2 } from 'lucide-react';

interface MetadataFormProps {
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  accentColor?: string;
}

const FIELDS = [
  { name: 'title', label: 'Document Title', icon: FileText, placeholder: 'My Document' },
  { name: 'author', label: 'Author Name', icon: User, placeholder: 'John Doe' },
  { name: 'subject', label: 'Subject', icon: BookOpen, placeholder: 'Project report' },
];

export function MetadataForm({ values, onChange, accentColor = '#E53E3E' }: MetadataFormProps) {
  const clearAll = () => {
    FIELDS.forEach((f) => onChange(f.name, ''));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
          Document Metadata
        </label>
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-[10px] font-bold text-[#737686] hover:text-[#E53E3E] cursor-pointer"
        >
          <Trash2 size={10} /> Clear All
        </button>
      </div>

      <div className="space-y-3">
        {FIELDS.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.name} className="space-y-1">
              <label className="text-[11px] font-semibold text-[#434655] dark:text-slate-400 flex items-center gap-1.5">
                <Icon size={12} style={{ color: accentColor }} />
                {field.label}
              </label>
              <input
                type="text"
                value={values[field.name] || ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-xs font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
