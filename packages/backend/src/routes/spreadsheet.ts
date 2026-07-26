/**
 * Spreadsheet Routes (XLSX / XLS / CSV / TSV)
 */

import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { spreadsheetService, ValidationError } from '@uft/shared';
import { extractFilesAndParams, sendProcessingResult, handleRouteError } from './helpers.js';

export const registerSpreadsheetRoutes: FastifyPluginCallback = (app: FastifyInstance, _opts, done) => {
  const outputDir: string = (app as any).outputDir;
  const uploadDir: string = (app as any).uploadDir;

  app.post('/excel-to-csv', {
    schema: { tags: ['Spreadsheet'], summary: 'Excel to CSV', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.excelToCsv(files[0].data, files[0].name, {
        sheetName: params.sheetName,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/csv-to-excel', {
    schema: { tags: ['Spreadsheet'], summary: 'CSV to Excel', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A CSV file is required');
      const result = await spreadsheetService.csvToExcel(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/json-to-excel', {
    schema: { tags: ['Spreadsheet'], summary: 'JSON to Excel', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A JSON file is required');
      const result = await spreadsheetService.jsonToExcel(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/excel-to-json', {
    schema: { tags: ['Spreadsheet'], summary: 'Excel to JSON', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.excelToJson(files[0].data, files[0].name, {
        sheetName: params.sheetName,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/merge-sheets', {
    schema: { tags: ['Spreadsheet'], summary: 'Merge Excel Workbooks', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 20);
      if (files.length < 2) throw new ValidationError('At least 2 Excel files are required');
      const result = await spreadsheetService.mergeExcelSheets(
        files.map(f => ({ data: f.data, name: f.name })),
        { outputFilename: params.outputFilename }
      );
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/remove-duplicates', {
    schema: { tags: ['Spreadsheet'], summary: 'Remove CSV Duplicates', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A CSV file is required');
      const result = await spreadsheetService.removeCsvDuplicates(files[0].data, files[0].name, {
        columnHeader: params.columnHeader,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/transpose', {
    schema: { tags: ['Spreadsheet'], summary: 'Transpose Sheet', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('A CSV file is required');
      const result = await spreadsheetService.transposeSheet(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/to-html', {
    schema: { tags: ['Spreadsheet'], summary: 'Excel to HTML Table', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.excelToHtml(files[0].data, files[0].name, { sheetName: params.sheetName });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/protect', {
    schema: { tags: ['Spreadsheet'], summary: 'Protect Excel workbook', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.protectWorkbook(files[0].data, files[0].name, { password: params.password });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/split', {
    schema: { tags: ['Spreadsheet'], summary: 'Split Excel workbook sheets', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.splitExcelWorkbook(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/replace-cells', {
    schema: { tags: ['Spreadsheet'], summary: 'Find & replace Excel cells', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files, params } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.findReplaceExcel(files[0].data, files[0].name, {
        targetValue: params.targetValue,
        replacementValue: params.replacementValue,
      });
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  app.post('/stats', {
    schema: { tags: ['Spreadsheet'], summary: 'Workbook statistics', consumes: ['multipart/form-data'] },
  }, async (request, reply) => {
    try {
      const { files } = await extractFilesAndParams(request, uploadDir, 1);
      if (files.length < 1) throw new ValidationError('An Excel file is required');
      const result = await spreadsheetService.workbookStatistics(files[0].data, files[0].name);
      await sendProcessingResult(reply, result, outputDir);
    } catch (error) { handleRouteError(reply, error); }
  });

  done();
};
