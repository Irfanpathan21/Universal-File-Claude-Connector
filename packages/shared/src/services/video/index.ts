/**
 * Video Processing Service (MP4 / MKV / AVI / MOV / WEBM)
 *
 * Provides video compression, video format conversion, and frame thumbnail extraction using FFmpeg.
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

// ─── Compress Video ───────────────────────────────────────────

export interface CompressVideoOptions {
  crf?: number; // Constant Rate Factor (default 28 for good compression)
  preset?: string; // e.g. 'fast', 'medium'
}

export async function compressVideo(
  data: Buffer | Uint8Array,
  filename: string,
  options: CompressVideoOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();

  const tempFolder = join(tmpdir(), 'uft_video');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_input_${filename}`);
  const outputPath = join(tempFolder, `${id}_compressed.mp4`);

  try {
    await writeFile(inputPath, data);

    processing?.onProgress?.(30, 'Compressing video using H.264 encoder...');

    const crf = options.crf ?? 28;
    const preset = options.preset || 'fast';

    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-vcodec', 'libx264',
      '-crf', String(crf),
      '-preset', preset,
      '-acodec', 'aac',
      '-b:a', '128k',
      outputPath,
    ];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);

    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_compressed.mp4`,
        data: resultBuffer,
        mimeType: 'video/mp4',
        extension: '.mp4',
        size: resultBuffer.length,
      }],
      metadata: {
        originalSize: data.length,
        compressedSize: resultBuffer.length,
        compressionRatio: `${((1 - resultBuffer.length / data.length) * 100).toFixed(1)}%`,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    const errMsg = (error as Error).message;
    if (errMsg.includes('ENOENT')) {
      throw new ProcessingError('FFmpeg binary not found on host system. Please install FFmpeg to compress video files.');
    }
    throw new ProcessingError(`Failed to compress video: ${errMsg}`);
  }
}

// ─── Generate Video Thumbnail ─────────────────────────────────

export async function generateVideoThumbnail(
  data: Buffer | Uint8Array,
  filename: string,
  options: { timestamp?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();

  const tempFolder = join(tmpdir(), 'uft_video');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_input_${filename}`);
  const outputPath = join(tempFolder, `${id}_thumb.jpg`);

  try {
    await writeFile(inputPath, data);

    processing?.onProgress?.(30, 'Extracting video thumbnail frame...');

    const time = options.timestamp || '00:00:01';

    // ffmpeg -ss 00:00:01 -i input.mp4 -vframes 1 thumb.jpg
    const ffmpegArgs = ['-y', '-ss', time, '-i', inputPath, '-vframes', '1', outputPath];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);

    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_thumbnail.jpg`,
        data: resultBuffer,
        mimeType: 'image/jpeg',
        extension: '.jpg',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    const errMsg = (error as Error).message;
    if (errMsg.includes('ENOENT')) {
      throw new ProcessingError('FFmpeg binary not found on host system. Please install FFmpeg to extract video thumbnails.');
    }
    throw new ProcessingError(`Failed to extract video thumbnail: ${errMsg}`);
  }
}

// ─── Video to GIF ─────────────────────────────────────────────

export async function videoToGif(
  data: Buffer | Uint8Array,
  filename: string,
  options: { fps?: number; width?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_video');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in_video`);
  const outputPath = join(tempFolder, `${id}_anim.gif`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Converting video to smooth GIF animation...');

    const fps = options.fps || 12;
    const width = options.width || 480;

    // High quality 2-pass palettegen + paletteuse
    const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    const ffmpegArgs = ['-y', '-i', inputPath, '-vf', vf, outputPath];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);
    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.gif`,
        data: resultBuffer,
        mimeType: 'image/gif',
        extension: '.gif',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to convert video to GIF: ${(error as Error).message}`);
  }
}

// ─── GIF to Video ─────────────────────────────────────────────

export async function gifToVideo(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_video');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in.gif`);
  const outputPath = join(tempFolder, `${id}_out.mp4`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Converting GIF to MP4 video...');

    // ffmpeg -i anim.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" out.mp4
    const ffmpegArgs = ['-y', '-i', inputPath, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', outputPath];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);
    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.mp4`,
        data: resultBuffer,
        mimeType: 'video/mp4',
        extension: '.mp4',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to convert GIF to video: ${(error as Error).message}`);
  }
}

// ─── Trim Video ───────────────────────────────────────────────

export async function trimVideo(
  data: Buffer | Uint8Array,
  filename: string,
  options: { startTime?: string; endTime?: string },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_video');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in_video`);
  const outputPath = join(tempFolder, `${id}_trimmed.mp4`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Trimming video clip...');

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
        name: `${getBaseName(filename)}_trimmed.mp4`,
        data: resultBuffer,
        mimeType: 'video/mp4',
        extension: '.mp4',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to trim video: ${(error as Error).message}`);
  }
}

// ─── Mute Video ───────────────────────────────────────────────

export async function muteVideo(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_video');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in_video`);
  const outputPath = join(tempFolder, `${id}_muted.mp4`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(30, 'Removing audio stream from video...');

    // ffmpeg -i input.mp4 -an -c:v copy muted.mp4
    const ffmpegArgs = ['-y', '-i', inputPath, '-an', '-c:v', 'copy', outputPath];

    await execFileAsync(getFfmpegPath(), ffmpegArgs);
    const resultBuffer = await readFile(outputPath);

    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_muted.mp4`,
        data: resultBuffer,
        mimeType: 'video/mp4',
        extension: '.mp4',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    throw new ProcessingError(`Failed to mute video: ${(error as Error).message}`);
  }
}
