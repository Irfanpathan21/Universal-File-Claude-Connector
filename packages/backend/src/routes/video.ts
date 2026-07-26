/**
 * Video Routes (MP4 / MKV / AVI / MOV / WEBM)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { videoService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerVideoRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/compress', {
    schema: { tags: ['Video'], summary: 'Compress video', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A video file is required');
      const result = await videoService.compressVideo(files[0].data, files[0].name, {
        crf: params.crf ? parseInt(params.crf) : undefined,
        preset: params.preset,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/thumbnail', {
    schema: { tags: ['Video'], summary: 'Video thumbnail', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A video file is required');
      const result = await videoService.generateVideoThumbnail(files[0].data, files[0].name, {
        timestamp: params.timestamp,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/to-gif', {
    schema: { tags: ['Video'], summary: 'Video to animated GIF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A video file is required');
      const result = await videoService.videoToGif(files[0].data, files[0].name, {
        fps: params.fps ? parseInt(params.fps) : undefined,
        width: params.width ? parseInt(params.width) : undefined,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/from-gif', {
    schema: { tags: ['Video'], summary: 'GIF to MP4 video', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A GIF file is required');
      const result = await videoService.gifToVideo(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/trim', {
    schema: { tags: ['Video'], summary: 'Trim video clip', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A video file is required');
      const result = await videoService.trimVideo(files[0].data, files[0].name, {
        startTime: params.startTime,
        endTime: params.endTime,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/mute', {
    schema: { tags: ['Video'], summary: 'Mute video', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A video file is required');
      const result = await videoService.muteVideo(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
