/**
 * Image Processing Service
 *
 * High-performance image manipulation using Sharp.
 * Supports: PNG, JPG, JPEG, WEBP, GIF, BMP, TIFF, AVIF, HEIC, SVG
 */

import sharp from 'sharp';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError, UnsupportedFormatError } from '../../errors/index.js';
import { getBaseName, getExtension } from '../../utils/index.js';

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

    const result = await sharp(Buffer.from(data))
      .extract({
        left: Math.round(options.left),
        top: Math.round(options.top),
        width: Math.round(options.width),
        height: Math.round(options.height),
      })
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
  watermarkData: Buffer | Uint8Array;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  scale?: number; // 0-1, relative to main image
}

export async function addImageWatermark(
  data: Buffer | Uint8Array,
  filename: string,
  options: ImageWatermarkOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Adding watermark...');

    const mainImage = sharp(Buffer.from(data));
    const mainMeta = await mainImage.metadata();

    const watermarkWidth = Math.round((mainMeta.width || 500) * (options.scale || 0.3));

    let watermark = sharp(Buffer.from(options.watermarkData))
      .resize({ width: watermarkWidth })
      .ensureAlpha();

    if (options.opacity !== undefined) {
      const opacity = Math.max(0, Math.min(1, options.opacity));
      // Create a semi-transparent version
      watermark = watermark.composite([{
        input: Buffer.from([0, 0, 0, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      }]);
    }

    const watermarkBuffer = await watermark.toBuffer();

    let gravity: string;
    switch (options.position || 'center') {
      case 'top-left': gravity = 'northwest'; break;
      case 'top-right': gravity = 'northeast'; break;
      case 'bottom-left': gravity = 'southwest'; break;
      case 'bottom-right': gravity = 'southeast'; break;
      default: gravity = 'center';
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
    const outputFiles: OutputFile[] = [];

    for (let i = 0; i < files.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / files.length) * 90),
        `Resizing ${i + 1} of ${files.length}: ${files[i].name}`
      );

      const result = await resizeImage(files[i].data, files[i].name, options);
      outputFiles.push(...result.outputFiles);
    }

    return {
      success: true,
      outputFiles,
      metadata: { filesProcessed: files.length },
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
  options: { threshold?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Applying binary threshold...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';
    const threshVal = options.threshold ?? 128;

    const result = await sharp(Buffer.from(data))
      .threshold(threshVal)
      .toBuffer({ resolveWithObject: true });

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

export async function trimTransparentEdges(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Trimming transparent edges...');
    const ext = getExtension(filename);
    const format = FORMAT_MAP[ext] || 'png';

    const result = await sharp(Buffer.from(data))
      .trim()
      .toBuffer({ resolveWithObject: true });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_trimmed${ext}`,
        data: result.data,
        mimeType: MIME_FOR_FORMAT[format],
        extension: ext,
        size: result.info.size,
      }],
      metadata: { width: result.info.width, height: result.info.height },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to trim transparent edges: ${(error as Error).message}`);
  }
}
