/**
 * Utility functions for file handling, validation, and temporary storage.
 */

import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat, readdir, unlink, writeFile, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { ValidationError, FileTooLargeError, UnsupportedFormatError } from '../errors/index.js';

// ─── Constants ───────────────────────────────────────────────

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
export const DEFAULT_FILE_TTL = 60 * 60 * 1000; // 1 hour
export const DEFAULT_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export const SUPPORTED_FORMATS: Record<string, string[]> = {
  pdf: ['.pdf'],
  image: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.svg', '.avif', '.heic', '.ico'],
  document: ['.doc', '.docx', '.odt', '.rtf'],
  spreadsheet: ['.xls', '.xlsx', '.csv', '.tsv', '.ods'],
  presentation: ['.ppt', '.pptx', '.odp'],
  data: ['.json', '.xml', '.yaml', '.yml', '.toml', '.csv', '.tsv', '.html', '.htm', '.md', '.markdown', '.sql', '.ini'],
  audio: ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.opus', '.m4a', '.aiff'],
  video: ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.wmv', '.flv', '.mpeg', '.3gp'],
  archive: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tar.gz', '.tar.bz2', '.tar.xz'],
};

export const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
};

// ─── File Utilities ──────────────────────────────────────────

export function generateId(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16);
}

export function getExtension(filename: string): string {
  return extname(filename).toLowerCase();
}

export function getBaseName(filename: string): string {
  return basename(filename, extname(filename));
}

export function getMimeType(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function sanitizeFilename(name: string): string {
  // Remove path traversal characters and unsafe characters
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/^\.+/, '')
    .trim() || 'unnamed';
}

// ─── Validation ──────────────────────────────────────────────

export function validateFileExtension(
  filename: string,
  allowedExtensions: string[]
): void {
  const ext = getExtension(filename);
  if (!allowedExtensions.includes(ext)) {
    throw new UnsupportedFormatError(ext, allowedExtensions);
  }
}

export function validateFileSize(
  size: number,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): void {
  if (size > maxSize) {
    throw new FileTooLargeError(size, maxSize);
  }
}

export function validateRequiredFiles(
  files: Buffer[] | Uint8Array[],
  min: number = 1,
  max: number = 100
): void {
  if (!files || files.length < min) {
    throw new ValidationError(
      `At least ${min} file(s) required, got ${files?.length || 0}`
    );
  }
  if (files.length > max) {
    throw new ValidationError(
      `Maximum ${max} files allowed, got ${files.length}`
    );
  }
}

/**
 * Prevent path traversal attacks.
 */
export function validateSafePath(inputPath: string, baseDir: string): string {
  const resolved = join(baseDir, inputPath);
  if (!resolved.startsWith(baseDir)) {
    throw new ValidationError('Path traversal detected', { inputPath, baseDir });
  }
  return resolved;
}

// ─── Temp File Manager ───────────────────────────────────────

export class TempFileManager {
  private readonly baseDir: string;
  private readonly ttl: number;
  private trackedFiles: Map<string, { path: string; expiresAt: number }> = new Map();
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(baseDir: string = './temp', ttl: number = DEFAULT_FILE_TTL) {
    this.baseDir = baseDir;
    this.ttl = ttl;
  }

  async initialize(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
  }

  async createTempDir(): Promise<string> {
    const id = generateId();
    const dir = join(this.baseDir, id);
    await mkdir(dir, { recursive: true });
    this.track(id, dir);
    return dir;
  }

  async writeTempFile(data: Buffer | Uint8Array, filename: string): Promise<string> {
    await this.initialize();
    const id = generateId();
    const dir = join(this.baseDir, id);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, sanitizeFilename(filename));
    await writeFile(filePath, data);
    this.track(id, dir);
    return filePath;
  }

  async readTempFile(id: string, filename: string): Promise<Buffer> {
    const dir = join(this.baseDir, id);
    const filePath = join(dir, sanitizeFilename(filename));
    return readFile(filePath);
  }

  track(id: string, path: string): void {
    this.trackedFiles.set(id, {
      path,
      expiresAt: Date.now() + this.ttl,
    });
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, info] of this.trackedFiles) {
      if (now >= info.expiresAt) {
        try {
          await rm(info.path, { recursive: true, force: true });
          this.trackedFiles.delete(id);
          cleaned++;
        } catch {
          // File might already be deleted
          this.trackedFiles.delete(id);
        }
      }
    }

    // Also clean untracked files in base dir
    try {
      if (existsSync(this.baseDir)) {
        const entries = await readdir(this.baseDir);
        for (const entry of entries) {
          const entryPath = join(this.baseDir, entry);
          try {
            const stats = await stat(entryPath);
            if (now - stats.mtimeMs > this.ttl) {
              await rm(entryPath, { recursive: true, force: true });
              cleaned++;
            }
          } catch {
            // Ignore stat errors
          }
        }
      }
    } catch {
      // Ignore readdir errors
    }

    return cleaned;
  }

  startAutoCleanup(interval: number = DEFAULT_CLEANUP_INTERVAL): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(() => {});
    }, interval);
  }

  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  async deleteFile(id: string): Promise<void> {
    const info = this.trackedFiles.get(id);
    if (info) {
      await rm(info.path, { recursive: true, force: true });
      this.trackedFiles.delete(id);
    }
  }

  async cleanupAll(): Promise<void> {
    this.stopAutoCleanup();
    for (const [id, info] of this.trackedFiles) {
      try {
        await rm(info.path, { recursive: true, force: true });
      } catch {
        // Ignore
      }
    }
    this.trackedFiles.clear();
  }
}

// ─── Shared Config ───────────────────────────────────────────

export function getConfig(): import('../types/index.js').ToolkitConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3001', 10),
      host: process.env.HOST || '0.0.0.0',
    },
    files: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(DEFAULT_MAX_FILE_SIZE), 10),
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      outputDir: process.env.OUTPUT_DIR || './output',
      tempDir: process.env.TEMP_DIR || './temp',
    },
    cleanup: {
      interval: parseInt(process.env.CLEANUP_INTERVAL || String(DEFAULT_CLEANUP_INTERVAL), 10),
      fileTTL: parseInt(process.env.FILE_TTL || String(DEFAULT_FILE_TTL), 10),
    },
    workers: {
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
    },
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };
}

// ─── JSON Tabular Normalizer ───────────────────────────────────

export interface NormalizedTabularData {
  rows: Record<string, any>[];
  columns: string[];
}

/**
 * Recursively flattens an object into a flat key-value map using dot notation for nested objects.
 * Primitive arrays are formatted as readable delimited strings.
 * Complex arrays/objects that remain inside a cell are safely serialized to JSON strings.
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix = ''
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        // If array of primitives (strings, numbers, booleans)
        const isPrimitiveArray = value.every(
          v => v === null || v === undefined || typeof v !== 'object'
        );
        if (isPrimitiveArray) {
          result[fullKey] = value.join('; ');
        } else {
          // Complex array inside a single cell -> JSON stringify (never [object Object])
          result[fullKey] = JSON.stringify(value);
        }
      } else {
        // Nested dictionary/object -> recurse
        const flattened = flattenObject(value, fullKey);
        Object.assign(result, flattened);
      }
    } else {
      result[fullKey] = value ?? '';
    }
  }

  return result;
}

/**
 * Converts any arbitrary JSON structure into a clean tabular list of rows and column headers.
 * - Detects and unrolls wrapper objects with collection arrays (e.g. { filename, total, keywords: [...] })
 * - Flattens nested objects into dot-notation columns
 * - Collects the full union of all columns across all rows in order of discovery
 * - Guarantees zero `[object Object]` values
 */
export function normalizeJsonToTabularRows(jsonData: any): NormalizedTabularData {
  if (jsonData === null || jsonData === undefined) {
    return { rows: [], columns: [] };
  }

  let rawRows: Record<string, any>[] = [];

  // 1. Root is a 2D Array / Matrix (e.g. [["header1", "header2"], ["val1", "val2"]])
  if (Array.isArray(jsonData) && jsonData.length > 0 && Array.isArray(jsonData[0])) {
    const headers: string[] = jsonData[0].map((h: any, idx: number) => String(h || `col_${idx + 1}`));
    const dataRows = jsonData.slice(1);
    rawRows = dataRows.map(rowArr => {
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = rowArr[idx] ?? '';
      });
      return rowObj;
    });
    return { rows: rawRows, columns: headers };
  }

  // 2. Root is a 1D Array of Primitives (e.g. ["a", "b", "c"] or [1, 2, 3])
  if (Array.isArray(jsonData) && jsonData.length > 0 && (typeof jsonData[0] !== 'object' || jsonData[0] === null)) {
    rawRows = jsonData.map(val => ({ value: val ?? '' }));
    return { rows: rawRows, columns: ['value'] };
  }

  // 3. Root is an Array of Objects (standard tabular JSON)
  if (Array.isArray(jsonData)) {
    rawRows = jsonData.map(item => {
      if (typeof item === 'object' && item !== null) {
        return flattenObject(item);
      }
      return { value: item ?? '' };
    });
  } else if (typeof jsonData === 'object' && jsonData !== null) {
    // 4. Root is a single Object. Check if it's a wrapper around a collection array!
    const arrayKeys = Object.keys(jsonData).filter(k => Array.isArray(jsonData[k]));

    if (arrayKeys.length > 0) {
      // Prioritize common collection keys or the array with the most items
      const preferredNames = ['keywords', 'data', 'items', 'records', 'results', 'rows', 'list', 'users', 'products', 'entries'];
      const bestKey =
        arrayKeys.find(k => preferredNames.includes(k.toLowerCase())) ||
        arrayKeys.sort((a, b) => (jsonData[b]?.length || 0) - (jsonData[a]?.length || 0))[0];

      const collection = jsonData[bestKey];

      // Extract parent metadata properties (everything other than the collection array)
      const parentMetadata: Record<string, any> = {};
      for (const [k, v] of Object.entries(jsonData)) {
        if (k !== bestKey) {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            Object.assign(parentMetadata, flattenObject(v, k));
          } else if (Array.isArray(v)) {
            parentMetadata[k] = v.every(x => typeof x !== 'object' || x === null) ? v.join('; ') : JSON.stringify(v);
          } else {
            parentMetadata[k] = v ?? '';
          }
        }
      }

      if (Array.isArray(collection) && collection.length > 0) {
        rawRows = collection.map(item => {
          if (typeof item === 'object' && item !== null) {
            return { ...parentMetadata, ...flattenObject(item) };
          }
          const singularKey = bestKey.endsWith('s') ? bestKey.slice(0, -1) : bestKey;
          return { ...parentMetadata, [singularKey]: item ?? '' };
        });
      } else {
        // Collection array was empty: return 1 row with parent metadata
        rawRows = [parentMetadata];
      }
    } else {
      // 5. Root is a single flat or nested object without collection arrays
      rawRows = [flattenObject(jsonData)];
    }
  } else {
    // 6. Root is a primitive value
    rawRows = [{ value: jsonData }];
  }

  // Ensure all cell values are primitives or stringified JSON (NO [object Object] ever!)
  const sanitizedRows: Record<string, any>[] = rawRows.map(row => {
    const cleanRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && typeof v === 'object') {
        cleanRow[k] = Array.isArray(v) ? v.join('; ') : JSON.stringify(v);
      } else {
        cleanRow[k] = v ?? '';
      }
    }
    return cleanRow;
  });

  // Collect the complete union of columns across all rows in order of appearance
  const columnSet = new Set<string>();
  for (const row of sanitizedRows) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }

  const columns = Array.from(columnSet);

  return { rows: sanitizedRows, columns };
}

