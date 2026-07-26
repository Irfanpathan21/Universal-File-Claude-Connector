/**
 * Audio Routes (MP3 / WAV / AAC / OGG / FLAC)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { audioService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerAudioRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/convert', {
    schema: { tags: ['Audio'], summary: 'Convert audio format', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An audio file is required');
      const result = await audioService.convertAudio(files[0].data, files[0].name, {
        targetFormat: params.targetFormat as any,
        bitrate: params.bitrate,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-from-video', {
    schema: { tags: ['Audio'], summary: 'Extract audio from video', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A video file is required');
      const result = await audioService.extractAudioFromVideo(files[0].data, files[0].name, {
        targetFormat: params.targetFormat as any,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/trim', {
    schema: { tags: ['Audio'], summary: 'Trim audio clip', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An audio file is required');
      const result = await audioService.trimAudio(files[0].data, files[0].name, {
        startTime: params.startTime,
        endTime: params.endTime,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/change-speed', {
    schema: { tags: ['Audio'], summary: 'Change audio speed', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An audio file is required');
      const result = await audioService.changeAudioSpeed(files[0].data, files[0].name, {
        speed: params.speed ? parseFloat(params.speed) : undefined,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/waveform', {
    schema: { tags: ['Audio'], summary: 'Audio waveform image', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An audio file is required');
      const result = await audioService.audioToWaveform(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
