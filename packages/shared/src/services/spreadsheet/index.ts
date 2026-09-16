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
import { getBaseName, generateId, normalizeJsonToTabularRows } from '../../utils/index.js';
import { createZip } from '../archive/index.js';
import { Readable } from 'stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

// ─── Helpers ──────────────────────────────────────────────────

function extractSheetRows(worksheet: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const rowValues = (row.values as any[]).slice(1).map(val => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        if (val.result !== undefined && val.result !== null) return String(val.result);
        if (val.text !== undefined && val.text !== null) return String(val.text);
        if (val instanceof Date) return val.toISOString();
        if (val.richText) return val.richText.map((t: any) => t.text).join('');
      }
      return String(val);
    });
    rows.push(rowValues);
  });
  return rows;
}

// ─── Excel to CSV ─────────────────────────────────────────────

export interface ExcelToCsvOptions {
  sheetName?: string;
  delimiter?: string;
}

export async function excelToCsv(
  data: Buffer | Uint8Array,
  filename: string,
  options: ExcelToCsvOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(20, 'Reading Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const baseName = getBaseName(filename);
    const delimiter = options.delimiter || ',';
    const requestedSheet = options.sheetName?.trim();

    // 1. Single sheet specifically requested (by name or 1-based index)
    if (requestedSheet && requestedSheet !== 'all') {
      const worksheet =
        workbook.getWorksheet(requestedSheet) ||
        workbook.worksheets.find(w => w.name.toLowerCase() === requestedSheet.toLowerCase()) ||
        (!isNaN(Number(requestedSheet)) ? workbook.worksheets[Number(requestedSheet) - 1] : undefined);

      if (!worksheet) {
        const available = workbook.worksheets.map(w => `"${w.name}"`).join(', ');
        throw new ValidationError(`Worksheet "${requestedSheet}" not found. Available sheets: ${available}`);
      }

      processing?.onProgress?.(60, `Extracting rows from sheet "${worksheet.name}"...`);
      const rows = extractSheetRows(worksheet);
      const csv = Papa.unparse(rows, { delimiter });
      const safeSheetName = worksheet.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'sheet';

      return {
        success: true,
        outputFiles: [{
          name: `${baseName}_${safeSheetName}.csv`,
          data: Buffer.from(csv, 'utf-8'),
          mimeType: 'text/csv',
          extension: '.csv',
          size: Buffer.byteLength(csv, 'utf-8'),
        }],
        metadata: {
          sheetName: worksheet.name,
          sheetCount: 1,
          rowCount: rows.length,
          colCount: rows[0]?.length || 0,
        },
        duration: Date.now() - start,
      };
    }

    // 2. All sheets or default export
    const worksheets = workbook.worksheets.filter(w => w.state !== 'veryHidden');
    if (!worksheets.length) {
      throw new ValidationError('Excel workbook contains no sheets');
    }

    // If only 1 sheet in workbook, return single CSV directly
    if (worksheets.length === 1) {
      const ws = worksheets[0];
      processing?.onProgress?.(60, `Extracting rows from "${ws.name}"...`);
      const rows = extractSheetRows(ws);
      const csv = Papa.unparse(rows, { delimiter });
      const safeSheetName = ws.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'sheet';

      return {
        success: true,
        outputFiles: [{
          name: `${baseName}_${safeSheetName}.csv`,
          data: Buffer.from(csv, 'utf-8'),
          mimeType: 'text/csv',
          extension: '.csv',
          size: Buffer.byteLength(csv, 'utf-8'),
        }],
        metadata: {
          sheetName: ws.name,
          sheetCount: 1,
          rowCount: rows.length,
          colCount: rows[0]?.length || 0,
        },
        duration: Date.now() - start,
      };
    }

    // Multiple sheets (e.g. 2, 3, or more sheets) -> Separate each sheet into its own CSV and bundle into ZIP!
    const csvFiles: OutputFile[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < worksheets.length; i++) {
      const ws = worksheets[i];
      processing?.onProgress?.(
        Math.round(25 + ((i + 1) / worksheets.length) * 55),
        `Converting sheet ${i + 1} of ${worksheets.length}: "${ws.name}" to CSV...`
      );

      const rows = extractSheetRows(ws);
      const csvStr = Papa.unparse(rows, { delimiter });
      let safeName = ws.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || `Sheet${i + 1}`;
      if (usedNames.has(safeName.toLowerCase())) {
        safeName = `${safeName}_${i + 1}`;
      }
      usedNames.add(safeName.toLowerCase());

      const fileName = `${baseName}_${safeName}.csv`;
      const fileData = Buffer.from(csvStr, 'utf-8');

      csvFiles.push({
        name: fileName,
        data: fileData,
        mimeType: 'text/csv',
        extension: '.csv',
        size: fileData.length,
      });
    }

    processing?.onProgress?.(85, `Packaging ${csvFiles.length} separated sheets into ZIP archive...`);
    const zipFilename = `${baseName}_sheets_csv.zip`;
    const zipResult = await createZip(
      csvFiles.map(f => ({ data: f.data, name: f.name })),
      { outputFilename: zipFilename }
    );

    return {
      success: true,
      outputFiles: zipResult.outputFiles,
      metadata: {
        isZip: true,
        sheetCount: worksheets.length,
        sheetNames: worksheets.map(w => w.name),
        containedFiles: csvFiles.map(f => ({
          name: f.name,
          size: f.size,
          mimeType: 'text/csv',
        })),
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
    processing?.onProgress?.(25, 'Parsing and validating JSON data...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    if (!jsonStr.trim()) throw new ValidationError('JSON data is empty');

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr: any) {
      throw new ValidationError(`Invalid JSON format: ${parseErr.message}`);
    }

    processing?.onProgress?.(50, 'Normalizing data records and flattening structures...');
    const { rows, columns } = normalizeJsonToTabularRows(parsed);

    if (rows.length === 0) {
      throw new ValidationError('No convertible data rows found in JSON');
    }

    processing?.onProgress?.(75, 'Building Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    worksheet.columns = columns.map(k => ({
      header: k,
      key: k,
      width: Math.max(k.length + 4, 14),
    }));

    for (const item of rows) {
      worksheet.addRow(item);
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
        rowCount: rows.length,
        columnCount: columns.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert JSON to Excel: ${(error as Error).message}`);
  }
}

// ─── Helpers for Excel to JSON ────────────────────────────────

function getCleanCellValue(cell: ExcelJS.Cell): unknown {
  const val = cell.value;
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    if ('result' in val && (val as any).result !== undefined) {
      const res = (val as any).result;
      if (res instanceof Date) return res.toISOString();
      return res;
    }
    if ('text' in val && typeof (val as any).text === 'string') return (val as any).text;
    if ('richText' in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((t: any) => t.text).join('');
    }
    if ('hyperlink' in val && (val as any).text) return (val as any).text;
  }
  return val;
}

function extractWorksheetJson(worksheet: ExcelJS.Worksheet): { rows: Record<string, unknown>[]; headers: string[] } {
  const rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    // Determine cell count taking sparse rows into account
    const maxCol = Math.max(row.cellCount, headers.length, worksheet.columnCount || 0);
    const rowValues: unknown[] = [];
    for (let c = 1; c <= maxCol; c++) {
      rowValues.push(getCleanCellValue(row.getCell(c)));
    }

    if (headers.length === 0) {
      // Find first non-empty row to use as headers
      const nonNullValues = rowValues.filter(v => v !== null && v !== '');
      if (nonNullValues.length > 0) {
        headers = rowValues.map((v, i) => (v !== null && v !== '' ? String(v).trim() : `Column_${i + 1}`));
        // Trim trailing empty headers
        while (headers.length > 0 && headers[headers.length - 1].startsWith('Column_') && rowValues[headers.length - 1] === null) {
          headers.pop();
        }
      }
    } else {
      const obj: Record<string, unknown> = {};
      let hasData = false;
      headers.forEach((h, i) => {
        const cellVal = rowValues[i] !== undefined ? rowValues[i] : null;
        if (cellVal !== null && cellVal !== '') hasData = true;
        obj[h] = cellVal;
      });
      if (hasData) {
        rows.push(obj);
      }
    }
  });

  return { rows, headers };
}

// ─── Excel to JSON ────────────────────────────────────────────

export interface ExcelToJsonOptions {
  sheetName?: string;
}

export async function excelToJson(
  data: Buffer | Uint8Array,
  filename: string,
  options: ExcelToJsonOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(20, 'Reading Excel workbook...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data as any);

    const baseName = getBaseName(filename);
    const requestedSheet = options.sheetName?.trim();

    // 1. Single sheet specifically requested (by name or 1-based index)
    if (requestedSheet && requestedSheet !== 'all') {
      const worksheet =
        workbook.getWorksheet(requestedSheet) ||
        workbook.worksheets.find(w => w.name.toLowerCase() === requestedSheet.toLowerCase()) ||
        (!isNaN(Number(requestedSheet)) ? workbook.worksheets[Number(requestedSheet) - 1] : undefined);

      if (!worksheet) {
        const available = workbook.worksheets.map(w => `"${w.name}"`).join(', ');
        throw new ValidationError(`Worksheet "${requestedSheet}" not found. Available sheets: ${available}`);
      }

      processing?.onProgress?.(60, `Extracting rows from sheet "${worksheet.name}"...`);
      const { rows, headers } = extractWorksheetJson(worksheet);
      const jsonStr = JSON.stringify(rows, null, 2);
      const safeSheetName = worksheet.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'sheet';

      return {
        success: true,
        outputFiles: [{
          name: `${baseName}_${safeSheetName}.json`,
          data: Buffer.from(jsonStr, 'utf-8'),
          mimeType: 'application/json',
          extension: '.json',
          size: Buffer.byteLength(jsonStr, 'utf-8'),
        }],
        metadata: {
          sheetName: worksheet.name,
          sheetCount: 1,
          rowCount: rows.length,
          columns: headers,
        },
        duration: Date.now() - start,
      };
    }

    // 2. All visible sheets
    const worksheets = workbook.worksheets.filter(w => w.state !== 'veryHidden');
    if (!worksheets.length) {
      throw new ValidationError('Excel workbook contains no visible sheets');
    }

    // If only 1 sheet in workbook -> return single JSON directly
    if (worksheets.length === 1) {
      const ws = worksheets[0];
      processing?.onProgress?.(60, `Converting sheet "${ws.name}" to JSON...`);
      const { rows, headers } = extractWorksheetJson(ws);
      const jsonStr = JSON.stringify(rows, null, 2);

      return {
        success: true,
        outputFiles: [{
          name: `${baseName}.json`,
          data: Buffer.from(jsonStr, 'utf-8'),
          mimeType: 'application/json',
          extension: '.json',
          size: Buffer.byteLength(jsonStr, 'utf-8'),
        }],
        metadata: {
          sheetName: ws.name,
          sheetCount: 1,
          rowCount: rows.length,
          columns: headers,
        },
        duration: Date.now() - start,
      };
    }

    // Multiple sheets (e.g. 2, 3, or more sheets) -> Separate each sheet into its own JSON file and bundle into ZIP archive!
    const jsonFiles: OutputFile[] = [];
    const usedNames = new Set<string>();
    const allSheetsCombined: Record<string, Record<string, unknown>[]> = {};
    const sheetSummaries: { name: string; rowCount: number; columns: string[] }[] = [];

    for (let i = 0; i < worksheets.length; i++) {
      const ws = worksheets[i];
      processing?.onProgress?.(
        Math.round(25 + ((i + 1) / worksheets.length) * 55),
        `Converting sheet ${i + 1} of ${worksheets.length}: "${ws.name}" to JSON...`
      );

      const { rows, headers } = extractWorksheetJson(ws);
      const jsonStr = JSON.stringify(rows, null, 2);

      let safeName = ws.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || `Sheet${i + 1}`;
      if (usedNames.has(safeName.toLowerCase())) {
        safeName = `${safeName}_${i + 1}`;
      }
      usedNames.add(safeName.toLowerCase());

      const fileName = `${baseName}_${safeName}.json`;
      const fileData = Buffer.from(jsonStr, 'utf-8');

      jsonFiles.push({
        name: fileName,
        data: fileData,
        mimeType: 'application/json',
        extension: '.json',
        size: fileData.length,
      });

      allSheetsCombined[ws.name] = rows;
      sheetSummaries.push({
        name: ws.name,
        rowCount: rows.length,
        columns: headers,
      });
    }

    // Also include a combined all-sheets JSON file inside the archive
    const combinedJsonStr = JSON.stringify(allSheetsCombined, null, 2);
    const combinedFileData = Buffer.from(combinedJsonStr, 'utf-8');
    jsonFiles.push({
      name: `${baseName}_all_sheets.json`,
      data: combinedFileData,
      mimeType: 'application/json',
      extension: '.json',
      size: combinedFileData.length,
    });

    processing?.onProgress?.(85, `Packaging ${jsonFiles.length} separated JSON files into ZIP archive...`);
    const zipFilename = `${baseName}_sheets_json.zip`;
    const zipResult = await createZip(
      jsonFiles.map(f => ({ data: f.data, name: f.name })),
      { outputFilename: zipFilename }
    );

    return {
      success: true,
      outputFiles: zipResult.outputFiles,
      metadata: {
        isZip: true,
        sheetCount: worksheets.length,
        sheets: sheetSummaries,
        containedFiles: jsonFiles.map(f => ({
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert Excel to JSON: ${(error as Error).message}`);
  }
}

// ─── Merge Worksheets / Workbooks ─────────────────────────────

export interface MergeExcelSheetsOptions {
  outputFilename?: string;
  mergeMode?: 'preserve_sheets' | 'combine_sheet';
}

function sanitizeExcelSheetName(name: string, fallback: string = 'Sheet'): string {
  let cleaned = (name || fallback).replace(/[:\/\\?*\[\]]/g, '_').trim();
  if (!cleaned) cleaned = fallback;
  if (cleaned.length > 31) cleaned = cleaned.substring(0, 31);
  return cleaned;
}

function generateUniqueSheetName(baseName: string, sourceFileName: string, existingNames: Set<string>): string {
  const cleanName = sanitizeExcelSheetName(baseName);
  if (!existingNames.has(cleanName.toLowerCase())) {
    existingNames.add(cleanName.toLowerCase());
    return cleanName;
  }

  // Disambiguate with file name first
  const fileBase = getBaseName(sourceFileName).replace(/[:\/\\?*\[\]]/g, '_').trim();
  if (fileBase) {
    const candidateWithFile = sanitizeExcelSheetName(`${cleanName} (${fileBase})`);
    if (!existingNames.has(candidateWithFile.toLowerCase())) {
      existingNames.add(candidateWithFile.toLowerCase());
      return candidateWithFile;
    }
  }

  // Fallback to numeric suffix
  let counter = 2;
  while (true) {
    const suffix = ` (${counter})`;
    const maxBaseLen = 31 - suffix.length;
    const truncatedBase = cleanName.length > maxBaseLen ? cleanName.substring(0, maxBaseLen).trim() : cleanName;
    const candidate = `${truncatedBase}${suffix}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      existingNames.add(candidate.toLowerCase());
      return candidate;
    }
    counter++;
  }
}

function copyExcelCellProperties(srcCell: ExcelJS.Cell, tgtCell: ExcelJS.Cell): void {
  // 1. Cell Value (support primitives, Date, formulas, richText, hyperlinks, errors)
  if (srcCell.value !== null && srcCell.value !== undefined) {
    if (srcCell.value instanceof Date) {
      tgtCell.value = new Date(srcCell.value.getTime());
    } else if (typeof srcCell.value === 'object') {
      try {
        tgtCell.value = JSON.parse(JSON.stringify(srcCell.value));
      } catch {
        tgtCell.value = srcCell.value;
      }
    } else {
      tgtCell.value = srcCell.value;
    }
  }

  // 2. Cell Font
  if (srcCell.font) {
    tgtCell.font = { ...srcCell.font };
    if (srcCell.font.color) {
      tgtCell.font.color = { ...srcCell.font.color };
    }
  }

  // 3. Cell Fill
  if (srcCell.fill) {
    try {
      tgtCell.fill = JSON.parse(JSON.stringify(srcCell.fill));
    } catch {
      tgtCell.fill = { ...(srcCell.fill as any) };
    }
  }

  // 4. Cell Border
  if (srcCell.border) {
    try {
      tgtCell.border = JSON.parse(JSON.stringify(srcCell.border));
    } catch {
      tgtCell.border = { ...(srcCell.border as any) };
    }
  }

  // 5. Cell Alignment
  if (srcCell.alignment) {
    tgtCell.alignment = { ...srcCell.alignment };
  }

  // 6. Number Format
  if (srcCell.numFmt) {
    tgtCell.numFmt = srcCell.numFmt;
  }

  // 7. Cell Protection
  if (srcCell.protection) {
    try {
      tgtCell.protection = JSON.parse(JSON.stringify(srcCell.protection));
    } catch {
      tgtCell.protection = { ...srcCell.protection };
    }
  }

  // 8. Cell Note / Comment
  if (srcCell.note) {
    try {
      tgtCell.note = JSON.parse(JSON.stringify(srcCell.note));
    } catch {
      tgtCell.note = srcCell.note;
    }
  }
}

function copyWorksheetStructure(sourceWs: ExcelJS.Worksheet, targetWs: ExcelJS.Worksheet): void {
  // 1. Column properties (widths, hidden, styles)
  const maxCols = Math.max(sourceWs.columnCount || 0, sourceWs.columns ? sourceWs.columns.length : 0);
  for (let c = 1; c <= maxCols; c++) {
    const srcCol = sourceWs.getColumn(c);
    const tgtCol = targetWs.getColumn(c);
    if (srcCol.width !== undefined) tgtCol.width = srcCol.width;
    if (srcCol.hidden !== undefined) tgtCol.hidden = srcCol.hidden;
    if (srcCol.outlineLevel !== undefined) tgtCol.outlineLevel = srcCol.outlineLevel;
    if (srcCol.style) {
      try { tgtCol.style = JSON.parse(JSON.stringify(srcCol.style)); } catch {}
    }
  }

  // 2. Views (freeze panes, gridlines)
  if (sourceWs.views && sourceWs.views.length > 0) {
    try {
      targetWs.views = JSON.parse(JSON.stringify(sourceWs.views));
    } catch {}
  }

  // 3. Properties (tabColor, defaultRowHeight, etc.)
  if (sourceWs.properties) {
    try {
      targetWs.properties = JSON.parse(JSON.stringify(sourceWs.properties));
    } catch {}
  }

  // 4. Page Setup
  if (sourceWs.pageSetup) {
    try {
      targetWs.pageSetup = JSON.parse(JSON.stringify(sourceWs.pageSetup));
    } catch {}
  }

  // 5. AutoFilter
  if (sourceWs.autoFilter) {
    try {
      targetWs.autoFilter = sourceWs.autoFilter;
    } catch {}
  }

  // 6. Copy rows and cells with exact coordinates and full styles
  sourceWs.eachRow({ includeEmpty: true }, (srcRow, rowNumber) => {
    const tgtRow = targetWs.getRow(rowNumber);
    if (srcRow.height !== undefined) tgtRow.height = srcRow.height;
    if (srcRow.hidden !== undefined) tgtRow.hidden = srcRow.hidden;
    if (srcRow.outlineLevel !== undefined) tgtRow.outlineLevel = srcRow.outlineLevel;

    srcRow.eachCell({ includeEmpty: true }, (srcCell, colNumber) => {
      const tgtCell = tgtRow.getCell(colNumber);
      copyExcelCellProperties(srcCell, tgtCell);
    });
  });

  // 7. Merged cells
  const merges: string[] = (sourceWs.model && (sourceWs.model as any).merges) || [];
  for (const mergeRange of merges) {
    try {
      targetWs.mergeCells(mergeRange);
    } catch {}
  }

  // 8. Data Validations
  if ((sourceWs as any).dataValidations?.model) {
    try {
      const dvModel = (sourceWs as any).dataValidations.model;
      for (const address of Object.keys(dvModel)) {
        (targetWs as any).dataValidations?.add?.(address, dvModel[address]);
      }
    } catch {}
  }
}

function combineSheetsIntoSingle(
  sourceSheets: { sheet: ExcelJS.Worksheet; fileName: string }[],
  targetWs: ExcelJS.Worksheet
): void {
  let currentRowIndex = 1;
  let masterHeaders: string[] = [];

  for (let s = 0; s < sourceSheets.length; s++) {
    const { sheet } = sourceSheets[s];

    if (s === 0) {
      // First sheet: copy column widths, view, page setup, and all rows
      const maxCols = Math.max(sheet.columnCount || 0, sheet.columns ? sheet.columns.length : 0);
      for (let c = 1; c <= maxCols; c++) {
        const srcCol = sheet.getColumn(c);
        const tgtCol = targetWs.getColumn(c);
        if (srcCol.width !== undefined) tgtCol.width = srcCol.width;
        if (srcCol.hidden !== undefined) tgtCol.hidden = srcCol.hidden;
      }

      if (sheet.views && sheet.views.length > 0) {
        try { targetWs.views = JSON.parse(JSON.stringify(sheet.views)); } catch {}
      }

      sheet.eachRow({ includeEmpty: true }, (srcRow, rowNumber) => {
        const tgtRow = targetWs.getRow(rowNumber);
        if (srcRow.height !== undefined) tgtRow.height = srcRow.height;
        srcRow.eachCell({ includeEmpty: true }, (srcCell, colNumber) => {
          copyExcelCellProperties(srcCell, tgtRow.getCell(colNumber));
        });
      });

      // Record first sheet's header row
      const firstRow = sheet.getRow(1);
      firstRow.eachCell({ includeEmpty: true }, (c) => {
        masterHeaders.push(String(c.value ?? '').trim().toLowerCase());
      });

      // Merged cells for first sheet
      const merges: string[] = (sheet.model && (sheet.model as any).merges) || [];
      for (const mergeRange of merges) {
        try { targetWs.mergeCells(mergeRange); } catch {}
      }

      currentRowIndex = (sheet.lastRow?.number || 0) + 1;
    } else {
      // Subsequent sheets: check if row 1 is a duplicate header
      let startRow = 1;
      const sheetRow1 = sheet.getRow(1);
      const row1Headers: string[] = [];
      sheetRow1.eachCell({ includeEmpty: true }, (c) => {
        row1Headers.push(String(c.value ?? '').trim().toLowerCase());
      });

      const isSameHeader =
        masterHeaders.length > 0 &&
        row1Headers.length > 0 &&
        masterHeaders.length === row1Headers.length &&
        masterHeaders.every((h, idx) => h === row1Headers[idx]);

      if (isSameHeader) {
        startRow = 2; // Skip duplicate header row
      }

      sheet.eachRow({ includeEmpty: true }, (srcRow, rowNumber) => {
        if (rowNumber < startRow) return;

        const targetRowNum = currentRowIndex++;
        const tgtRow = targetWs.getRow(targetRowNum);
        if (srcRow.height !== undefined) tgtRow.height = srcRow.height;

        srcRow.eachCell({ includeEmpty: true }, (srcCell, colNumber) => {
          copyExcelCellProperties(srcCell, tgtRow.getCell(colNumber));
        });
      });
    }
  }
}

async function loadExcelOrCsvWorkbook(fileData: Buffer | Uint8Array, fileName: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const lowerName = (fileName || '').toLowerCase();

  if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')) {
    const text = Buffer.from(fileData).toString('utf-8');
    await wb.csv.read(Readable.from([text]));
    if (wb.worksheets.length > 0) {
      wb.worksheets[0].name = sanitizeExcelSheetName(getBaseName(fileName));
    }
    return wb;
  }

  await wb.xlsx.load(fileData as any);
  return wb;
}

export async function mergeExcelSheets(
  files: { data: Buffer | Uint8Array; name: string }[],
  options: MergeExcelSheetsOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (files.length < 2) throw new ValidationError('At least 2 Excel/CSV files required for merging');

  try {
    const mergeMode = options.mergeMode || 'preserve_sheets';
    const mergedWorkbook = new ExcelJS.Workbook();
    const existingSheetNames = new Set<string>();
    const allSourceSheets: { sheet: ExcelJS.Worksheet; fileName: string }[] = [];

    // Load all workbooks
    for (let i = 0; i < files.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / files.length) * 50),
        `Reading file ${i + 1} of ${files.length}: ${files[i].name}`
      );

      const file = files[i];
      const sourceWorkbook = await loadExcelOrCsvWorkbook(file.data, file.name);

      sourceWorkbook.worksheets.forEach((sheet) => {
        allSourceSheets.push({ sheet, fileName: file.name });
      });
    }

    if (mergeMode === 'combine_sheet') {
      processing?.onProgress?.(60, 'Combining rows into master worksheet with structure preservation...');
      const combinedSheetName = sanitizeExcelSheetName(
        allSourceSheets[0]?.sheet.name || 'Combined Data'
      );
      const targetSheet = mergedWorkbook.addWorksheet(combinedSheetName);
      combineSheetsIntoSingle(allSourceSheets, targetSheet);
    } else {
      // Default: preserve_sheets - Keep each sheet in its own tab with 100% layout and styles preserved
      for (let s = 0; s < allSourceSheets.length; s++) {
        processing?.onProgress?.(
          50 + Math.round(((s + 1) / allSourceSheets.length) * 40),
          `Cloning worksheet structure ${s + 1} of ${allSourceSheets.length}: ${allSourceSheets[s].sheet.name}`
        );

        const { sheet, fileName } = allSourceSheets[s];
        const uniqueName = generateUniqueSheetName(sheet.name, fileName, existingSheetNames);
        const newSheet = mergedWorkbook.addWorksheet(uniqueName);
        copyWorksheetStructure(sheet, newSheet);
      }
    }

    processing?.onProgress?.(95, 'Generating merged Excel workbook...');
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
        mergeMode,
        sheets: mergedWorkbook.worksheets.map(ws => ({
          name: ws.name,
          rowCount: ws.rowCount,
          columnCount: ws.columnCount,
        })),
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

export interface ProtectWorkbookOptions {
  password?: string;
  userPassword?: string;
}

export async function protectWorkbook(
  data: Buffer | Uint8Array,
  filename: string,
  options: ProtectWorkbookOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  const password = options.userPassword || options.password;
  if (!password) {
    throw new ValidationError('Password is required');
  }

  processing?.onProgress?.(20, 'Preparing Excel file for password protection...');

  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_excel_protect');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in.xlsx`);
  const outputPath = join(tempFolder, `${id}_out.xlsx`);

  try {
    // 1. Also apply worksheet protection so both file opening AND editing are protected
    let sourceData: Buffer;
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data as any);
      for (const sheet of workbook.worksheets) {
        await sheet.protect(password, {
          selectLockedCells: true,
          selectUnlockedCells: true,
        });
      }
      const lockedBuffer = await workbook.xlsx.writeBuffer();
      sourceData = Buffer.from(lockedBuffer);
    } catch {
      sourceData = Buffer.from(data);
    }

    await writeFile(inputPath, sourceData);
    processing?.onProgress?.(50, 'Encrypting workbook with password protection...');

    // Resolve encrypt_excel.py helper script
    let scriptPath = '';
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const candidates = [
        join(currentDir, 'encrypt_excel.py'),
        join(process.cwd(), 'packages', 'shared', 'src', 'services', 'spreadsheet', 'encrypt_excel.py'),
        join(process.cwd(), 'packages', 'shared', 'dist', 'services', 'spreadsheet', 'encrypt_excel.py'),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          scriptPath = cand;
          break;
        }
      }
    } catch {}

    let encrypted = false;

    // Strategy 1: Use Python helper script
    if (scriptPath) {
      try {
        await execFileAsync('python', [scriptPath, inputPath, outputPath, password]);
        if (existsSync(outputPath) && (await stat(outputPath)).size > 0) {
          encrypted = true;
        }
      } catch {
        try {
          await execFileAsync('python3', [scriptPath, inputPath, outputPath, password]);
          if (existsSync(outputPath) && (await stat(outputPath)).size > 0) {
            encrypted = true;
          }
        } catch {}
      }
    }

    // Strategy 2: Inline Python command with msoffcrypto
    if (!encrypted) {
      const inlinePy = `
import sys, os
try:
    import msoffcrypto
    with open(sys.argv[1], 'rb') as fin, open(sys.argv[2], 'wb') as fout:
        file = msoffcrypto.OfficeFile(fin)
        file.encrypt(sys.argv[3], fout)
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;
      try {
        await execFileAsync('python', ['-c', inlinePy, inputPath, outputPath, password]);
        if (existsSync(outputPath) && (await stat(outputPath)).size > 0) {
          encrypted = true;
        }
      } catch {
        try {
          await execFileAsync('python3', ['-c', inlinePy, inputPath, outputPath, password]);
          if (existsSync(outputPath) && (await stat(outputPath)).size > 0) {
            encrypted = true;
          }
        } catch {}
      }
    }

    processing?.onProgress?.(90, 'Finalizing protected workbook...');

    let finalBuffer: Buffer;
    if (encrypted && existsSync(outputPath)) {
      finalBuffer = await readFile(outputPath);
    } else {
      finalBuffer = sourceData;
    }

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_protected.xlsx`,
        data: finalBuffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: finalBuffer.byteLength,
      }],
      metadata: {
        isEncrypted: encrypted,
        protectionType: encrypted ? 'password_to_open' : 'worksheet_lock',
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to protect workbook: ${(error as Error).message}`);
  } finally {
    try {
      if (existsSync(inputPath)) await unlink(inputPath);
      if (existsSync(outputPath)) await unlink(outputPath);
    } catch {}
  }
}

// ─── Split Excel Workbook ──────────────────────────────────────

export interface SplitExcelWorkbookOptions {
  sheetName?: string;
}

export async function splitExcelWorkbook(
  data: Buffer | Uint8Array,
  filename: string,
  options: SplitExcelWorkbookOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(15, 'Reading Excel workbook...');
    const source = new ExcelJS.Workbook();
    await source.xlsx.load(data as any);

    const baseName = getBaseName(filename);
    const requestedSheet = options.sheetName?.trim();

    // 1. Single sheet specifically requested (by name or 1-based index)
    if (requestedSheet && requestedSheet !== 'all') {
      const worksheet =
        source.getWorksheet(requestedSheet) ||
        source.worksheets.find(w => w.name.toLowerCase() === requestedSheet.toLowerCase()) ||
        (!isNaN(Number(requestedSheet)) ? source.worksheets[Number(requestedSheet) - 1] : undefined);

      if (!worksheet) {
        const available = source.worksheets.map(w => `"${w.name}"`).join(', ');
        throw new ValidationError(`Worksheet "${requestedSheet}" not found. Available sheets: ${available}`);
      }

      processing?.onProgress?.(60, `Cloning structure for sheet "${worksheet.name}"...`);
      const target = new ExcelJS.Workbook();
      const safeSheetName = sanitizeExcelSheetName(worksheet.name, 'Sheet');
      const targetSheet = target.addWorksheet(safeSheetName);
      copyWorksheetStructure(worksheet, targetSheet);

      const buffer = await target.xlsx.writeBuffer();
      const fileSafeName = worksheet.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'sheet';
      const outputFilename = `${baseName}_${fileSafeName}.xlsx`;

      return {
        success: true,
        outputFiles: [{
          name: outputFilename,
          data: Buffer.from(buffer),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: '.xlsx',
          size: buffer.byteLength,
        }],
        metadata: {
          sheetName: worksheet.name,
          sheetCount: 1,
          rowCount: worksheet.rowCount,
          columnCount: worksheet.columnCount,
        },
        duration: Date.now() - start,
      };
    }

    // 2. All sheets
    const worksheets = source.worksheets.filter(w => w.state !== 'veryHidden');
    if (!worksheets.length) {
      throw new ValidationError('Excel workbook contains no sheets');
    }

    const splitFiles: OutputFile[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < worksheets.length; i++) {
      const srcSheet = worksheets[i];
      processing?.onProgress?.(
        Math.round(20 + ((i + 1) / worksheets.length) * 60),
        `Extracting structure and formatting for sheet ${i + 1} of ${worksheets.length}: "${srcSheet.name}"...`
      );

      const target = new ExcelJS.Workbook();
      const safeSheetName = sanitizeExcelSheetName(srcSheet.name, `Sheet${i + 1}`);
      const targetSheet = target.addWorksheet(safeSheetName);

      // Deep clone exact worksheet structure (columns, widths, row heights, merged cells, fonts, fills, borders, alignments, numFmt, views)
      copyWorksheetStructure(srcSheet, targetSheet);

      const buffer = await target.xlsx.writeBuffer();

      let fileSafeName = srcSheet.name.replace(/[/\\?%*:|"<>]/g, '_').trim() || `Sheet${i + 1}`;
      if (usedNames.has(fileSafeName.toLowerCase())) {
        fileSafeName = `${fileSafeName}_${i + 1}`;
      }
      usedNames.add(fileSafeName.toLowerCase());

      const sheetFileName = `${baseName}_${fileSafeName}.xlsx`;

      splitFiles.push({
        name: sheetFileName,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: '.xlsx',
        size: buffer.byteLength,
      });
    }

    // If only 1 sheet in workbook, return single structured xlsx file
    if (splitFiles.length === 1) {
      return {
        success: true,
        outputFiles: splitFiles,
        metadata: {
          totalSheets: 1,
          sheetNames: [worksheets[0].name],
        },
        duration: Date.now() - start,
      };
    }

    // If multiple sheets: package into a ZIP archive for 1-click download with rich preview
    processing?.onProgress?.(85, `Packaging ${splitFiles.length} split Excel files into ZIP archive...`);
    const zipFilename = `${baseName}_split_sheets.zip`;
    const zipResult = await createZip(
      splitFiles.map(f => ({ data: f.data, name: f.name })),
      { outputFilename: zipFilename }
    );

    return {
      success: true,
      outputFiles: zipResult.outputFiles,
      metadata: {
        isZip: true,
        totalSheets: splitFiles.length,
        sheetNames: worksheets.map(w => w.name),
        containedFiles: splitFiles.map(f => ({
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
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
