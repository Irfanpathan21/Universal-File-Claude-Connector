/**
 * NoSettingsCard — Friendly "no settings needed" card for zero-parameter tools
 * Used by: ~40 tools with no parameters (extract_text, grayscale, remove_exif, etc.)
 */
import React from 'react';
import { Sparkles, CheckCircle2, Upload } from 'lucide-react';

interface NoSettingsCardProps {
  toolName: string;
  description: string;
  accentColor?: string;
}

export function NoSettingsCard({ toolName, description, accentColor = '#004ac6' }: NoSettingsCardProps) {
  return (
    <div className="space-y-4">
      {/* Friendly zero-config message */}
      <div
        className="rounded-xl p-4 border-2 border-dashed text-center space-y-3"
        style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}05` }}
      >
        <div
          className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Sparkles size={24} style={{ color: accentColor }} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#191b23] dark:text-white">
            No settings needed!
          </h4>
          <p className="text-[11px] text-[#505f76] dark:text-slate-400 mt-1 leading-relaxed">
            Just upload your file and click <strong>Run</strong>. <br />
            {toolName} runs automatically.
          </p>
        </div>
      </div>

      {/* What happens bullet points */}
      <div className="space-y-2 px-1">
        <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">What happens:</div>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-[11px] text-[#434655] dark:text-slate-400">
            <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
            <span>{description}</span>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-[#434655] dark:text-slate-400">
            <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
            <span>100% processed locally — your files never leave your device</span>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-[#434655] dark:text-slate-400">
            <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
            <span>Download the result instantly after processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
