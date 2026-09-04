/**
 * Interactive Media Workbench Component
 * Provides a media player with interactive timeline scrubber and 1-click
 * start/end trim marker buttons for audio and video tools.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Volume2, Scissors, RotateCcw, Clock, Film, Music
} from 'lucide-react';

interface InteractiveMediaWorkbenchProps {
  mediaFile: File;
  toolId: string;
  startTime?: string;
  endTime?: string;
  onStartTimeChange?: (time: string) => void;
  onEndTimeChange?: (time: string) => void;
  accentColor?: string;
}

function formatSecondsToHms(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseHmsToSeconds(hms?: string): number {
  if (!hms) return 0;
  const parts = hms.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function InteractiveMediaWorkbench({
  mediaFile,
  toolId,
  startTime = '00:00:00',
  endTime = '00:00:30',
  onStartTimeChange,
  onEndTimeChange,
  accentColor = '#805AD5',
}: InteractiveMediaWorkbenchProps) {
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = mediaFile.type.startsWith('video/') || toolId.includes('video');

  useEffect(() => {
    const url = URL.createObjectURL(mediaFile);
    setMediaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const d = e.currentTarget.duration || 0;
    setDuration(d);
    // If endTime is empty or exceeds duration, default to duration or 30s
    if (onEndTimeChange && (!endTime || endTime === '00:00:30')) {
      const defaultEnd = Math.min(d, 30);
      onEndTimeChange(formatSecondsToHms(defaultEnd));
    }
  };

  const togglePlay = () => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      media.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (newTime: number) => {
    const media = isVideo ? videoRef.current : audioRef.current;
    if (media) {
      media.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const setAsStart = () => {
    const hms = formatSecondsToHms(currentTime);
    if (onStartTimeChange) onStartTimeChange(hms);
  };

  const setAsEnd = () => {
    const hms = formatSecondsToHms(currentTime);
    if (onEndTimeChange) onEndTimeChange(hms);
  };

  const applyPresetDuration = (seconds: number) => {
    const startSec = parseHmsToSeconds(startTime);
    const endSec = Math.min(duration || 3600, startSec + seconds);
    if (onEndTimeChange) onEndTimeChange(formatSecondsToHms(endSec));
  };

  const startSec = parseHmsToSeconds(startTime);
  const endSec = parseHmsToSeconds(endTime);
  const selectedDurationSec = Math.max(0, endSec - startSec);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#c3c6d7] dark:border-slate-800 shadow-md overflow-hidden space-y-0">
      {/* Workbench Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#f8f9fe] dark:bg-slate-800/80 border-b border-[#ededf9] dark:border-slate-800">
        <div className="flex items-center gap-2">
          {isVideo ? (
            <Film size={18} style={{ color: accentColor }} />
          ) : (
            <Music size={18} style={{ color: accentColor }} />
          )}
          <span className="text-xs font-bold text-[#191b23] dark:text-white truncate max-w-[200px]">
            {mediaFile.name}
          </span>
          <span className="text-[11px] font-semibold text-[#737686]">
            {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
        <div className="text-xs font-bold text-[#004ac6] dark:text-blue-400">
          Selected: {formatSecondsToHms(selectedDurationSec)}
        </div>
      </div>

      {/* Media Player Area */}
      <div className="p-6 bg-[#f0f2f8] dark:bg-slate-950 flex flex-col items-center justify-center">
        {isVideo ? (
          <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-lg bg-black relative">
            <video
              ref={videoRef}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className="w-full max-h-[300px] object-contain mx-auto"
            />
          </div>
        ) : (
          <div className="w-full max-w-md p-6 rounded-xl bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 shadow-sm flex flex-col items-center gap-3">
            <audio
              ref={audioRef}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              <Music size={32} />
            </div>
            <div className="text-xs font-bold text-[#191b23] dark:text-white">
              Audio Waveform & Playback
            </div>
          </div>
        )}

        {/* Timeline Scrubber */}
        <div className="w-full max-w-lg mt-4 space-y-2">
          {/* Progress / Seek bar */}
          <div className="relative">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor }}
            />

            {/* Selected Range Highlight Overlay */}
            {duration > 0 && (
              <div
                className="absolute top-0 h-2.5 rounded-lg opacity-40 pointer-events-none"
                style={{
                  left: `${(startSec / duration) * 100}%`,
                  width: `${Math.max(0, ((endSec - startSec) / duration) * 100)}%`,
                  backgroundColor: accentColor,
                }}
              />
            )}
          </div>

          {/* Time Readouts */}
          <div className="flex items-center justify-between text-xs font-semibold text-[#505f76] dark:text-slate-400">
            <span>{formatSecondsToHms(currentTime)}</span>
            <span>Total: {formatSecondsToHms(duration)}</span>
          </div>
        </div>

        {/* Player Controls & Trim Shortcuts */}
        <div className="w-full max-w-lg flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: accentColor }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          {/* Direct Set Start / Set End Buttons */}
          {(toolId.includes('trim') || toolId.includes('cut')) && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={setAsStart}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white hover:border-[#004ac6] cursor-pointer flex items-center gap-1 shadow-xs"
              >
                🚩 Set Start ({formatSecondsToHms(currentTime)})
              </button>
              <button
                type="button"
                onClick={setAsEnd}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-xs font-bold text-[#191b23] dark:text-white hover:border-[#004ac6] cursor-pointer flex items-center gap-1 shadow-xs"
              >
                🏁 Set End ({formatSecondsToHms(currentTime)})
              </button>
            </div>
          )}
        </div>

        {/* Quick Trim Preset Chips */}
        {(toolId.includes('trim') || toolId.includes('cut')) && (
          <div className="w-full max-w-lg flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[10px] font-bold text-[#737686] uppercase">Quick Presets:</span>
            {[15, 30, 60].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applyPresetDuration(s)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-[11px] font-bold text-[#434655] dark:text-slate-300 hover:text-[#004ac6] cursor-pointer"
              >
                +{s}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (onStartTimeChange) onStartTimeChange('00:00:00');
                if (onEndTimeChange) onEndTimeChange(formatSecondsToHms(duration));
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-700 text-[11px] font-bold text-[#737686] hover:text-[#E53E3E] cursor-pointer"
            >
              Reset Full
            </button>
          </div>
        )}
      </div>

      {/* Selected Range Bar */}
      <div className="px-5 py-3 bg-[#f8f9fe] dark:bg-slate-900 border-t border-[#ededf9] dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#737686]">Start: <strong className="text-[#191b23] dark:text-white">{startTime}</strong></span>
          <span className="text-[#737686]">End: <strong className="text-[#191b23] dark:text-white">{endTime}</strong></span>
        </div>
        <span className="font-bold" style={{ color: accentColor }}>
          Duration: {formatSecondsToHms(selectedDurationSec)}
        </span>
      </div>
    </div>
  );
}
