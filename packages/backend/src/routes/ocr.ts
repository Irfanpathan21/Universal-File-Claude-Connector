/**
 * OCR Routes (Tesseract Optical Character Recognition)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { ocrService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError, validateFileTypes } from './helpers.js';

export const registerOcrRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/image-ocr', {
    schema: { tags: ['OCR'], summary: 'Image OCR text extraction', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An image file is required');
      validateFileTypes(files, ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.tif', '.bmp'], 'OCR');
      const result = await ocrService.extractTextFromImageOcr(files[0].data, files[0].name, {
        language: params.language,
        preserveLayout: params.preserveLayout !== 'false',
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
