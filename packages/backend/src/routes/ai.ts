/**
 * AI & NLP Routes (Summarize, Keywords, Sentiment)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { aiService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerAiRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/summarize', {
    schema: { tags: ['AI'], summary: 'Summarize text document', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A text file is required');
      const result = await aiService.summarizeText(files[0].data, files[0].name, {
        maxSentences: params.maxSentences ? parseInt(params.maxSentences) : undefined,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-keywords', {
    schema: { tags: ['AI'], summary: 'Extract keywords', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A text file is required');
      const result = await aiService.extractKeywords(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/sentiment', {
    schema: { tags: ['AI'], summary: 'Analyze sentiment', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A text file is required');
      const result = await aiService.analyzeSentiment(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
