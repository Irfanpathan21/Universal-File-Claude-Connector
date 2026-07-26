/**
 * Data Conversion Routes
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { dataService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerDataRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/json-to-csv', {
    schema: { tags: ['Data'], summary: 'JSON to CSV', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await dataService.jsonToCsv(files[0].data, files[0].name, { delimiter: params.delimiter });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/csv-to-json', {
    schema: { tags: ['Data'], summary: 'CSV to JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A CSV file is required');
      const result = await dataService.csvToJson(files[0].data, files[0].name, {
        header: params.header !== 'false',
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/json-to-xml', {
    schema: { tags: ['Data'], summary: 'JSON to XML', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await dataService.jsonToXml(files[0].data, files[0].name, { rootName: params.rootName });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/xml-to-json', {
    schema: { tags: ['Data'], summary: 'XML to JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An XML file is required');
      const result = await dataService.xmlToJson(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/json-to-yaml', {
    schema: { tags: ['Data'], summary: 'JSON to YAML', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await dataService.jsonToYaml(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/yaml-to-json', {
    schema: { tags: ['Data'], summary: 'YAML to JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A YAML file is required');
      const result = await dataService.yamlToJson(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/validate-json', {
    schema: { tags: ['Data'], summary: 'Validate JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await dataService.validateJson(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/format-json', {
    schema: { tags: ['Data'], summary: 'Format JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await dataService.formatJson(files[0].data, files[0].name, {
        indent: params.indent ? parseInt(params.indent) : undefined,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/minify-json', {
    schema: { tags: ['Data'], summary: 'Minify JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await dataService.minifyJson(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/format-xml', {
    schema: { tags: ['Data'], summary: 'Format XML', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An XML file is required');
      const result = await dataService.formatXml(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/markdown-to-html', {
    schema: { tags: ['Data'], summary: 'Markdown to HTML', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A Markdown file is required');
      const result = await dataService.markdownToHtml(files[0].data, files[0].name, {
        wrapInHtml: params.wrapInHtml !== 'false',
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/html-to-markdown', {
    schema: { tags: ['Data'], summary: 'HTML to Markdown', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An HTML file is required');
      const result = await dataService.htmlToMarkdown(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
