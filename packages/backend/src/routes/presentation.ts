/**
 * Presentation Routes (PowerPoint PPTX / ODP)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { presentationService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerPresentationRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/extract-text', {
    schema: { tags: ['Presentation'], summary: 'Extract PPTX text', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PPTX file is required');
      const result = await presentationService.extractPptxText(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-notes', {
    schema: { tags: ['Presentation'], summary: 'Extract speaker notes', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PPTX file is required');
      const result = await presentationService.extractPptxNotes(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-images', {
    schema: { tags: ['Presentation'], summary: 'Extract PPTX images', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PPTX file is required');
      const result = await presentationService.extractPptxImages(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/to-html', {
    schema: { tags: ['Presentation'], summary: 'PPTX to HTML deck', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PPTX file is required');
      const result = await presentationService.pptxToHtml(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/metadata', {
    schema: { tags: ['Presentation'], summary: 'PPTX metadata & stats', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PPTX file is required');
      const result = await presentationService.readPptxMetadata(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
