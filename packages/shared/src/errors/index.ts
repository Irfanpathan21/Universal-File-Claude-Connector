/**
 * Custom error classes for the Universal File Toolkit.
 * Provides structured, actionable error information.
 */

export class FileToolkitError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'TOOLKIT_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FileToolkitError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends FileToolkitError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class FileNotFoundError extends FileToolkitError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND', 404, { path });
    this.name = 'FileNotFoundError';
  }
}

export class UnsupportedFormatError extends FileToolkitError {
  constructor(format: string, supportedFormats: string[]) {
    super(
      `Unsupported format: ${format}. Supported formats: ${supportedFormats.join(', ')}`,
      'UNSUPPORTED_FORMAT',
      400,
      { format, supportedFormats }
    );
    this.name = 'UnsupportedFormatError';
  }
}

export class FileTooLargeError extends FileToolkitError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${formatBytes(size)} exceeds maximum ${formatBytes(maxSize)}`,
      'FILE_TOO_LARGE',
      413,
      { size, maxSize }
    );
    this.name = 'FileTooLargeError';
  }
}

export class ProcessingError extends FileToolkitError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROCESSING_ERROR', 500, details);
    this.name = 'ProcessingError';
  }
}

export class ToolNotFoundError extends FileToolkitError {
  constructor(toolId: string) {
    super(`Tool not found: ${toolId}`, 'TOOL_NOT_FOUND', 404, { toolId });
    this.name = 'ToolNotFoundError';
  }
}

export class JobNotFoundError extends FileToolkitError {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', 404, { jobId });
    this.name = 'JobNotFoundError';
  }
}

export class CancellationError extends FileToolkitError {
  constructor(jobId?: string) {
    super(
      jobId ? `Job ${jobId} was cancelled` : 'Operation was cancelled',
      'CANCELLED',
      499,
      { jobId }
    );
    this.name = 'CancellationError';
  }
}

export class ExternalToolError extends FileToolkitError {
  constructor(tool: string, message: string) {
    super(
      `External tool "${tool}" error: ${message}`,
      'EXTERNAL_TOOL_ERROR',
      500,
      { tool }
    );
    this.name = 'ExternalToolError';
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
