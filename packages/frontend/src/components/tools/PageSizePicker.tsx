/**
 * PageSizePicker — Visual page size cards with dimensions
 * Used by: images_to_pdf, resize_pdf_pages
 */
import React from 'react';
import { FileText, Maximize2 } from 'lucide-react';

interface PageSizePickerProps {
  value: string;
  onChange: (size: string) => void;
  accentColor?: string;
}

const PAGE_SIZES = [
  { id: 'A4', label: 'A4', dim: '210 × 297 mm', ratio: '1 : 1.414' },
  { id: 'Letter', label: 'US Letter', dim: '216 × 279 mm', ratio: '1 : 1.294' },
  { id: 'Legal', label: 'US Legal', dim: '216 × 356 mm', ratio: '1 : 1.648' },
  { id: 'A3', label: 'A3', dim: '297 × 420 mm', ratio: '1 : 1.414' },
  { id: 'A5', label: 'A5', dim: '148 × 210 mm', ratio: '1 : 1.414' },
  { id: 'fit', label: 'Fit to Image', dim: 'Auto size', ratio: 'Original' },
];

export function PageSizePicker({ value, onChange, accentColor = '#E53E3E' }: PageSizePickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Page Size
      </label>
      <div className="grid grid-cols-2 gap-2">
        {PAGE_SIZES.map((size) => {
          const isActive = value === size.id;
          return (
            <button
              key={size.id}
              type="button"
              onClick={() => onChange(size.id)}
              className={`p-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                isActive
                  ? 'shadow-sm'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}08` } : {}}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-5 h-7 rounded-sm border-2 flex-shrink-0"
                  style={{ borderColor: isActive ? accentColor : '#c3c6d7' }}
                />
                <span className="text-xs font-bold" style={isActive ? { color: accentColor } : { color: '#191b23' }}>
                  {size.label}
                </span>
              </div>
              <div className="text-[10px] text-[#737686] dark:text-slate-400">{size.dim}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
