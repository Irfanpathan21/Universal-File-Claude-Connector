/**
 * FormatConvertPicker — Grid of clickable format cards
 * Used by: convert_image, convert_audio, extract_audio_from_video
 */
import React from 'react';

interface FormatOption {
  value: string;
  label: string;
  benefit: string;
}

interface FormatConvertPickerProps {
  value: string;
  onChange: (format: string) => void;
  formats: FormatOption[];
  accentColor?: string;
  showQuality?: boolean;
  quality?: string;
  onQualityChange?: (quality: string) => void;
}

const IMAGE_FORMATS: FormatOption[] = [
  { value: 'jpeg', label: 'JPEG', benefit: 'Universal, small size' },
  { value: 'png', label: 'PNG', benefit: 'Lossless, transparency' },
  { value: 'webp', label: 'WebP', benefit: 'Modern, smallest size' },
  { value: 'avif', label: 'AVIF', benefit: 'Next-gen, best compression' },
  { value: 'tiff', label: 'TIFF', benefit: 'Professional, uncompressed' },
  { value: 'gif', label: 'GIF', benefit: 'Animation support' },
];

const AUDIO_FORMATS: FormatOption[] = [
  { value: 'mp3', label: 'MP3', benefit: 'Universal, good quality' },
  { value: 'wav', label: 'WAV', benefit: 'Lossless, uncompressed' },
  { value: 'aac', label: 'AAC', benefit: 'Better quality than MP3' },
  { value: 'ogg', label: 'OGG', benefit: 'Open source, good quality' },
  { value: 'flac', label: 'FLAC', benefit: 'Lossless, compressed' },
];

export { IMAGE_FORMATS, AUDIO_FORMATS };

export function FormatConvertPicker({ value, onChange, formats, accentColor = '#00A3C4', showQuality, quality, onQualityChange }: FormatConvertPickerProps) {
  const lossyFormats = ['jpeg', 'jpg', 'webp', 'avif', 'mp3', 'aac', 'ogg'];
  const isLossy = lossyFormats.includes(value);

  return (
    <div className="space-y-4">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider">
        Output Format
      </label>
      <div className="grid grid-cols-2 gap-2">
        {formats.map((fmt) => {
          const isActive = value === fmt.value;
          return (
            <button
              key={fmt.value}
              type="button"
              onClick={() => onChange(fmt.value)}
              className={`p-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                isActive
                  ? 'shadow-sm'
                  : 'border-[#c3c6d7] dark:border-slate-700 bg-[#f3f3fe] dark:bg-slate-800 hover:border-slate-400'
              }`}
              style={isActive ? { borderColor: accentColor, backgroundColor: `${accentColor}08` } : {}}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ backgroundColor: isActive ? `${accentColor}20` : '#e1e2ed', color: isActive ? accentColor : '#505f76' }}
                >
                  .{fmt.label}
                </span>
              </div>
              <div className="text-[10px] text-[#505f76] dark:text-slate-400 mt-1">{fmt.benefit}</div>
            </button>
          );
        })}
      </div>

      {/* Quality slider for lossy formats */}
      {showQuality && isLossy && onQualityChange && (
        <div className="space-y-2 pt-2 border-t border-[#ededf9] dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-[#191b23] dark:text-white">
            <span>Quality</span>
            <span style={{ color: accentColor }}>{quality || 90}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={quality || '90'}
            onChange={(e) => onQualityChange(e.target.value)}
            className="w-full cursor-pointer h-2 rounded-full appearance-none"
            style={{ accentColor }}
          />
          <div className="flex justify-between text-[9px] text-[#737686]">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </div>
      )}
    </div>
  );
}
