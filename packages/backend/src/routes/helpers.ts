/**
 * Route Helpers
 *
 * Common utilities for file upload handling and response formatting.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  generateId,
  sanitizeFilename,
  getMimeType,
  getExtension,
  type FileInfo,
  type ProcessingResult,
  FileToolkitError,
} from '@uft/shared';

/**
 * Extract uploaded files from a multipart request.
 */
export async function extractUploadedFiles(
  request: FastifyRequest,
  uploadDir: string,
  maxFiles: number = 100
): Promise<{ files: { data: Buffer; name: string; info: FileInfo }[] }> {
  const files: { data: Buffer; name: string; info: FileInfo }[] = [];
  const parts = request.parts();

  for await (const part of parts) {
    if (part.type === 'file') {
      if (files.length >= maxFiles) break;

      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer);
      }
      const data = Buffer.concat(chunks);
      const id = generateId();
      const name = sanitizeFilename(part.filename || 'unnamed');
      const ext = getExtension(name);

      // Save to upload directory
      const fileDir = join(uploadDir, id);
      await mkdir(fileDir, { recursive: true });
      const filePath = join(fileDir, name);
      await writeFile(filePath, data);

      const info: FileInfo = {
        id,
        name,
        originalName: part.filename || 'unnamed',
        path: filePath,
        size: data.length,
        mimeType: part.mimetype || getMimeType(ext),
        extension: ext,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      };

      files.push({ data, name, info });
    }
  }

  return { files };
}

/**
 * Extract uploaded files along with form field parameters.
 */
export async function extractFilesAndParams(
  request: FastifyRequest,
  uploadDir: string,
  maxFiles: number = 100
): Promise<{
  files: { data: Buffer; name: string; info: FileInfo }[];
  params: Record<string, string>;
}> {
  const files: { data: Buffer; name: string; info: FileInfo }[] = [];
  const params: Record<string, string> = {};
  const parts = request.parts();

  for await (const part of parts) {
    if (part.type === 'file') {
      if (files.length >= maxFiles) continue;

      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk as Buffer);
      }
      const data = Buffer.concat(chunks);
      const id = generateId();
      const name = sanitizeFilename(part.filename || 'unnamed');
      const ext = getExtension(name);

      const fileDir = join(uploadDir, id);
      await mkdir(fileDir, { recursive: true });
      const filePath = join(fileDir, name);
      await writeFile(filePath, data);

      const info: FileInfo = {
        id,
        name,
        originalName: part.filename || 'unnamed',
        path: filePath,
        size: data.length,
        mimeType: part.mimetype || getMimeType(ext),
        extension: ext,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      };

      files.push({ data, name, info });
    } else if (part.type === 'field') {
      params[part.fieldname] = String(part.value);
    }
  }

  return { files, params };
}

/**
 * Save processing results and send response.
 */
export async function sendProcessingResult(
  reply: FastifyReply,
  result: ProcessingResult,
  outputDir: string,
  jobId?: string
): Promise<void> {
  const outputFiles: FileInfo[] = [];

  for (const file of result.outputFiles) {
    const id = generateId();
    const fileDir = join(outputDir, id);
    await mkdir(fileDir, { recursive: true });
    const filePath = join(fileDir, file.name);
    await writeFile(filePath, file.data);

    outputFiles.push({
      id,
      name: file.name,
      originalName: file.name,
      path: filePath,
      size: file.size || file.data.length,
      mimeType: file.mimeType,
      extension: file.extension,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });
  }

  reply.send({
    success: true,
    jobId,
    outputFiles: outputFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      downloadUrl: `/api/download/${f.id}/${encodeURIComponent(f.name)}`,
    })),
    metadata: result.metadata,
    message: result.message || 'Processing completed successfully',
    duration: result.duration,
  });
}

/**
 * Error handler for routes.
 */
export function handleRouteError(reply: FastifyReply, error: unknown): void {
  if (error instanceof FileToolkitError) {
    const fileError = error as FileToolkitError;
    reply.status(fileError.statusCode).send({
      success: false,
      error: {
        code: fileError.code,
        message: fileError.message,
        details: fileError.details,
      },
    });
  } else {
    reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: (error as Error).message || 'An unexpected error occurred',
      },
    });
  }
}
