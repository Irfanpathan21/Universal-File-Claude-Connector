/**
 * In-memory store to pass File objects across routes (Dashboard -> ToolPage)
 * without serialization issues in browser history state.
 * Supports React 18 StrictMode double-mounts and navigation life cycles.
 */

const GLOBAL_KEY = '__UFT_PENDING_FILES__';
const GLOBAL_TIME_KEY = '__UFT_PENDING_FILES_TS__';

let pendingFiles: File[] = [];
let pendingTimestamp = 0;

export function setPendingFiles(files: File[]): void {
  pendingFiles = [...files];
  pendingTimestamp = Date.now();
  if (typeof window !== 'undefined') {
    try {
      (window as any)[GLOBAL_KEY] = pendingFiles;
      (window as any)[GLOBAL_TIME_KEY] = pendingTimestamp;
    } catch {
      // Ignore if window is restricted
    }
  }
}

export function getPendingFiles(): File[] {
  let files = pendingFiles;
  let ts = pendingTimestamp;

  if (typeof window !== 'undefined') {
    const winFiles = (window as any)[GLOBAL_KEY];
    const winTs = (window as any)[GLOBAL_TIME_KEY];
    if ((!files || files.length === 0) && winFiles && winFiles.length > 0) {
      files = winFiles;
      ts = winTs || 0;
    }
  }

  // Keep files valid for 30 seconds across transitions and StrictMode double-mounts
  if (files && files.length > 0 && Date.now() - ts < 30000) {
    return [...files];
  }
  return [];
}

export function consumePendingFiles(): File[] {
  return getPendingFiles();
}

export function peekPendingFiles(): File[] {
  return getPendingFiles();
}

export function clearPendingFiles(): void {
  pendingFiles = [];
  pendingTimestamp = 0;
  if (typeof window !== 'undefined') {
    try {
      delete (window as any)[GLOBAL_KEY];
      delete (window as any)[GLOBAL_TIME_KEY];
    } catch {
      // Ignore
    }
  }
}

