/**
 * Universal File Toolkit — Core Type Definitions
 *
 * These types are shared across the backend, frontend, MCP server, and CLI.
 */

// ─── Tool System ─────────────────────────────────────────────

export type ToolCategory =
  | 'pdf'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'data'
  | 'text'
  | 'audio'
  | 'video'
  | 'archive'
  | 'ocr'
  | 'metadata'
  | 'ai';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  inputFormats: string[];
  outputFormats: string[];
  maxFiles: number;
  maxFileSize: number;
  parameters: ToolParameter[];
  tags: string[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'file' | 'range';
  label: string;
  description: string;
  required: boolean;
  default?: unknown;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
  accept?: string;
  placeholder?: string;
}

// ─── Processing ──────────────────────────────────────────────

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  toolId: string;
  status: JobStatus;
  progress: number;
  message: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  inputFiles: FileInfo[];
  outputFiles: FileInfo[];
  parameters: Record<string, unknown>;
  error?: string;
}

export interface FileInfo {
  id: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  createdAt: number;
  expiresAt: number;
}

export interface ProcessingResult {
  success: boolean;
  outputFiles: OutputFile[];
  metadata?: Record<string, unknown>;
  message?: string;
  error?: string;
  duration: number;
}

export interface OutputFile {
  name: string;
  data: Buffer | Uint8Array;
  mimeType: string;
  extension: string;
  size?: number;
}

export interface ProcessingOptions {
  onProgress?: (progress: number, message: string) => void;
  signal?: AbortSignal;
  tempDir?: string;
}

// ─── API ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolListResponse {
  tools: ToolDefinition[];
  categories: CategoryInfo[];
  total: number;
}

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  toolCount: number;
}

export interface JobResponse {
  job: Job;
}

export interface UploadResponse {
  files: FileInfo[];
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  capabilities: SystemCapabilities;
}

export interface SystemCapabilities {
  ffmpeg: boolean;
  libreoffice: boolean;
  tesseract: boolean;
  ghostscript: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}

// ─── MCP ─────────────────────────────────────────────────────

export interface McpToolInput {
  files?: string[];
  file?: string;
  outputPath?: string;
  [key: string]: unknown;
}

export interface McpToolOutput {
  success: boolean;
  outputPath?: string;
  outputPaths?: string[];
  message: string;
  metadata?: Record<string, unknown>;
}

// ─── Configuration ───────────────────────────────────────────

export interface ToolkitConfig {
  server: {
    port: number;
    host: string;
  };
  files: {
    maxFileSize: number;
    uploadDir: string;
    outputDir: string;
    tempDir: string;
  };
  cleanup: {
    interval: number;
    fileTTL: number;
  };
  workers: {
    concurrency: number;
  };
  rateLimit: {
    max: number;
    window: number;
  };
  logging: {
    level: string;
  };
}

// ─── Event Types ─────────────────────────────────────────────

export interface ProgressEvent {
  jobId: string;
  progress: number;
  message: string;
  status: JobStatus;
}

export interface JobCompletedEvent {
  jobId: string;
  outputFiles: FileInfo[];
  duration: number;
}

export interface JobFailedEvent {
  jobId: string;
  error: string;
  duration: number;
}
