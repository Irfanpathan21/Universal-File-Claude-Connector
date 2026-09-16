/**
 * Image Processing Service
 *
 * High-performance image manipulation using Sharp.
 * Supports: PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, AVIF, HEIC, SVG
 */

import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError, UnsupportedFormatError } from '../../errors/index.js';
import { getBaseName, getExtension, generateId } from '../../utils/index.js';
import { createZip } from '../archive/index.js';

const execFileAsync = promisify(execFile);

type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'tiff' | 'gif';

const FORMAT_MAP: Record<string, ImageFormat> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
  '.avif': 'avif',
  '.tiff': 'tiff',
  '.tif': 'tiff',
  '.gif': 'gif',
  '.bmp': 'png', // Convert BMP through PNG
  '.heic': 'jpeg', // Convert HEIC through JPEG
};

const MIME_FOR_FORMAT: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
  gif: 'image/gif',
};

// ─── Resize Image ────────────────────────────────────────────

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
  background?: { r: number; g: number; b: number; alpha: number };
}

export async function resizeImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: ResizeOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (!options.width && !options.height) {
    throw new ValidationError('At least width or height must be specified');
  }

  try {
    processing?.onProgress?.(30, 'Resizing image...');

    const result = await sharp(Buffer.from(data))
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'inside',
        withoutEnlargement: options.withoutEnlargement ?? true,
        background: options.background || { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';

    processing?.onProgress?.(90, 'Encoding output...');

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_resized${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: ext,
        size: result.info.size,
      }],
      metadata: {
        width: result.info.width,
        height: result.info.height,
        format: result.info.format,
        originalSize: data.length,
        newSize: result.info.size,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to resize image: ${(error as Error).message}`);
  }
}

// ─── Crop Image ──────────────────────────────────────────────

export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

export async function cropImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: CropOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Cropping image...');

    const metadata = await sharp(Buffer.from(data)).metadata();
    const imgW = metadata.width || 1000;
    const imgH = metadata.height || 1000;

    let left = Math.max(0, Math.round(Number(options.left) || 0));
    let top = Math.max(0, Math.round(Number(options.top) || 0));
    let width = Math.round(Number(options.width) || (imgW - left));
    let height = Math.round(Number(options.height) || (imgH - top));

    // Clamp offsets within image boundaries
    if (left >= imgW) left = Math.max(0, imgW - 10);
    if (top >= imgH) top = Math.max(0, imgH - 10);
    if (width <= 0) width = imgW - left;
    if (height <= 0) height = imgH - top;

    // Clamp width & height within image bounds
    if (left + width > imgW) width = imgW - left;
    if (top + height > imgH) height = imgH - top;

    width = Math.max(1, width);
    height = Math.max(1, height);

    const result = await sharp(Buffer.from(data))
      .extract({ left, top, width, height })
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_cropped${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      metadata: {
        width: result.info.width,
        height: result.info.height,
        cropLeft: left,
        cropTop: top,
        originalWidth: imgW,
        originalHeight: imgH,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to crop image: ${(error as Error).message}`);
  }
}

// ─── Rotate Image ────────────────────────────────────────────

export interface RotateImageOptions {
  angle: number;
  background?: { r: number; g: number; b: number; alpha: number };
}

export async function rotateImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: RotateImageOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Rotating image...');

    const result = await sharp(Buffer.from(data))
      .rotate(options.angle, {
        background: options.background || { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_rotated${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      metadata: {
        width: result.info.width,
        height: result.info.height,
        angle: options.angle,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to rotate image: ${(error as Error).message}`);
  }
}

// ─── Flip Image ──────────────────────────────────────────────

export async function flipImage(
  data: Buffer | Uint8Array,
  filename: string,
  direction: 'horizontal' | 'vertical',
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, `Flipping image ${direction}ly...`);

    let pipeline = sharp(Buffer.from(data));
    if (direction === 'horizontal') {
      pipeline = pipeline.flop();
    } else {
      pipeline = pipeline.flip();
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_flipped${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      metadata: { direction },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to flip image: ${(error as Error).message}`);
  }
}

// ─── Compress Image ──────────────────────────────────────────

export interface CompressImageOptions {
  quality?: number; // 1-100
  format?: ImageFormat;
}

export async function compressImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: CompressImageOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const originalSize = data.length;

  try {
    processing?.onProgress?.(30, 'Compressing image...');

    const quality = options.quality || 80;
    const ext = getExtension(filename);
    const format = options.format || FORMAT_MAP[ext] || 'jpeg';

    let pipeline = sharp(Buffer.from(data));

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality });
        break;
      default:
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    const savings = ((originalSize - result.info.size) / originalSize) * 100;

    processing?.onProgress?.(90, 'Compression complete');

    const outputExt = `.${format === 'jpeg' ? 'jpg' : format}`;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_compressed${outputExt}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: outputExt,
        size: result.info.size,
      }],
      metadata: {
        originalSize,
        compressedSize: result.info.size,
        savingsPercent: Math.round(savings * 100) / 100,
        quality,
        format,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to compress image: ${(error as Error).message}`);
  }
}

// ─── Convert Image ───────────────────────────────────────────

export interface ConvertImageOptions {
  format: ImageFormat;
  quality?: number;
}

export async function convertImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: ConvertImageOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, `Converting to ${options.format}...`);

    let pipeline = sharp(Buffer.from(data));
    const quality = options.quality || 90;

    switch (options.format) {
      case 'jpeg': pipeline = pipeline.jpeg({ quality }); break;
      case 'png': pipeline = pipeline.png({ quality }); break;
      case 'webp': pipeline = pipeline.webp({ quality }); break;
      case 'avif': pipeline = pipeline.avif({ quality }); break;
      case 'tiff': pipeline = pipeline.tiff({ quality }); break;
      case 'gif': pipeline = pipeline.gif(); break;
      default: throw new UnsupportedFormatError(options.format, ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif']);
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    const outputExt = `.${options.format === 'jpeg' ? 'jpg' : options.format}`;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}${outputExt}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[options.format],
        extension: outputExt,
        size: result.info.size,
      }],
      metadata: {
        format: options.format,
        width: result.info.width,
        height: result.info.height,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    throw new ProcessingError(`Failed to convert image: ${(error as Error).message}`);
  }
}

// ─── Add Watermark ───────────────────────────────────────────

export interface ImageWatermarkOptions {
  watermarkData?: Buffer | Uint8Array;
  text?: string;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | string;
  opacity?: number;
  scale?: number; // 0-1, relative to main image
  fontSize?: number;
  color?: string;
  angle?: number;
}

export async function addImageWatermark(
  data: Buffer | Uint8Array,
  filename: string,
  options: ImageWatermarkOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Adding watermark...');

    const mainImage = sharp(Buffer.from(data));
    const mainMeta = await mainImage.metadata();
    const imgWidth = mainMeta.width || 800;
    const imgHeight = mainMeta.height || 600;

    let watermarkBuffer: Buffer;
    let gravity: string = 'center';

    if (options.watermarkData) {
      const watermarkWidth = Math.round(imgWidth * (options.scale || 0.3));

      let watermark = sharp(Buffer.from(options.watermarkData))
        .resize({ width: watermarkWidth })
        .ensureAlpha();

      if (options.opacity !== undefined) {
        const opacity = Math.max(0, Math.min(1, options.opacity));
        watermark = watermark.composite([{
          input: Buffer.from([0, 0, 0, Math.round(opacity * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        }]);
      }

      watermarkBuffer = await watermark.toBuffer();

      const pos = (options.position || 'center').toLowerCase().replace('_', '-');
      switch (pos) {
        case 'top-left': gravity = 'northwest'; break;
        case 'top':
        case 'top-center': gravity = 'north'; break;
        case 'top-right': gravity = 'northeast'; break;
        case 'left':
        case 'center-left': gravity = 'west'; break;
        case 'center': gravity = 'center'; break;
        case 'right':
        case 'center-right': gravity = 'east'; break;
        case 'bottom-left': gravity = 'southwest'; break;
        case 'bottom':
        case 'bottom-center': gravity = 'south'; break;
        case 'bottom-right': gravity = 'southeast'; break;
        default: gravity = 'center'; break;
      }
    } else {
      const text = options.text || 'CONFIDENTIAL';
      const fontSize = options.fontSize || Math.max(24, Math.round(imgWidth * 0.05));
      const color = options.color || '#ffffff';
      const opacity = options.opacity !== undefined ? Math.max(0, Math.min(1, options.opacity)) : 0.6;
      const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      let xPx = Math.round(imgWidth * 0.5);
      let yPx = Math.round(imgHeight * 0.5);
      let anchor = 'middle';

      const pos = (options.position || 'center').toLowerCase().replace('_', '-');
      switch (pos) {
        case 'top-left':
          xPx = Math.round(imgWidth * 0.06); yPx = Math.round(imgHeight * 0.10); anchor = 'start';
          break;
        case 'top':
        case 'top-center':
          xPx = Math.round(imgWidth * 0.5); yPx = Math.round(imgHeight * 0.10); anchor = 'middle';
          break;
        case 'top-right':
          xPx = Math.round(imgWidth * 0.94); yPx = Math.round(imgHeight * 0.10); anchor = 'end';
          break;
        case 'left':
        case 'center-left':
          xPx = Math.round(imgWidth * 0.06); yPx = Math.round(imgHeight * 0.5); anchor = 'start';
          break;
        case 'center':
          xPx = Math.round(imgWidth * 0.5); yPx = Math.round(imgHeight * 0.5); anchor = 'middle';
          break;
        case 'right':
        case 'center-right':
          xPx = Math.round(imgWidth * 0.94); yPx = Math.round(imgHeight * 0.5); anchor = 'end';
          break;
        case 'bottom-left':
          xPx = Math.round(imgWidth * 0.06); yPx = Math.round(imgHeight * 0.92); anchor = 'start';
          break;
        case 'bottom':
        case 'bottom-center':
          xPx = Math.round(imgWidth * 0.5); yPx = Math.round(imgHeight * 0.92); anchor = 'middle';
          break;
        case 'bottom-right':
          xPx = Math.round(imgWidth * 0.94); yPx = Math.round(imgHeight * 0.92); anchor = 'end';
          break;
        default:
          xPx = Math.round(imgWidth * 0.5); yPx = Math.round(imgHeight * 0.5); anchor = 'middle';
          break;
      }

      // Slant angle: default to -30° unless explicitly provided (e.g. 0 for horizontal, -45 for diagonal)
      const angle = options.angle !== undefined && options.angle !== null && !isNaN(Number(options.angle))
        ? Number(options.angle)
        : -30;

      const transform = angle !== 0 ? `transform="rotate(${angle} ${xPx} ${yPx})"` : '';

      const svg = `<svg width="${imgWidth}" height="${imgHeight}">
        <style>
          .wm { fill: ${color}; font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; opacity: ${opacity}; }
        </style>
        <text x="${xPx}" y="${yPx}" text-anchor="${anchor}" dominant-baseline="middle" ${transform} class="wm">${escapedText}</text>
      </svg>`;

      watermarkBuffer = Buffer.from(svg);
      gravity = 'center';
    }

    const result = await sharp(Buffer.from(data))
      .composite([{
        input: watermarkBuffer,
        gravity: gravity as any,
      }])
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_watermarked${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      metadata: { position: options.position || 'center' },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to add watermark: ${(error as Error).message}`);
  }
}

// ─── Blur ────────────────────────────────────────────────────

export async function blurImage(
  data: Buffer | Uint8Array,
  filename: string,
  sigma: number = 5,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Applying blur...');
    const result = await sharp(Buffer.from(data))
      .blur(Math.max(0.3, sigma))
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_blurred${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      metadata: { sigma },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to blur image: ${(error as Error).message}`);
  }
}

// ─── Sharpen ─────────────────────────────────────────────────

export async function sharpenImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: { sigma?: number; flat?: number; jagged?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Sharpening image...');
    const result = await sharp(Buffer.from(data))
      .sharpen({
        sigma: options.sigma || 2,
        m1: options.flat || 1.0,
        m2: options.jagged || 2.0,
      })
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_sharpened${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to sharpen image: ${(error as Error).message}`);
  }
}

// ─── Brightness / Contrast / Saturation ──────────────────────

export interface AdjustOptions {
  brightness?: number; // 0.5 = half, 1 = normal, 2 = double
  saturation?: number;
  hue?: number;
}

export async function adjustImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: AdjustOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Adjusting image...');

    let pipeline = sharp(Buffer.from(data));

    if (options.brightness !== undefined) {
      pipeline = pipeline.modulate({ brightness: options.brightness });
    }
    if (options.saturation !== undefined) {
      pipeline = pipeline.modulate({ saturation: options.saturation });
    }
    if (options.hue !== undefined) {
      pipeline = pipeline.modulate({ hue: options.hue });
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_adjusted${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      metadata: { adjustments: options },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to adjust image: ${(error as Error).message}`);
  }
}

// ─── Grayscale ───────────────────────────────────────────────

export async function grayscaleImage(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Converting to grayscale...');
    const result = await sharp(Buffer.from(data))
      .grayscale()
      .toBuffer({ resolveWithObject: true });

    const ext = getExtension(filename);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_grayscale${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[FORMAT_MAP[ext] || 'png'],
        extension: ext,
        size: result.info.size,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert to grayscale: ${(error as Error).message}`);
  }
}

// ─── Metadata ────────────────────────────────────────────────

export async function getImageMetadata(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const metadata = await sharp(Buffer.from(data)).metadata();
    const stats = await sharp(Buffer.from(data)).stats();

    const result = {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      space: metadata.space,
      depth: metadata.depth,
      density: metadata.density,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif ? 'present' : 'none',
      icc: metadata.icc ? 'present' : 'none',
      size: data.length,
      isProgressive: metadata.isProgressive,
    };

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_metadata.json`,
        data: Buffer.from(JSON.stringify(result, null, 2)),
        mimeType: 'application/json',
        extension: '.json',
      }],
      metadata: result,
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to read image metadata: ${(error as Error).message}`);
  }
}

// ─── Remove EXIF ─────────────────────────────────────────────

export async function removeExif(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Removing EXIF data...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';

    const result = await sharp(Buffer.from(data))
      .rotate() // Auto-rotate based on EXIF before stripping
      .withMetadata({ orientation: undefined } as any)
      .toBuffer({ resolveWithObject: true });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_noexif${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: ext,
        size: result.info.size,
      }],
      metadata: {
        originalSize: data.length,
        newSize: result.info.size,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to remove EXIF: ${(error as Error).message}`);
  }
}

// ─── Generate Thumbnail ──────────────────────────────────────

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  format?: ImageFormat;
}

export async function generateThumbnail(
  data: Buffer | Uint8Array,
  filename: string,
  options: ThumbnailOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Generating thumbnail...');

    const width = options.width || 200;
    const height = options.height || 200;
    const format = options.format || 'jpeg';

    let pipeline = sharp(Buffer.from(data))
      .resize(width, height, { fit: 'cover', position: 'center' });

    switch (format) {
      case 'jpeg': pipeline = pipeline.jpeg({ quality: 80 }); break;
      case 'png': pipeline = pipeline.png(); break;
      case 'webp': pipeline = pipeline.webp({ quality: 80 }); break;
      default: pipeline = pipeline.jpeg({ quality: 80 });
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    const outputExt = `.${format === 'jpeg' ? 'jpg' : format}`;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_thumb${outputExt}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: outputExt,
        size: result.info.size,
      }],
      metadata: { width, height, format },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to generate thumbnail: ${(error as Error).message}`);
  }
}

// ─── Batch Resize ────────────────────────────────────────────

export async function batchResize(
  files: { data: Buffer | Uint8Array; name: string }[],
  options: ResizeOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (!files.length) throw new ValidationError('At least one image required');

  try {
    const resizedImages: OutputFile[] = [];

    for (let i = 0; i < files.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / files.length) * 80),
        `Resizing ${i + 1} of ${files.length}: ${files[i].name}`
      );

      const result = await resizeImage(files[i].data, files[i].name, options);
      resizedImages.push(...result.outputFiles);
    }

    processing?.onProgress?.(90, 'Packaging resized images into ZIP folder...');
    const zipResult = await createZip(
      resizedImages.map((f) => ({ data: f.data, name: f.name })),
      { outputFilename: 'resized_images.zip' }
    );

    return {
      success: true,
      outputFiles: zipResult.outputFiles,
      metadata: {
        filesProcessed: files.length,
        containedFiles: resizedImages.map((f) => ({
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Batch resize failed: ${(error as Error).message}`);
  }
}

// ─── Invert Image Colors ─────────────────────────────────────

export async function invertImage(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Inverting image colors...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';

    const result = await sharp(Buffer.from(data))
      .negate()
      .toBuffer({ resolveWithObject: true });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_inverted${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: ext,
        size: result.info.size,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to invert image colors: ${(error as Error).message}`);
  }
}

// ─── Gamma Correction ─────────────────────────────────────────

export async function gammaImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: { gamma?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Applying gamma correction...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';
    const gammaVal = options.gamma ?? 2.2;

    const result = await sharp(Buffer.from(data))
      .gamma(gammaVal)
      .toBuffer({ resolveWithObject: true });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_gamma${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: ext,
        size: result.info.size,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to apply gamma correction: ${(error as Error).message}`);
  }
}

// ─── Threshold Image ──────────────────────────────────────────

export async function thresholdImage(
  data: Buffer | Uint8Array,
  filename: string,
  options: { threshold?: number; invert?: boolean; background?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Applying binary threshold...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';
    const threshVal = options.threshold ?? 128;

    let pipeline = sharp(Buffer.from(data));
    const metadata = await sharp(Buffer.from(data)).metadata();

    if (options.background === 'white' && metadata.hasAlpha) {
      pipeline = pipeline.flatten({ background: '#ffffff' });
    }

    pipeline = pipeline.threshold(threshVal);

    if (options.invert) {
      pipeline = pipeline.negate({ alpha: false });
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_threshold${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: ext,
        size: result.info.size,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to apply threshold: ${(error as Error).message}`);
  }
}

// ─── Dominant Color Statistics ────────────────────────────────

export async function dominantColorsImage(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Calculating image color statistics...');

    const stats = await sharp(Buffer.from(data)).stats();
    const resultObj = {
      filename,
      dominant: stats.dominant,
      channels: stats.channels.map(c => ({
        min: c.min,
        max: c.max,
        mean: Math.round(c.mean),
        stdev: Math.round(c.stdev),
      })),
      isOpaque: stats.isOpaque,
    };

    const jsonStr = JSON.stringify(resultObj, null, 2);
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_colors.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: resultObj,
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract image color statistics: ${(error as Error).message}`);
  }
}

// ─── Trim Transparent Edges ───────────────────────────────────

export interface TrimEdgesOptions {
  threshold?: number;
  padding?: number;
  mode?: 'transparent' | 'auto' | 'white' | 'black' | string;
}

export async function trimTransparentEdges(
  data: Buffer | Uint8Array,
  filename: string,
  options: TrimEdgesOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Analyzing image borders...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';
    const threshold = options.threshold !== undefined ? Math.max(0, Math.min(255, Number(options.threshold))) : 10;
    const padding = options.padding !== undefined ? Math.max(0, Math.min(200, Number(options.padding))) : 0;
    const mode = options.mode || 'transparent';

    let img = sharp(Buffer.from(data));
    const meta = await img.metadata();
    const origWidth = meta.width || 0;
    const origHeight = meta.height || 0;

    if (!origWidth || !origHeight) {
      throw new ProcessingError('Invalid image dimensions');
    }

    // Convert to raw pixel buffer for accurate bounding box calculation
    let rawImg = sharp(Buffer.from(data));

    if (mode === 'transparent') {
      rawImg = rawImg.ensureAlpha();
    }

    const { data: rawData, info } = await rawImg.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    if (mode === 'transparent') {
      // Find bounding box where alpha > threshold
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * channels;
          const a = rawData[idx + 3];
          if (a > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    } else {
      // Color-based trimming (white, black, or auto from 4 corners)
      let targetR = 255;
      let targetG = 255;
      let targetB = 255;

      if (mode === 'black') {
        targetR = 0; targetG = 0; targetB = 0;
      } else if (mode === 'auto') {
        // Sample 4 corners
        const getPix = (px: number, py: number) => {
          const i = (py * width + px) * channels;
          return [rawData[i], rawData[i + 1], rawData[i + 2]];
        };
        const c1 = getPix(0, 0);
        const c2 = getPix(width - 1, 0);
        const c3 = getPix(0, height - 1);
        const c4 = getPix(width - 1, height - 1);
        targetR = Math.round((c1[0] + c2[0] + c3[0] + c4[0]) / 4);
        targetG = Math.round((c1[1] + c2[1] + c3[1] + c4[1]) / 4);
        targetB = Math.round((c1[2] + c2[2] + c3[2] + c4[2]) / 4);
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * channels;
          const r = rawData[idx];
          const g = rawData[idx + 1];
          const b = rawData[idx + 2];
          const a = channels === 4 ? rawData[idx + 3] : 255;

          const colorDist = Math.sqrt(
            Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2)
          );

          if ((channels === 4 && a < 25) || colorDist > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    processing?.onProgress?.(70, 'Cropping trimmed bounding box...');

    let resultBuffer: Buffer;
    let cropLeft = 0;
    let cropTop = 0;
    let cropWidth = origWidth;
    let cropHeight = origHeight;

    // If valid bounding box found, crop; otherwise return original
    if (maxX >= minX && maxY >= minY) {
      cropLeft = Math.max(0, minX - padding);
      cropTop = Math.max(0, minY - padding);
      const rightPad = Math.min(origWidth - 1, maxX + padding);
      const bottomPad = Math.min(origHeight - 1, maxY + padding);
      cropWidth = rightPad - cropLeft + 1;
      cropHeight = bottomPad - cropTop + 1;

      resultBuffer = await sharp(Buffer.from(data))
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .toBuffer();
    } else {
      resultBuffer = Buffer.from(data);
    }

    const trimmedTop = cropTop;
    const trimmedBottom = origHeight - (cropTop + cropHeight);
    const trimmedLeft = cropLeft;
    const trimmedRight = origWidth - (cropLeft + cropWidth);
    const percentReduction = Math.round((1 - (cropWidth * cropHeight) / (origWidth * origHeight)) * 100);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_trimmed${ext}`,
        data: resultBuffer,
        mimeType: MIME_FOR_FORMAT[format] || 'image/png',
        extension: ext,
        size: resultBuffer.length,
      }],
      metadata: {
        width: cropWidth,
        height: cropHeight,
        originalWidth: origWidth,
        originalHeight: origHeight,
        trimmedTop,
        trimmedBottom,
        trimmedLeft,
        trimmedRight,
        percentReduction,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to trim transparent edges: ${(error as Error).message}`);
  }
}

// ─── Remove Background ─────────────────────────────────────────

export interface RemoveBackgroundOptions {
  model?: 'u2net' | 'u2netp' | 'isnet-general-use' | string;
  format?: 'png' | 'webp';
  alphaMatting?: boolean;
  bgcolor?: string;
}

export async function removeBackground(
  data: Buffer | Uint8Array,
  filename: string,
  options: RemoveBackgroundOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const inputExt = getExtension(filename).toLowerCase() || '.png';
  const outExt = options.format === 'webp' ? '.webp' : '.png';
  const model = options.model || 'u2net';
  const bgcolor = options.bgcolor || '';

  const tempId = generateId();
  const tempDir = join(tmpdir(), `uft_rembg_${tempId}`);
  const inputPath = join(tempDir, `input${inputExt}`);
  const outputPath = join(tempDir, `output.png`);

  try {
    processing?.onProgress?.(15, 'Preparing image for AI background removal...');
    await mkdir(tempDir, { recursive: true });
    await writeFile(inputPath, data);

    let scriptPath = '';
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const candidates = [
        join(currentDir, 'remove_bg.py'),
        join(process.cwd(), 'packages', 'shared', 'src', 'services', 'image', 'remove_bg.py'),
        join(process.cwd(), 'packages', 'shared', 'dist', 'services', 'image', 'remove_bg.py'),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          scriptPath = cand;
          break;
        }
      }
    } catch {
      // Ignore resolution error
    }

    let success = false;
    if (scriptPath) {
      processing?.onProgress?.(40, 'Detecting subject and isolating background with AI...');
      try {
        await execFileAsync('python', [scriptPath, inputPath, outputPath, model, bgcolor], { timeout: 60000 });
        success = existsSync(outputPath);
      } catch {
        try {
          await execFileAsync('python3', [scriptPath, inputPath, outputPath, model, bgcolor], { timeout: 60000 });
          success = existsSync(outputPath);
        } catch (pyErr: any) {
          console.warn('[removeBackground] Python AI removal failed, attempting fallback:', pyErr?.message);
        }
      }
    }

    let resultBuffer: Buffer;
    if (success && existsSync(outputPath)) {
      processing?.onProgress?.(85, 'Finalizing transparent cutout...');
      resultBuffer = await readFile(outputPath);
    } else {
      // Pure Sharp Fallback: Corner-sampling Chroma / Alpha transparency
      processing?.onProgress?.(60, 'Processing edge transparency fallback...');
      const img = sharp(Buffer.from(data)).ensureAlpha();
      const raw = await img.raw().toBuffer({ resolveWithObject: true });
      const { data: rawData, info } = raw;
      const { width, height, channels } = info;

      const getPixel = (x: number, y: number) => {
        const idx = (y * width + x) * channels;
        return [rawData[idx], rawData[idx + 1], rawData[idx + 2]];
      };

      const c1 = getPixel(0, 0);
      const c2 = getPixel(Math.max(0, width - 1), 0);
      const c3 = getPixel(0, Math.max(0, height - 1));
      const c4 = getPixel(Math.max(0, width - 1), Math.max(0, height - 1));
      const bgR = Math.round((c1[0] + c2[0] + c3[0] + c4[0]) / 4);
      const bgG = Math.round((c1[1] + c2[1] + c3[1] + c4[1]) / 4);
      const bgB = Math.round((c1[2] + c2[2] + c3[2] + c4[2]) / 4);

      const outData = Buffer.from(rawData);
      const threshold = 35;
      const feather = 20;

      for (let i = 0; i < outData.length; i += channels) {
        const dr = outData[i] - bgR;
        const dg = outData[i + 1] - bgG;
        const db = outData[i + 2] - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < threshold) {
          outData[i + 3] = 0;
        } else if (dist < threshold + feather) {
          outData[i + 3] = Math.round(((dist - threshold) / feather) * 255);
        }
      }

      resultBuffer = await sharp(outData, {
        raw: { width, height, channels },
      })
        .png()
        .toBuffer();
    }

    // Convert format if webp requested
    if (options.format === 'webp') {
      resultBuffer = await sharp(resultBuffer).webp({ quality: 95, lossless: true }).toBuffer();
    }

    const metadata = await sharp(resultBuffer).metadata();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_no_bg${outExt}`,
        data: resultBuffer,
        mimeType: outExt === '.webp' ? 'image/webp' : 'image/png',
        extension: outExt,
        size: resultBuffer.length,
      }],
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: outExt.slice(1),
        isTransparent: true,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to remove background: ${(error as Error).message}`);
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}
