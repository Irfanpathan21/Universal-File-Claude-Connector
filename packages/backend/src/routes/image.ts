/**
 * Image Routes
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { imageService, ValidationError } from '@uft/shared';
import { existsSync, createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, join, dirname, basename } from 'node:path';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerImageRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  // ── Resize ────────────────────────────────────────────────
  app.post('/resize', {
    schema: { tags: ['Image'], summary: 'Resize image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.resizeImage(files[0].data, files[0].name, {
        width: params.width ? parseInt(params.width) : undefined,
        height: params.height ? parseInt(params.height) : undefined,
        fit: (params.fit as any) || 'inside',
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Crop ──────────────────────────────────────────────────
  app.post('/crop', {
    schema: { tags: ['Image'], summary: 'Crop image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.cropImage(files[0].data, files[0].name, {
        left: parseInt(params.left || '0'),
        top: parseInt(params.top || '0'),
        width: parseInt(params.width),
        height: parseInt(params.height),
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Rotate ────────────────────────────────────────────────
  app.post('/rotate', {
    schema: { tags: ['Image'], summary: 'Rotate image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.rotateImage(files[0].data, files[0].name, {
        angle: parseInt(params.angle || '90'),
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Flip ──────────────────────────────────────────────────
  app.post('/flip', {
    schema: { tags: ['Image'], summary: 'Flip image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.flipImage(
        files[0].data, files[0].name,
        (params.direction as 'horizontal' | 'vertical') || 'horizontal'
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Compress ──────────────────────────────────────────────
  app.post('/compress', {
    schema: { tags: ['Image'], summary: 'Compress image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.compressImage(files[0].data, files[0].name, {
        quality: params.quality ? parseInt(params.quality) : 80,
        format: params.format as any || undefined,
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Convert ───────────────────────────────────────────────
  app.post('/convert', {
    schema: { tags: ['Image'], summary: 'Convert image format', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      if (!params.format) throw new ValidationError('Target format is required');

      const result = await imageService.convertImage(files[0].data, files[0].name, {
        format: params.format as any,
        quality: params.quality ? parseInt(params.quality) : undefined,
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Blur ──────────────────────────────────────────────────
  app.post('/blur', {
    schema: { tags: ['Image'], summary: 'Blur image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.blurImage(
        files[0].data, files[0].name,
        params.sigma ? parseFloat(params.sigma) : 5
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Sharpen ───────────────────────────────────────────────
  app.post('/sharpen', {
    schema: { tags: ['Image'], summary: 'Sharpen image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.sharpenImage(files[0].data, files[0].name, {
        sigma: params.sigma ? parseFloat(params.sigma) : undefined,
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Adjust (brightness/saturation) ────────────────────────
  app.post('/adjust', {
    schema: { tags: ['Image'], summary: 'Adjust brightness/saturation', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.adjustImage(files[0].data, files[0].name, {
        brightness: params.brightness ? parseFloat(params.brightness) : undefined,
        saturation: params.saturation ? parseFloat(params.saturation) : undefined,
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Grayscale ─────────────────────────────────────────────
  app.post('/grayscale', {
    schema: { tags: ['Image'], summary: 'Convert to grayscale', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.grayscaleImage(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Metadata ──────────────────────────────────────────────
  app.post('/metadata', {
    schema: { tags: ['Image'], summary: 'Get image metadata', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.getImageMetadata(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Remove EXIF ───────────────────────────────────────────
  app.post('/remove-exif', {
    schema: { tags: ['Image'], summary: 'Remove EXIF data', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.removeExif(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Generate Thumbnail ────────────────────────────────────
  app.post('/thumbnail', {
    schema: { tags: ['Image'], summary: 'Generate thumbnail', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');

      const result = await imageService.generateThumbnail(files[0].data, files[0].name, {
        width: params.width ? parseInt(params.width) : undefined,
        height: params.height ? parseInt(params.height) : undefined,
      });

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Batch Resize ──────────────────────────────────────────
  app.post('/batch-resize', {
    schema: { tags: ['Image'], summary: 'Batch resize images', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 50);
      if (files.length < 1) throw new ValidationError('At least one image is required');

      const result = await imageService.batchResize(
        files.map(f => ({ data: f.data, name: f.name })),
        {
          width: params.width ? parseInt(params.width) : undefined,
          height: params.height ? parseInt(params.height) : undefined,
          fit: (params.fit as any) || 'inside',
        }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Invert Colors ─────────────────────────────────────────
  app.post('/invert', {
    schema: { tags: ['Image'], summary: 'Invert image colors', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      const result = await imageService.invertImage(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Gamma Correction ──────────────────────────────────────
  app.post('/gamma', {
    schema: { tags: ['Image'], summary: 'Gamma correction', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      const result = await imageService.gammaImage(files[0].data, files[0].name, {
        gamma: params.gamma ? parseFloat(params.gamma) : undefined,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Thresholding ──────────────────────────────────────────
  app.post('/threshold', {
    schema: { tags: ['Image'], summary: 'Image thresholding', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      const result = await imageService.thresholdImage(files[0].data, files[0].name, {
        threshold: params.threshold ? parseInt(params.threshold) : undefined,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Dominant Colors ───────────────────────────────────────
  app.post('/dominant-colors', {
    schema: { tags: ['Image'], summary: 'Dominant colors', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      const result = await imageService.dominantColorsImage(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Trim Edges ────────────────────────────────────────────
  app.post('/trim', {
    schema: { tags: ['Image'], summary: 'Trim transparent edges', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      const result = await imageService.trimTransparentEdges(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Preview Local Image (for MCP Interactive Visual Cropper Window) ──
  app.get('/preview-local', async (request, reply) => {
    const query = request.query as { path?: string };
    if (!query.path) {
      reply.status(400).send({ error: 'Missing path parameter' });
      return;
    }
    const resolved = resolve(query.path);
    if (!existsSync(resolved)) {
      reply.status(404).send({ error: `File not found: ${resolved}` });
      return;
    }
    const ext = extname(resolved).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const stream = createReadStream(resolved);
    reply.header('Content-Type', contentType);
    return reply.send(stream);
  });

  // ── Direct Crop from Disk Path (for MCP Interactive Visual Cropper Window) ──
  app.post('/crop-direct', async (request, reply) => {
    try {
      const body = request.body as {
        file: string;
        left: number;
        top: number;
        width: number;
        height: number;
        outputPath?: string;
      };
      if (!body.file) {
        reply.status(400).send({ error: 'Missing file parameter' });
        return;
      }
      const resolved = resolve(body.file);
      if (!existsSync(resolved)) {
        reply.status(404).send({ error: `File not found: ${resolved}` });
        return;
      }
      const data = await readFile(resolved);
      const result = await imageService.cropImage(data, basename(resolved), {
        left: Math.max(0, Math.round(body.left)),
        top: Math.max(0, Math.round(body.top)),
        width: Math.max(1, Math.round(body.width)),
        height: Math.max(1, Math.round(body.height)),
      });
      const finalOut = body.outputPath ? resolve(body.outputPath) : join(dirname(resolved), `${basename(resolved, extname(resolved))}_cropped${result.outputFiles[0].extension}`);
      await mkdir(dirname(finalOut), { recursive: true });
      await writeFile(finalOut, result.outputFiles[0].data as Buffer);
      return reply.send({
        success: true,
        message: 'Crop applied successfully',
        outputPath: finalOut,
        metadata: result.metadata,
      });
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Crop failed' });
    }
  });

  done();
};
