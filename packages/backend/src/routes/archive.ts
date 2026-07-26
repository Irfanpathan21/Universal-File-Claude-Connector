/**
 * Archive Routes (ZIP / TAR / GZ)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { archiveService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerArchiveRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/create-zip', {
    schema: { tags: ['Archive'], summary: 'Create ZIP archive', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 100);
      if (files.length < 1) throw new ValidationError('At least one file is required to create a ZIP');
      const result = await archiveService.createZip(
        files.map(f => ({ data: f.data, name: f.name })),
        { outputFilename: params.outputFilename }
      );
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-zip', {
    schema: { tags: ['Archive'], summary: 'Extract ZIP archive', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A ZIP file is required');
      const result = await archiveService.extractZip(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/list-contents', {
    schema: { tags: ['Archive'], summary: 'List archive contents', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A ZIP file is required');
      const result = await archiveService.listArchiveContents(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/compress-gzip', {
    schema: { tags: ['Archive'], summary: 'GZIP compress file', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A file is required');
      const result = await archiveService.compressGzip(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/decompress-gzip', {
    schema: { tags: ['Archive'], summary: 'GZIP decompress file', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A GZIP file is required');
      const result = await archiveService.decompressGzip(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
