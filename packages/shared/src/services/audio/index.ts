/**
 * Audio Processing Service (MP3 / WAV / AAC / OGG / FLAC / M4A)
 *
 * Provides audio format conversion, audio extraction from video, and metadata inspection.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { ProcessingResult, ProcessingOptions } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName, generateId } from '../../utils/index.js';

const execFileAsync = promisify(execFile);

function getFfmpegPath(): string {
  if (ffmpegInstaller && ffmpegInstaller.path) {
    return ffmpegInstaller.path;
  }
  return 'ffmpeg';
}

// ─── Convert Audio Format ─────────────────────────────────────

export interface ConvertAudioOptions {
  targetFormat?: 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac' | 'm4a';
  bitrate?: string; // e.g. '192k'
}

export async function convertAudio(
  data: Buffer | Uint8Array,
  filename: string,
  options: ConvertAudioOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const format = options.targetFormat || 'mp3';
  const id = generateId();

  const tempFolder = join(tmpdir(), 'uft_audio');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_input_${filename}`);
  const outputPath = join(tempFolder, `${id}_output.${format}`);

  try {
    await writeFile(inputPath, data);

    processing?.onProgress?.(30, `Converting audio to ${format.toUpperCase()}...`);

    // Run FFmpeg CLI command
    const ffmpegArgs = ['-y', '-i', inputPath];
    if (options.bitrate) {
      ffmpegArgs.push('-b:a', options.bitrate);
    }
    ffmpegArgs.push(outputPath);

    await execFileAsync(getFfmpegPath(), ffmpegArgs);

    processing?.onProgress?.(90, 'Reading converted audio...');
    const resultBuffer = await readFile(outputPath);

    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.${format}`,
        data: resultBuffer,
        mimeType: `audio/${format}`,
        extension: `.${format}`,
        size: resultBuffer.length,
      }],
      metadata: { targetFormat: format },
      duration: Date.now() - start,
    };
  } catch (error) {
    // Cleanup on fail
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    const errMsg = (error as Error).message;
    if (errMsg.includes('ENOENT')) {
      throw new ProcessingError('FFmpeg binary not found on host system. Please install FFmpeg to process audio files.');
    }
    throw new ProcessingError(`Failed to convert audio: ${errMsg}`);
  }
}

// ─── Extract Audio from Video ─────────────────────────────────

export async function extractAudioFromVideo(
  data: Buffer | Uint8Array,
  filename: string,
  options: { targetFormat?: 'mp3' | 'wav' | 'aac' } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const format = options.targetFormat || 'mp3';
  const id = generateId();

  const tempFolder = join(tmpdir(), 'uft_audio');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_input_${filename}`);
  const outputPath = join(tempFolder, `${id}_extracted.${format}`);

  try {
    await writeFile(inputPath, data);

    processing?.onProgress?.(30, 'Extracting audio track from video...');

    // ffmpeg -i input.mp4 -vn -acodec libmp3lame output.mp3
    const ffmpegArgs = ['-y', '-i', inputPath, '-vn'];
    if (format === 'mp3') ffmpegArgs.push('-acodec', 'libmp3lame');
    ffmpegArgs.push(outputPath);

    await execFileAsync(getFfmpegPath(), ffmpegArgs);

    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_audio.${format}`,
        data: resultBuffer,
        mimeType: `audio/${format}`,
        extension: `.${format}`,
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    const errMsg = (error as Error).message;
    if (errMsg.includes('ENOENT')) {
      throw new ProcessingError('FFmpeg binary not found on host system. Please install FFmpeg to extract audio from video.');
    }
    throw new ProcessingError(`Failed to extract audio from video: ${errMsg}`);
  }
}

// ─── Trim Audio ───────────────────────────────────────────────

export async function trimAudio(
  data: Buffer | Uint8Array,
  filename: string,
  options: { startTime?: string; endTime?: string },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_audio');
  await mkdir(tempFolder, { recursive: true });

  const ext = filename.includes('.') ? `.${filename.split('.').pop()}` : '.mp3';
  const inputPath = join(tempFolder, `${id}_in${ext}`);
  const outputPath = join(tempFolder, `${id}_trimmed${ext}`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Trimming audio...');

    const ffmpegArgs = ['-y'];
    if (options.startTime) ffmpegArgs.push('-ss', options.startTime);
    if (options.endTime) ffmpegArgs.push('-to', options.endTime);
    ffmpegArgs.push('-i', inputPath, '-c', 'copy', outputPath);

    await execFileAsync(getFfmpegPath(), ffmpegArgs);
    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_trimmed${ext}`,
        data: resultBuffer,
        mimeType: 'audio/mpeg',
        extension: ext,
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to trim audio: ${(error as Error).message}`);
  }
}

// ─── Change Audio Speed ───────────────────────────────────────

export async function changeAudioSpeed(
  data: Buffer | Uint8Array,
  filename: string,
  options: { speed?: number },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_audio');
  await mkdir(tempFolder, { recursive: true });

  const ext = filename.includes('.') ? `.${filename.split('.').pop()}` : '.mp3';
  const inputPath = join(tempFolder, `${id}_in${ext}`);
  const outputPath = join(tempFolder, `${id}_speed${ext}`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Adjusting audio speed...');

    const speed = options.speed || 1.5;
    const ffmpegArgs = ['-y', '-i', inputPath, '-filter:a', `atempo=${speed}`, outputPath];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);
    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_${speed}x${ext}`,
        data: resultBuffer,
        mimeType: 'audio/mpeg',
        extension: ext,
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to change audio speed: ${(error as Error).message}`);
  }
}

// ─── Audio to Waveform Image ──────────────────────────────────

export async function audioToWaveform(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_audio');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in_audio`);
  const outputPath = join(tempFolder, `${id}_waveform.png`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Generating visual audio waveform...');

    // ffmpeg -i input.mp3 -filter_complex "showwavespic=s=1200x400:colors=0x3b82f6" waveform.png
    const ffmpegArgs = ['-y', '-i', inputPath, '-filter_complex', 'showwavespic=s=1200x400:colors=0x3b82f6', outputPath];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);
    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_waveform.png`,
        data: resultBuffer,
        mimeType: 'image/png',
        extension: '.png',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to generate audio waveform: ${(error as Error).message}`);
  }
}
