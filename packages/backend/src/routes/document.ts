/**
 * Document Routes (Word / DOCX / ODT / RTF)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { documentService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerDocumentRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/extract-text', {
    schema: { tags: ['Document'], summary: 'Extract Word text', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.extractDocxText(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/to-html', {
    schema: { tags: ['Document'], summary: 'Word to HTML', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.docxToHtml(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-images', {
    schema: { tags: ['Document'], summary: 'Extract Word images', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.extractDocxImages(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/extract-links', {
    schema: { tags: ['Document'], summary: 'Extract Word links', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.extractDocxHyperlinks(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/to-markdown', {
    schema: { tags: ['Document'], summary: 'Word to Markdown', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.docxToMarkdown(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/from-text', {
    schema: { tags: ['Document'], summary: 'Text to Word', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A text file is required');
      const result = await documentService.textToDocx(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/merge', {
    schema: { tags: ['Document'], summary: 'Merge Word documents', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 20);
      if (files.length < 2) throw new ValidationError('At least 2 DOCX files are required');
      const result = await documentService.mergeDocx(
        files.map(f => ({ data: f.data, name: f.name })),
        { outputFilename: params.outputFilename }
      );
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/replace-text', {
    schema: { tags: ['Document'], summary: 'Find & replace text in DOCX', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.replaceTextDocx(files[0].data, files[0].name, {
        targetText: params.targetText,
        replacementText: params.replacementText,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/comments', {
    schema: { tags: ['Document'], summary: 'Extract DOCX comments', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.extractDocxComments(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/word-count', {
    schema: { tags: ['Document'], summary: 'DOCX word count & stats', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A DOCX file is required');
      const result = await documentService.wordCountDocx(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
