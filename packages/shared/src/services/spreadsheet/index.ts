/**
 * Spreadsheet Processing Service (XLSX / XLS / CSV / TSV / ODS)
 *
 * Provides Excel creation, sheet merging, XLSX ↔ CSV, XLSX ↔ JSON,
 * duplicate row removal, sorting, row filtering, and transposition.
 */

import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

// ─── Excel to CSV ─────────────────────────────────────────────

export async function excelToCsv(
  data: Buffer | Uint8Array,
  filename: string,
  options: { sheetName?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const worksheet = options.sheetName
      ? workbook.getWorksheet(options.sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new ValidationError(`Worksheet "${options.sheetName || '1'}" not found`);
    }

    processing?.onProgress?.(60, 'Extracting rows...');
    const rows: string[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowValues = (row.values as any[]).slice(1).map(val => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          if (val.result !== undefined) return String(val.result);
          if (val.text !== undefined) return String(val.text);
        }
        return String(val);
      });
      rows.push(rowValues);
    });

    const csv = Papa.unparse(rows);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_${worksheet.name}.csv`,
        data: Buffer.from(csv, 'utf-8'),
        mimeType: 'text/csv',
        extension: '.csv',
        size: Buffer.byteLength(csv, 'utf-8'),
      }],
      metadata: {
        sheetName: worksheet.name,
        rowCount: rows.length,
        colCount: rows[0]?.length || 0,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert Excel to CSV: ${(error as Error).message}`);
  }
}

// ─── CSV to Excel ─────────────────────────────────────────────

export async function csvToExcel(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing CSV data...');
    const csvStr = Buffer.from(data).toString('utf-8');
    const parsed = Papa.parse(csvStr, { skipEmptyLines: true });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new ValidationError(`CSV parse error: ${parsed.errors[0].message}`);
    }

    processing?.onProgress?.(60, 'Building Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    const sheetName = getBaseName(filename).substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName);

    const rows = parsed.data as string[][];
    for (const row of rows) {
      worksheet.addRow(row);
    }

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = Math.min(len, 50);
      });
      col.width = maxLen + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.xlsx`,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      }],
      metadata: {
        rowCount: rows.length,
        colCount: rows[0]?.length || 0,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert CSV to Excel: ${(error as Error).message}`);
  }
}

// ─── JSON to Excel ────────────────────────────────────────────

export async function jsonToExcel(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing JSON data...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new ValidationError('JSON must contain an array of objects');
    }

    processing?.onProgress?.(60, 'Building Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    if (parsed.length > 0) {
      const keys = Object.keys(parsed[0]);
      worksheet.columns = keys.map(k => ({ header: k, key: k, width: Math.max(k.length + 4, 12) }));

      for (const item of parsed) {
        worksheet.addRow(item);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.xlsx`,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      }],
      metadata: {
        rowCount: parsed.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert JSON to Excel: ${(error as Error).message}`);
  }
}

// ─── Excel to JSON ────────────────────────────────────────────

export async function excelToJson(
  data: Buffer | Uint8Array,
  filename: string,
  options: { sheetName?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const worksheet = options.sheetName
      ? workbook.getWorksheet(options.sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new ValidationError(`Worksheet "${options.sheetName || '1'}" not found`);
    }

    const rows: Record<string, unknown>[] = [];
    let headers: string[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values = (row.values as any[]).slice(1).map(val => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          if (val.result !== undefined) return val.result;
          if (val.text !== undefined) return val.text;
        }
        return val;
      });

      if (rowNumber === 1) {
        headers = values.map(v => String(v));
      } else {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          obj[h || `col_${i + 1}`] = values[i] !== undefined ? values[i] : null;
        });
        rows.push(obj);
      }
    });

    const jsonStr = JSON.stringify(rows, null, 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: {
        rowCount: rows.length,
        columns: headers,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert Excel to JSON: ${(error as Error).message}`);
  }
}

// ─── Merge Worksheets / Workbooks ─────────────────────────────

export async function mergeExcelSheets(
  files: { data: Buffer | Uint8Array; name: string }[],
  options: { outputFilename?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (files.length < 2) throw new ValidationError('At least 2 Excel/CSV files required for merging');

  try {
    const mergedWorkbook = new ExcelJS.Workbook();

    for (let i = 0; i < files.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / files.length) * 90),
        `Merging sheet ${i + 1} of ${files.length}`
      );

      const file = files[i];
      const sourceWorkbook = new ExcelJS.Workbook();
      await sourceWorkbook.xlsx.load(file.data as any);

      sourceWorkbook.worksheets.forEach((sheet) => {
        let name = `${sheet.name}_${i + 1}`;
        if (name.length > 31) name = name.substring(0, 31);
        const newSheet = mergedWorkbook.addWorksheet(name);

        sheet.eachRow({ includeEmpty: true }, (row) => {
          const rowVals = (row.values as any[]).slice(1);
          newSheet.addRow(rowVals);
        });
      });
    }

    const buffer = await mergedWorkbook.xlsx.writeBuffer();
    const outputName = options.outputFilename || 'merged_workbook.xlsx';

    return {
      success: true,
      outputFiles: [{
        name: outputName,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      }],
      metadata: {
        totalWorksheets: mergedWorkbook.worksheets.length,
        filesMerged: files.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to merge Excel sheets: ${(error as Error).message}`);
  }
}

// ─── Remove CSV Duplicates ────────────────────────────────────

export async function removeCsvDuplicates(
  data: Buffer | Uint8Array,
  filename: string,
  options: { columnHeader?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading CSV data...');
    const csvStr = Buffer.from(data).toString('utf-8');
    const parsed = Papa.parse(csvStr, { skipEmptyLines: true });
    const rows = parsed.data as string[][];

    if (rows.length < 2) throw new ValidationError('CSV has insufficient rows');

    const header = rows[0];
    const dataRows = rows.slice(1);
    const originalCount = dataRows.length;

    let colIndex = -1;
    if (options.columnHeader) {
      colIndex = header.indexOf(options.columnHeader);
    }

    const seen = new Set<string>();
    const uniqueRows: string[][] = [];

    for (const row of dataRows) {
      const key = colIndex >= 0 ? row[colIndex] || '' : row.join('|||');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(row);
      }
    }

    const resultCsv = Papa.unparse([header, ...uniqueRows]);
    const removedCount = originalCount - uniqueRows.length;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_deduped.csv`,
        data: Buffer.from(resultCsv, 'utf-8'),
        mimeType: 'text/csv',
        extension: '.csv',
        size: Buffer.byteLength(resultCsv, 'utf-8'),
      }],
      metadata: {
        originalRows: originalCount,
        uniqueRows: uniqueRows.length,
        duplicatesRemoved: removedCount,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to remove duplicates: ${(error as Error).message}`);
  }
}

// ─── Transpose Sheet ──────────────────────────────────────────

export async function transposeSheet(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing input data...');
    const csvStr = Buffer.from(data).toString('utf-8');
    const parsed = Papa.parse(csvStr, { skipEmptyLines: true });
    const rows = parsed.data as string[][];

    if (rows.length === 0) throw new ValidationError('Input spreadsheet is empty');

    const numRows = rows.length;
    const numCols = Math.max(...rows.map(r => r.length));

    const transposed: string[][] = [];
    for (let c = 0; c < numCols; c++) {
      const newRow: string[] = [];
      for (let r = 0; r < numRows; r++) {
        newRow.push(rows[r][c] !== undefined ? rows[r][c] : '');
      }
      transposed.push(newRow);
    }

    const resultCsv = Papa.unparse(transposed);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_transposed.csv`,
        data: Buffer.from(resultCsv, 'utf-8'),
        mimeType: 'text/csv',
        extension: '.csv',
        size: Buffer.byteLength(resultCsv, 'utf-8'),
      }],
      metadata: {
        originalDimensions: `${numRows}x${numCols}`,
        transposedDimensions: `${numCols}x${numRows}`,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to transpose sheet: ${(error as Error).message}`);
  }
}

// ─── Excel to HTML ────────────────────────────────────────────

export async function excelToHtml(
  data: Buffer | Uint8Array,
  filename: string,
  options: { sheetName?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const worksheet = options.sheetName
      ? workbook.getWorksheet(options.sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new ValidationError(`Worksheet "${options.sheetName || '1'}" not found`);
    }

    let tableRows = '';
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const vals = (row.values as any[]).slice(1).map(v => v === null || v === undefined ? '' : String(v));
      const tag = rowNumber === 1 ? 'th' : 'td';
      const cells = vals.map(v => `<${tag}>${v}</${tag}>`).join('');
      tableRows += `<tr>${cells}</tr>\n`;
    });

    const title = `${getBaseName(filename)} - ${worksheet.name}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 2rem; background: #fafafa; color: #111; }
    h2 { font-size: 1.25rem; margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <table>
${tableRows}
  </table>
</body>
</html>`;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.html`,
        data: Buffer.from(html, 'utf-8'),
        mimeType: 'text/html',
        extension: '.html',
        size: Buffer.byteLength(html, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert Excel to HTML: ${(error as Error).message}`);
  }
}

// ─── Protect Workbook ─────────────────────────────────────────

export async function protectWorkbook(
  data: Buffer | Uint8Array,
  filename: string,
  options: { password?: string },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Protecting Excel workbook sheets...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const pass = options.password || 'protected';
    for (const sheet of workbook.worksheets) {
      await sheet.protect(pass, {
        selectLockedCells: true,
        selectUnlockedCells: true,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_protected.xlsx`,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to protect workbook: ${(error as Error).message}`);
  }
}

// ─── Split Excel Workbook ──────────────────────────────────────

export async function splitExcelWorkbook(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Splitting Excel workbook sheets...');
    const source = new ExcelJS.Workbook();
    await source.xlsx.load(data as any);

    const outputFiles: OutputFile[] = [];

    for (let i = 0; i < source.worksheets.length; i++) {
      const srcSheet = source.worksheets[i];
      const target = new ExcelJS.Workbook();
      const targetSheet = target.addWorksheet(srcSheet.name);

      srcSheet.eachRow({ includeEmpty: false }, (row) => {
        targetSheet.addRow((row.values as any[]).slice(1));
      });

      const buffer = await target.xlsx.writeBuffer();
      const sheetFileName = `${getBaseName(filename)}_${srcSheet.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;

      outputFiles.push({
        name: sheetFileName,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      });
    }

    return {
      success: true,
      outputFiles,
      metadata: { totalSheets: outputFiles.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to split Excel workbook: ${(error as Error).message}`);
  }
}

// ─── Find & Replace in Excel ──────────────────────────────────

export async function findReplaceExcel(
  data: Buffer | Uint8Array,
  filename: string,
  options: { targetValue: string; replacementValue: string },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  if (!options.targetValue) throw new ValidationError('targetValue parameter is required');

  try {
    processing?.onProgress?.(30, 'Searching and replacing values in Excel...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    let replacementCount = 0;
    const target = options.targetValue;
    const replacement = options.replacementValue || '';

    for (const sheet of workbook.worksheets) {
      sheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          if (cell.value !== null && cell.value !== undefined) {
            const cellStr = String(cell.value);
            if (cellStr.includes(target)) {
              cell.value = cellStr.replaceAll(target, replacement);
              replacementCount++;
            }
          }
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_replaced.xlsx`,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      }],
      metadata: { replacementCount },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to find and replace in Excel: ${(error as Error).message}`);
  }
}

// ─── Workbook Statistics ──────────────────────────────────────

export async function workbookStatistics(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Analyzing workbook structure and statistics...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const sheetStats: { name: string; rowCount: number; columnCount: number }[] = [];
    let totalRows = 0;

    for (const sheet of workbook.worksheets) {
      const rowCount = sheet.rowCount;
      const columnCount = sheet.columnCount;
      totalRows += rowCount;
      sheetStats.push({ name: sheet.name, rowCount, columnCount });
    }

    const stats = {
      filename,
      totalSheets: workbook.worksheets.length,
      totalRows,
      sheets: sheetStats,
    };

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_stats.json`,
        data: Buffer.from(JSON.stringify(stats, null, 2), 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(JSON.stringify(stats), 'utf-8'),
      }],
      metadata: stats,
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to calculate workbook statistics: ${(error as Error).message}`);
  }
}
