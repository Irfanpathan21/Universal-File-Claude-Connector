/**
 * PDF Routes
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { pdfService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerPdfRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  // ── Merge ─────────────────────────────────────────────────
  app.post('/merge', {
    schema: {
      tags: ['PDF'],
      summary: 'Merge multiple PDFs',
      description: 'Combine multiple PDF files into a single document',
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 50);
      if (files.length < 2) throw new ValidationError('At least 2 PDF files required');

      const result = await pdfService.mergePdf(
        files.map(f => ({ data: f.data, name: f.name })),
        { outputFilename: params.outputFilename }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Split ─────────────────────────────────────────────────
  app.post('/split', {
    schema: { tags: ['PDF'], summary: 'Split PDF', description: 'Split a PDF into multiple files by page ranges', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');

      const result = await pdfService.splitPdf(
        files[0].data,
        files[0].name,
        {
          ranges: params.ranges,
          splitEvery: params.splitEvery ? parseInt(params.splitEvery) : undefined,
        }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Compress ──────────────────────────────────────────────
  app.post('/compress', {
    schema: { tags: ['PDF'], summary: 'Compress PDF', description: 'Reduce PDF file size', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');

      const result = await pdfService.compressPdf(
        files[0].data,
        files[0].name,
        { quality: (params.quality as any) || 'medium' }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Rotate ────────────────────────────────────────────────
  app.post('/rotate', {
    schema: { tags: ['PDF'], summary: 'Rotate PDF pages', description: 'Rotate pages by 90°, 180°, or 270°', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');

      const angle = parseInt(params.angle || '90');
      const pages = params.pages ? params.pages.split(',').map(p => parseInt(p.trim())) : undefined;

      const result = await pdfService.rotatePdf(
        files[0].data,
        files[0].name,
        { angle: angle as 90 | 180 | 270, pages }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Extract Pages ─────────────────────────────────────────
  app.post('/extract-pages', {
    schema: { tags: ['PDF'], summary: 'Extract pages', description: 'Extract specific pages from a PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      if (!params.pages) throw new ValidationError('Page numbers are required');

      const pages = params.pages.split(',').map(p => parseInt(p.trim()));

      const result = await pdfService.extractPages(files[0].data, files[0].name, pages);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Delete Pages ──────────────────────────────────────────
  app.post('/delete-pages', {
    schema: { tags: ['PDF'], summary: 'Delete pages', description: 'Remove specific pages from a PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      if (!params.pages) throw new ValidationError('Page numbers to delete are required');

      const pages = params.pages.split(',').map(p => parseInt(p.trim()));

      const result = await pdfService.deletePages(files[0].data, files[0].name, pages);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Rearrange Pages ───────────────────────────────────────
  app.post('/rearrange', {
    schema: { tags: ['PDF'], summary: 'Rearrange pages', description: 'Reorder pages in a PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      if (!params.order) throw new ValidationError('New page order is required');

      const order = params.order.split(',').map(p => parseInt(p.trim()));

      const result = await pdfService.rearrangePages(files[0].data, files[0].name, order);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Extract Text ──────────────────────────────────────────
  app.post('/extract-text', {
    schema: { tags: ['PDF'], summary: 'Extract text', description: 'Extract all text content from a PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');

      const result = await pdfService.extractText(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Add Watermark ─────────────────────────────────────────
  app.post('/watermark', {
    schema: { tags: ['PDF'], summary: 'Add watermark', description: 'Add a text watermark to every page', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      if (!params.text) throw new ValidationError('Watermark text is required');

      const result = await pdfService.addWatermark(
        files[0].data,
        files[0].name,
        {
          text: params.text,
          fontSize: params.fontSize ? parseInt(params.fontSize) : undefined,
          opacity: params.opacity ? parseFloat(params.opacity) : undefined,
          rotation: params.rotation ? parseInt(params.rotation) : undefined,
          position: params.position as any,
        }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Add Page Numbers ──────────────────────────────────────
  app.post('/page-numbers', {
    schema: { tags: ['PDF'], summary: 'Add page numbers', description: 'Add page numbers to a PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');

      const result = await pdfService.addPageNumbers(
        files[0].data,
        files[0].name,
        {
          position: params.position as any,
          format: params.format as any,
          startNumber: params.startNumber ? parseInt(params.startNumber) : undefined,
          fontSize: params.fontSize ? parseInt(params.fontSize) : undefined,
        }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Password Protect ──────────────────────────────────────
  app.post('/protect', {
    schema: { tags: ['PDF'], summary: 'Password protect', description: 'Add password protection', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      if (!params.password) throw new ValidationError('Password is required');

      const result = await pdfService.passwordProtect(
        files[0].data,
        files[0].name,
        { userPassword: params.password }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Metadata ──────────────────────────────────────────────
  app.post('/metadata', {
    schema: { tags: ['PDF'], summary: 'PDF metadata', description: 'View or edit PDF metadata', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');

      // If any edit params provided, edit metadata; otherwise just read
      if (params.title || params.author || params.subject) {
        const result = await pdfService.editMetadata(
          files[0].data,
          files[0].name,
          { title: params.title, author: params.author, subject: params.subject }
        );
        await sendProcessingResult(reply, result, outputDir);
      } else {
        const result = await pdfService.getMetadata(files[0].data);
        await sendProcessingResult(reply, result, outputDir);
      }
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── Images to PDF ─────────────────────────────────────────
  app.post('/from-images', {
    schema: { tags: ['PDF'], summary: 'Images to PDF', description: 'Convert images into a PDF document', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 100);
      if (files.length < 1) throw new ValidationError('At least one image is required');

      const result = await pdfService.imagesToPdf(
        files.map(f => ({ data: f.data, name: f.name })),
        { pageSize: (params.pageSize as any) || 'A4' }
      );

      await sendProcessingResult(reply, result, outputDir);
    } catch (error) {
      handleRouteError(reply, error);
    }
  });

  // ── PDF to DOCX ───────────────────────────────────────────
  app.post('/to-docx', {
    schema: { tags: ['PDF'], summary: 'PDF to Word', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.pdfToDocx(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── PDF to HTML ───────────────────────────────────────────
  app.post('/to-html', {
    schema: { tags: ['PDF'], summary: 'PDF to HTML', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.pdfToHtml(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── PDF to JPG / Images ───────────────────────────────────
  app.post('/extract-images', {
    schema: { tags: ['PDF'], summary: 'PDF to JPG / Images', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.pdfToImages(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Duplicate Pages ───────────────────────────────────────
  app.post('/duplicate-pages', {
    schema: { tags: ['PDF'], summary: 'Duplicate PDF pages', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.duplicatePages(files[0].data, files[0].name, {
        pages: params.pages ? (params.pages as string).split(',').map(n => parseInt(n.trim())) : [1],
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Swap Pages ────────────────────────────────────────────
  app.post('/swap-pages', {
    schema: { tags: ['PDF'], summary: 'Swap PDF pages', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.swapPages(files[0].data, files[0].name, {
        pageA: parseInt(params.pageA as string || '1'),
        pageB: parseInt(params.pageB as string || '2'),
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Reverse Pages ─────────────────────────────────────────
  app.post('/reverse-pages', {
    schema: { tags: ['PDF'], summary: 'Reverse PDF page order', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.reversePages(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Edit Metadata ─────────────────────────────────────────
  app.post('/edit-metadata', {
    schema: { tags: ['PDF'], summary: 'Edit PDF metadata', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.editPdfMetadata(files[0].data, files[0].name, {
        title: params.title as string,
        author: params.author as string,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Flatten Form ──────────────────────────────────────────
  app.post('/flatten-form', {
    schema: { tags: ['PDF'], summary: 'Flatten PDF form', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.flattenPdfForm(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── PDF to TXT ────────────────────────────────────────────
  app.post('/to-txt', {
    schema: { tags: ['PDF'], summary: 'PDF to TXT', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.pdfToTxt(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── TXT to PDF ────────────────────────────────────────────
  app.post('/from-txt', {
    schema: { tags: ['PDF'], summary: 'TXT to PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A TXT file is required');
      const result = await pdfService.txtToPdf(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  // ── Validate PDF ──────────────────────────────────────────
  app.post('/validate', {
    schema: { tags: ['PDF'], summary: 'Validate PDF', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A PDF file is required');
      const result = await pdfService.validatePdf(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
