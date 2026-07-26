/**
 * Universal File Toolkit — Fastify Application Factory
 *
 * Creates and configures the Fastify server with all plugins and routes.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { getConfig, TempFileManager } from '@uft/shared';
import { registerPdfRoutes } from './routes/pdf.js';
import { registerImageRoutes } from './routes/image.js';
import { registerDataRoutes } from './routes/data.js';
import { registerDocumentRoutes } from './routes/document.js';
import { registerSpreadsheetRoutes } from './routes/spreadsheet.js';
import { registerPresentationRoutes } from './routes/presentation.js';
import { registerTextRoutes } from './routes/text.js';
import { registerArchiveRoutes } from './routes/archive.js';
import { registerAudioRoutes } from './routes/audio.js';
import { registerVideoRoutes } from './routes/video.js';
import { registerOcrRoutes } from './routes/ocr.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerUtilityRoutes } from './routes/utility.js';
import { JobQueue } from './queue/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const config = getConfig();

  const app = Fastify({
    logger: {
      level: config.logging.level,
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    bodyLimit: 50 * 1024 * 1024, // 50MB for JSON bodies
  });

  // ── Create directories ────────────────────────────────────
  const uploadDir = resolve(config.files.uploadDir);
  const outputDir = resolve(config.files.outputDir);
  const tempDir = resolve(config.files.tempDir);

  await mkdir(uploadDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });

  // ── Temp file manager ─────────────────────────────────────
  const tempManager = new TempFileManager(tempDir, config.cleanup.fileTTL);
  await tempManager.initialize();
  tempManager.startAutoCleanup(config.cleanup.interval);

  // ── Job queue ─────────────────────────────────────────────
  const jobQueue = new JobQueue();

  // Decorate app with shared instances
  app.decorate('tempManager', tempManager);
  app.decorate('jobQueue', jobQueue);
  app.decorate('config', config);
  app.decorate('uploadDir', uploadDir);
  app.decorate('outputDir', outputDir);

  // ── Plugins ───────────────────────────────────────────────

  // CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  // Multipart file uploads
  await app.register(multipart, {
    limits: {
      fileSize: config.files.maxFileSize,
      files: 100,
    },
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.window,
  });

  // Static file serving for downloads
  await app.register(fastifyStatic, {
    root: outputDir,
    prefix: '/downloads/',
    decorateReply: false,
  });

  // Swagger / OpenAPI
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Universal File Toolkit API',
        description: 'A comprehensive file processing API. No authentication required.',
        version: '1.0.0',
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
      },
      servers: [
        { url: `http://localhost:${config.server.port}`, description: 'Local server' },
      ],
      tags: [
        { name: 'PDF', description: 'PDF processing tools' },
        { name: 'Image', description: 'Image processing tools' },
        { name: 'Data', description: 'Data conversion tools' },
        { name: 'Utility', description: 'Utility endpoints' },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // ── Routes ────────────────────────────────────────────────
  await app.register(registerPdfRoutes, { prefix: '/api/pdf' });
  await app.register(registerImageRoutes, { prefix: '/api/image' });
  await app.register(registerDataRoutes, { prefix: '/api/data' });
  await app.register(registerDocumentRoutes, { prefix: '/api/document' });
  await app.register(registerSpreadsheetRoutes, { prefix: '/api/spreadsheet' });
  await app.register(registerPresentationRoutes, { prefix: '/api/presentation' });
  await app.register(registerTextRoutes, { prefix: '/api/text' });
  await app.register(registerArchiveRoutes, { prefix: '/api/archive' });
  await app.register(registerAudioRoutes, { prefix: '/api/audio' });
  await app.register(registerVideoRoutes, { prefix: '/api/video' });
  await app.register(registerOcrRoutes, { prefix: '/api/ocr' });
  await app.register(registerAiRoutes, { prefix: '/api/ai' });
  await app.register(registerUtilityRoutes, { prefix: '/api' });

  // ── Health check ──────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // ── Graceful shutdown ─────────────────────────────────────
  const shutdown = async () => {
    app.log.info('Shutting down...');
    tempManager.stopAutoCleanup();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return app;
}
