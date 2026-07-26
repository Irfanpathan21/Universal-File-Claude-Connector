/**
 * Utility Routes — tools listing, downloads, health, jobs
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getTools, getToolById, getToolsByCategory, getActiveCategories, searchTools } from '@uft/shared';
import type { ToolCategory } from '@uft/shared';

export const registerUtilityRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;

  // ── List all tools ────────────────────────────────────────
  app.get('/tools', {
    schema: { tags: ['Utility'], summary: 'List all tools' },
  }, async (request, reply) => {
    const query = (request.query as any)?.q;
    const category = (request.query as any)?.category;

    let tools;
    if (query) {
      tools = searchTools(query);
    } else if (category) {
      tools = getToolsByCategory(category as ToolCategory);
    } else {
      tools = getTools();
    }

    reply.send({
      success: true,
      tools,
      categories: getActiveCategories(),
      total: tools.length,
    });
  });

  // ── Get single tool ───────────────────────────────────────
  app.get('/tools/:id', {
    schema: { tags: ['Utility'], summary: 'Get tool details' },
  }, async (request, reply) => {
    const toolId = (request.params as any).id;
    const tool = getToolById(toolId);

    if (!tool) {
      reply.status(404).send({
        success: false,
        error: { code: 'TOOL_NOT_FOUND', message: `Tool not found: ${toolId}` },
      });
      return;
    }

    reply.send({ success: true, tool });
  });

  // ── Get categories ────────────────────────────────────────
  app.get('/categories', {
    schema: { tags: ['Utility'], summary: 'List tool categories' },
  }, async (_request, reply) => {
    reply.send({
      success: true,
      categories: getActiveCategories(),
    });
  });

  // ── Download file ─────────────────────────────────────────
  app.get('/download/:id/:filename', {
    schema: { tags: ['Utility'], summary: 'Download processed file' },
  }, async (request, reply) => {
    const { id, filename } = request.params as { id: string; filename: string };
    const filePath = join(outputDir, id, decodeURIComponent(filename));

    // Path traversal check
    if (!filePath.startsWith(outputDir)) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }

    if (!existsSync(filePath)) {
      reply.status(404).send({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found or has expired' },
      });
      return;
    }

    const fileData = await readFile(filePath);
    const stats = await stat(filePath);

    reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      .header('Content-Length', stats.size)
      .send(fileData);
  });

  // ── Formats ───────────────────────────────────────────────
  app.get('/formats', {
    schema: { tags: ['Utility'], summary: 'List supported formats' },
  }, async (_request, reply) => {
    const { SUPPORTED_FORMATS } = await import('@uft/shared');
    reply.send({ success: true, formats: SUPPORTED_FORMATS });
  });

  // ── Version ───────────────────────────────────────────────
  app.get('/version', {
    schema: { tags: ['Utility'], summary: 'Get version info' },
  }, async (_request, reply) => {
    reply.send({
      success: true,
      version: '1.0.0',
      name: 'Universal File Toolkit',
      description: 'A production-ready file processing toolkit',
    });
  });

  // ── Hash File ─────────────────────────────────────────────
  app.post('/hash', {
    schema: { tags: ['Utility'], summary: 'File Checksum Hashing', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { utilityService, ValidationError } = await import('@uft/shared');
      const { extractFilesAndParams, sendProcessingResult, handleRouteError } = await import('./helpers.js');
      const { files } = await extractFilesAndParams(request, outputDir, 1);
      if (files.length < 1) throw new ValidationError('A file is required');
      const result = await utilityService.hashFile(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      const { handleRouteError } = await import('./helpers.js');
      handleRouteError(reply, error);
    }
  });

  done();
};
