/**
 * Archive Processing Service (ZIP / TAR / GZ)
 *
 * Provides creating ZIP/TAR archives, extracting archive contents, and listing entries using JSZip and Archiver.
 */

import JSZip from 'jszip';
import * as archiverPkg from 'archiver';
const archiver = (archiverPkg as any).default || archiverPkg;
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

// ─── Create ZIP Archive ──────────────────────────────────────

export async function createZip(
  files: { data: Buffer | Uint8Array; name: string }[],
  options: { outputFilename?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (!files.length) throw new ValidationError('At least one file is required to create a ZIP archive');

  try {
    const zip = new JSZip();

    for (let i = 0; i < files.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / files.length) * 80),
        `Adding ${files[i].name} to ZIP...`
      );
      zip.file(files[i].name, files[i].data);
    }

    processing?.onProgress?.(90, 'Compressing archive...');
    const content = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const outputName = options.outputFilename || 'archive.zip';

    return {
      success: true,
      outputFiles: [{
        name: outputName.endsWith('.zip') ? outputName : `${outputName}.zip`,
        data: content,
        mimeType: 'application/zip',
        extension: '.zip',
        size: content.length,
      }],
      metadata: { fileCount: files.length, compressedSize: content.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to create ZIP archive: ${(error as Error).message}`);
  }
}

// ─── Extract ZIP Archive ─────────────────────────────────────

export async function extractZip(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading ZIP archive...');
    const zip = await JSZip.loadAsync(data);
    const fileKeys = Object.keys(zip.files).filter(k => !zip.files[k].dir);

    if (fileKeys.length === 0) throw new ValidationError('ZIP archive is empty or contains only directories');

    const outputFiles: OutputFile[] = [];

    for (let i = 0; i < fileKeys.length; i++) {
      const key = fileKeys[i];
      processing?.onProgress?.(
        Math.round(30 + ((i + 1) / fileKeys.length) * 60),
        `Extracting ${key}...`
      );
      const fileData = await zip.files[key].async('nodebuffer');
      const ext = key.includes('.') ? `.${key.split('.').pop()}` : '';

      outputFiles.push({
        name: key.split('/').pop() || key,
        data: fileData,
        mimeType: 'application/octet-stream',
        extension: ext,
        size: fileData.length,
      });
    }

    return {
      success: true,
      outputFiles,
      metadata: { totalFilesExtracted: outputFiles.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to extract ZIP archive: ${(error as Error).message}`);
  }
}

// ─── List Archive Contents ───────────────────────────────────

export async function listArchiveContents(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading archive entries...');
    const zip = await JSZip.loadAsync(data);

    const entries = Object.keys(zip.files).map(name => {
      const f = zip.files[name];
      return {
        path: name,
        isDirectory: f.dir,
        date: f.date ? f.date.toISOString() : null,
      };
    });

    const jsonStr = JSON.stringify(entries, null, 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_contents.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: { totalEntries: entries.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to list archive contents: ${(error as Error).message}`);
  }
}

// ─── GZIP Compress File ───────────────────────────────────────

export async function compressGzip(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const { gzip } = await import('node:zlib');
  const { promisify } = await import('node:util');
  const gzipAsync = promisify(gzip);

  try {
    processing?.onProgress?.(30, 'Compressing file with GZIP...');
    const compressed = await gzipAsync(data);

    return {
      success: true,
      outputFiles: [{
        name: `${filename}.gz`,
        data: compressed,
        mimeType: 'application/gzip',
        extension: '.gz',
        size: compressed.length,
      }],
      metadata: {
        originalSize: data.length,
        compressedSize: compressed.length,
        ratio: `${((1 - compressed.length / data.length) * 100).toFixed(1)}%`,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to gzip file: ${(error as Error).message}`);
  }
}

// ─── GZIP Decompress File ─────────────────────────────────────

export async function decompressGzip(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const { gunzip } = await import('node:zlib');
  const { promisify } = await import('node:util');
  const gunzipAsync = promisify(gunzip);

  try {
    processing?.onProgress?.(30, 'Decompressing GZIP file...');
    const decompressed = await gunzipAsync(data);
    const outName = filename.endsWith('.gz') ? filename.slice(0, -3) : `${filename}_decompressed`;

    return {
      success: true,
      outputFiles: [{
        name: outName,
        data: decompressed,
        mimeType: 'application/octet-stream',
        extension: outName.includes('.') ? `.${outName.split('.').pop()}` : '',
        size: decompressed.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to decompress GZIP file: ${(error as Error).message}`);
  }
}
