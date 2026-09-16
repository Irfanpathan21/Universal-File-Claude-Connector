/**
 * PDF Processing Service
 *
 * Provides comprehensive PDF manipulation using pdf-lib and pdf-parse.
 * All operations accept Buffers and return ProcessingResult.
 */

import { PDFDocument, StandardFonts, rgb, degrees, PageSizes, PDFPage, PDFRawStream, PDFName } from 'pdf-lib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName, generateId } from '../../utils/index.js';

const execFileAsync = promisify(execFile);

// ─── Merge PDFs ──────────────────────────────────────────────

export interface MergePdfOptions {
  outputFilename?: string;
}

export async function mergePdf(
  files: { data: Buffer | Uint8Array; name: string }[],
  options: MergePdfOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (files.length < 2) {
    throw new ValidationError('At least 2 PDF files required for merging');
  }

  try {
    const mergedPdf = await PDFDocument.create();
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / totalFiles) * 90),
        `Merging file ${i + 1} of ${totalFiles}: ${files[i].name}`
      );

      if (processing?.signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      const pdf = await PDFDocument.load(files[i].data, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    processing?.onProgress?.(95, 'Saving merged PDF...');
    const outputData = await mergedPdf.save();
    const outputName = options.outputFilename || 'merged.pdf';

    return {
      success: true,
      outputFiles: [{
        name: outputName,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: {
        totalPages: mergedPdf.getPageCount(),
        filesProcessed: files.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if ((error as Error).message === 'Operation cancelled') throw error;
    throw new ProcessingError(`Failed to merge PDFs: ${(error as Error).message}`);
  }
}

// ─── Split PDF ───────────────────────────────────────────────

export interface SplitPdfOptions {
  ranges?: string; // e.g. "1-5,10-15" or "every:3"
  splitEvery?: number;
  extractSingle?: number[];
}

export async function splitPdf(
  data: Buffer | Uint8Array,
  filename: string,
  options: SplitPdfOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();
    const outputFiles: OutputFile[] = [];
    const baseName = getBaseName(filename);
    let ranges: [number, number][] = [];

    if (options.extractSingle && options.extractSingle.length > 0) {
      // Extract individual pages
      ranges = options.extractSingle.map(p => [p, p]);
    } else if (options.splitEvery && options.splitEvery > 0) {
      // Split every N pages
      for (let i = 0; i < totalPages; i += options.splitEvery) {
        ranges.push([i + 1, Math.min(i + options.splitEvery, totalPages)]);
      }
    } else if (options.ranges) {
      // Parse range string like "1-5,10-15"
      ranges = parsePageRanges(options.ranges, totalPages);
    } else {
      // Default: split into individual pages
      ranges = Array.from({ length: totalPages }, (_, i) => [i + 1, i + 1] as [number, number]);
    }

    for (let i = 0; i < ranges.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / ranges.length) * 90),
        `Creating part ${i + 1} of ${ranges.length}`
      );

      const [startPage, endPage] = ranges[i];
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: endPage - startPage + 1 },
        (_, j) => startPage - 1 + j
      );
      const pages = await newPdf.copyPages(sourcePdf, pageIndices);
      pages.forEach(page => newPdf.addPage(page));

      const outputData = await newPdf.save();
      outputFiles.push({
        name: `${baseName}_pages_${startPage}-${endPage}.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      });
    }

    return {
      success: true,
      outputFiles,
      metadata: { totalPages, parts: ranges.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to split PDF: ${(error as Error).message}`);
  }
}

// ─── Rotate PDF ──────────────────────────────────────────────

export interface RotatePdfOptions {
  angle: 0 | 90 | 180 | 270;
  pages?: number[]; // If empty, rotate all
}

export async function rotatePdf(
  data: Buffer | Uint8Array,
  filename: string,
  options: RotatePdfOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalPages = pdf.getPageCount();
    const pagesToRotate = options.pages?.length
      ? options.pages.map(p => p - 1)
      : Array.from({ length: totalPages }, (_, i) => i);

    for (const pageIdx of pagesToRotate) {
      if (pageIdx >= 0 && pageIdx < totalPages) {
        const page = pdf.getPage(pageIdx);
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + options.angle));
      }
    }

    processing?.onProgress?.(90, 'Saving rotated PDF...');
    const outputData = await pdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_rotated.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: { rotatedPages: pagesToRotate.length, angle: options.angle },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to rotate PDF: ${(error as Error).message}`);
  }
}

// ─── Extract Pages ───────────────────────────────────────────

export async function extractPages(
  data: Buffer | Uint8Array,
  filename: string,
  pages: (number[] | string) | { pages?: number[] | string },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  const rawPages = (typeof pages === 'object' && pages !== null && !Array.isArray(pages) && 'pages' in (pages as any))
    ? (pages as any).pages
    : pages;

  const pagesArray = (Array.isArray(rawPages)
    ? rawPages
    : String(rawPages || '').split(',').map(p => parseInt(p.trim(), 10))
  ).map(p => typeof p === 'string' ? parseInt(p, 10) : p).filter(n => !isNaN(n));

  if (!pagesArray.length) throw new ValidationError('At least one page number required');

  try {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const newPdf = await PDFDocument.create();
    const pageIndices = pagesArray.map(p => p - 1).filter(p => p >= 0 && p < sourcePdf.getPageCount());

    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    processing?.onProgress?.(90, 'Saving extracted pages...');
    const outputData = await newPdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_extracted.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: { extractedPages: pageIndices.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract pages: ${(error as Error).message}`);
  }
}

// ─── Delete Pages ────────────────────────────────────────────

export async function deletePages(
  data: Buffer | Uint8Array,
  filename: string,
  pagesToDelete: number[] | string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();
    const pagesArray = (Array.isArray(pagesToDelete)
      ? pagesToDelete
      : String(pagesToDelete || '').split(',').map(p => parseInt(p.trim(), 10))
    ).map(p => typeof p === 'string' ? parseInt(p, 10) : p).filter(n => !isNaN(n));
    const deleteSet = new Set(pagesArray.map(p => p - 1));

    const keepPages = Array.from({ length: totalPages }, (_, i) => i)
      .filter(i => !deleteSet.has(i));

    if (keepPages.length === 0) {
      throw new ValidationError('Cannot delete all pages from PDF');
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, keepPages);
    copiedPages.forEach(page => newPdf.addPage(page));

    processing?.onProgress?.(90, 'Saving PDF...');
    const outputData = await newPdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_modified.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: { deletedPages: pagesToDelete.length, remainingPages: keepPages.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to delete pages: ${(error as Error).message}`);
  }
}

// ─── Rearrange Pages ─────────────────────────────────────────

export async function rearrangePages(
  data: Buffer | Uint8Array,
  filename: string,
  newOrder: number[],
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();
    if (totalPages === 0) throw new ValidationError('The PDF file contains no pages');

    let parsedOrder: number[] = [];
    if (Array.isArray(newOrder)) {
      parsedOrder = newOrder
        .map(n => (typeof n === 'string' ? parseInt(n, 10) : Number(n)))
        .filter(n => !isNaN(n) && n >= 1 && n <= totalPages);
    }

    if (parsedOrder.length === 0) {
      throw new ValidationError(`Please specify valid page numbers between 1 and ${totalPages}`);
    }

    const pageIndices = parsedOrder.map(p => p - 1);

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    processing?.onProgress?.(90, 'Saving reordered PDF...');
    const outputData = await newPdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_reordered.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: { totalPages: parsedOrder.length, pageOrder: parsedOrder },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to rearrange pages: ${(error as Error).message}`);
  }
}

// ─── Extract Text ────────────────────────────────────────────

export async function extractText(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    // Dynamic import for pdf-parse (CommonJS module)
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(Buffer.from(data));

    processing?.onProgress?.(90, 'Formatting text output...');
    const textContent = result.text;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.txt`,
        data: Buffer.from(textContent, 'utf-8'),
        mimeType: 'text/plain',
        extension: '.txt',
        size: Buffer.byteLength(textContent, 'utf-8'),
      }],
      metadata: {
        pages: result.numpages,
        characters: textContent.length,
        info: result.info,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract text: ${(error as Error).message}`);
  }
}

// ─── Add Watermark ───────────────────────────────────────────

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number;
  color?: { r: number; g: number; b: number };
  rotation?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export async function addWatermark(
  data: Buffer | Uint8Array,
  filename: string,
  options: WatermarkOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (!options.text?.trim()) {
    throw new ValidationError('Watermark text is required');
  }

  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = options.fontSize || 48;
    const opacity = options.opacity ?? 0.3;
    const color = options.color || { r: 0.5, g: 0.5, b: 0.5 };
    const rotation = options.rotation ?? 45;

    const pages = pdf.getPages();
    for (let i = 0; i < pages.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / pages.length) * 90),
        `Adding watermark to page ${i + 1}`
      );

      const page = pages[i];
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(options.text, fontSize);

      let x = (width - textWidth) / 2;
      let y = height / 2;

      if (options.position === 'top-left') { x = 50; y = height - 80; }
      else if (options.position === 'top-right') { x = width - textWidth - 50; y = height - 80; }
      else if (options.position === 'bottom-left') { x = 50; y = 50; }
      else if (options.position === 'bottom-right') { x = width - textWidth - 50; y = 50; }

      page.drawText(options.text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotation),
      });
    }

    processing?.onProgress?.(95, 'Saving watermarked PDF...');
    const outputData = await pdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_watermarked.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: { pagesProcessed: pages.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to add watermark: ${(error as Error).message}`);
  }
}

// ─── Add Page Numbers ────────────────────────────────────────

export interface PageNumberOptions {
  format?: 'numeric' | 'roman' | 'alpha';
  position?: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right';
  fontSize?: number;
  startNumber?: number;
  prefix?: string;
  suffix?: string;
}

export async function addPageNumbers(
  data: Buffer | Uint8Array,
  filename: string,
  options: PageNumberOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = options.fontSize || 12;
    const position = options.position || 'bottom-center';
    const startNum = options.startNumber || 1;
    const prefix = options.prefix || '';
    const suffix = options.suffix || '';

    const pages = pdf.getPages();
    for (let i = 0; i < pages.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / pages.length) * 90),
        `Adding page number ${i + 1}`
      );

      const page = pages[i];
      const { width, height } = page.getSize();
      const pageNum = formatPageNumber(startNum + i, options.format || 'numeric');
      const text = `${prefix}${pageNum}${suffix}`;
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      let x: number, y: number;
      switch (position) {
        case 'bottom-left': x = 40; y = 30; break;
        case 'bottom-right': x = width - textWidth - 40; y = 30; break;
        case 'top-center': x = (width - textWidth) / 2; y = height - 30; break;
        case 'top-left': x = 40; y = height - 30; break;
        case 'top-right': x = width - textWidth - 40; y = height - 30; break;
        default: x = (width - textWidth) / 2; y = 30;
      }

      page.drawText(text, {
        x, y, size: fontSize, font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    processing?.onProgress?.(95, 'Saving PDF with page numbers...');
    const outputData = await pdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_numbered.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: { pagesNumbered: pages.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to add page numbers: ${(error as Error).message}`);
  }
}

// ─── Password Protect ────────────────────────────────────────

export interface PasswordProtectOptions {
  userPassword: string;
  ownerPassword?: string;
}

export async function passwordProtect(
  data: Buffer | Uint8Array,
  filename: string,
  options: PasswordProtectOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  const password = options.userPassword || (options as any).password;
  if (!password) {
    throw new ValidationError('Password is required');
  }

  processing?.onProgress?.(20, 'Preparing PDF for password protection...');

  const id = generateId();
  const tempFolder = join(tmpdir(), 'uft_pdf_encrypt');
  await mkdir(tempFolder, { recursive: true });

  const inputPath = join(tempFolder, `${id}_in.pdf`);
  const outputPath = join(tempFolder, `${id}_out.pdf`);

  try {
    await writeFile(inputPath, data);
    processing?.onProgress?.(50, 'Applying password encryption...');

    // Resolve encrypt_pdf.py helper script
    let scriptPath = '';
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const candidates = [
        join(currentDir, 'encrypt_pdf.py'),
        join(process.cwd(), 'packages', 'shared', 'src', 'services', 'pdf', 'encrypt_pdf.py'),
        join(process.cwd(), 'packages', 'shared', 'dist', 'services', 'pdf', 'encrypt_pdf.py'),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          scriptPath = cand;
          break;
        }
      }
    } catch {
      // Ignore url resolution issues
    }

    let encrypted = false;

    // Strategy 1: Use Python helper script if found
    if (scriptPath) {
      try {
        await execFileAsync('python', [scriptPath, inputPath, outputPath, password]);
        if (existsSync(outputPath)) encrypted = true;
      } catch {
        try {
          await execFileAsync('python3', [scriptPath, inputPath, outputPath, password]);
          if (existsSync(outputPath)) encrypted = true;
        } catch {
          // Fall through to Strategy 2
        }
      }
    }

    // Strategy 2: Inline Python command with pypdf (AES-128 / RC4-128 standard encryption)
    if (!encrypted) {
      const cleanPy = `
import sys
from pypdf import PdfReader, PdfWriter
r = PdfReader(sys.argv[1])
w = PdfWriter()
for p in r.pages:
    w.add_page(p)
if r.metadata:
    w.add_metadata(r.metadata)
try:
    w.encrypt(user_password=sys.argv[3], algorithm="AES-128")
except Exception:
    w.encrypt(user_password=sys.argv[3], algorithm="RC4-128")
with open(sys.argv[2], "wb") as f:
    w.write(f)
`;
      try {
        await execFileAsync('python', ['-c', cleanPy, inputPath, outputPath, password]);
        if (existsSync(outputPath)) encrypted = true;
      } catch {
        try {
          await execFileAsync('python3', ['-c', cleanPy, inputPath, outputPath, password]);
          if (existsSync(outputPath)) encrypted = true;
        } catch {
          // Fall through to Strategy 3
        }
      }
    }

    // Strategy 3: Try QPDF if installed
    if (!encrypted) {
      try {
        await execFileAsync('qpdf', ['--encrypt', password, password, '256', '--', inputPath, outputPath]);
        if (existsSync(outputPath)) encrypted = true;
      } catch {
        // All strategies failed
      }
    }

    if (!encrypted || !existsSync(outputPath)) {
      throw new ProcessingError('Failed to password-protect PDF: Unable to encrypt file using Python or QPDF.');
    }

    processing?.onProgress?.(90, 'Finalizing encrypted PDF...');
    const outputData = await readFile(outputPath);

    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_protected.pdf`,
        data: outputData,
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      message: 'PDF successfully password protected! When opened in any viewer, it will require your password.',
      metadata: { encrypted: true },
      duration: Date.now() - start,
    };
  } catch (error) {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    if (error instanceof ValidationError || error instanceof ProcessingError) throw error;
    throw new ProcessingError(`Failed to protect PDF: ${(error as Error).message}`);
  }
}

// ─── PDF Metadata ────────────────────────────────────────────

export interface PdfMetadataOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}

export async function editMetadata(
  data: Buffer | Uint8Array,
  filename: string,
  metadata: PdfMetadataOptions,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });

    if (metadata.title !== undefined) pdf.setTitle(metadata.title);
    if (metadata.author !== undefined) pdf.setAuthor(metadata.author);
    if (metadata.subject !== undefined) pdf.setSubject(metadata.subject);
    if (metadata.keywords !== undefined) pdf.setKeywords(metadata.keywords);
    if (metadata.creator !== undefined) pdf.setCreator(metadata.creator);
    if (metadata.producer !== undefined) pdf.setProducer(metadata.producer);

    processing?.onProgress?.(90, 'Saving PDF with updated metadata...');
    const outputData = await pdf.save();

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_metadata.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: {
        title: pdf.getTitle(),
        author: pdf.getAuthor(),
        subject: pdf.getSubject(),
        keywords: pdf.getKeywords(),
        creator: pdf.getCreator(),
        producer: pdf.getProducer(),
        pageCount: pdf.getPageCount(),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to edit metadata: ${(error as Error).message}`);
  }
}

export async function getMetadata(
  data: Buffer | Uint8Array,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });

    const metadata = {
      title: pdf.getTitle(),
      author: pdf.getAuthor(),
      subject: pdf.getSubject(),
      keywords: pdf.getKeywords(),
      creator: pdf.getCreator(),
      producer: pdf.getProducer(),
      pageCount: pdf.getPageCount(),
      creationDate: pdf.getCreationDate()?.toISOString(),
      modificationDate: pdf.getModificationDate()?.toISOString(),
    };

    return {
      success: true,
      outputFiles: [{
        name: 'metadata.json',
        data: Buffer.from(JSON.stringify(metadata, null, 2)),
        mimeType: 'application/json',
        extension: '.json',
      }],
      metadata,
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to read metadata: ${(error as Error).message}`);
  }
}

// ─── Compress PDF ────────────────────────────────────────────

export interface CompressPdfOptions {
  quality?: 'low' | 'medium' | 'high';
}

export async function compressPdf(
  data: Buffer | Uint8Array,
  filename: string,
  options: CompressPdfOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const originalSize = data.length;

  try {
    const pdf = await PDFDocument.load(data, { ignoreEncryption: true });

    processing?.onProgress?.(50, 'Compressing PDF...');

    // Save with object stream compression (built-in to pdf-lib)
    const outputData = await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const compressedSize = outputData.length;
    const savings = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);

    processing?.onProgress?.(95, 'Compression complete');

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_compressed.pdf`,
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: {
        originalSize,
        compressedSize,
        savingsPercent: Math.round(savings * 100) / 100,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to compress PDF: ${(error as Error).message}`);
  }
}

// ─── Images to PDF ───────────────────────────────────────────

export async function imagesToPdf(
  images: { data: Buffer | Uint8Array; name: string }[],
  options: { outputFilename?: string; pageSize?: 'A4' | 'Letter' | 'fit' } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  if (!images.length) throw new ValidationError('At least one image required');

  try {
    const pdf = await PDFDocument.create();
    const pageSize = options.pageSize || 'A4';

    for (let i = 0; i < images.length; i++) {
      processing?.onProgress?.(
        Math.round(((i + 1) / images.length) * 90),
        `Processing image ${i + 1} of ${images.length}`
      );

      const imgData = images[i].data;
      const ext = images[i].name.toLowerCase();

      let image;
      if (ext.endsWith('.png')) {
        image = await pdf.embedPng(imgData);
      } else {
        // Default to JPEG embedding
        image = await pdf.embedJpg(imgData);
      }

      const imgDims = image.scale(1);
      let pageWidth: number, pageHeight: number;

      if (pageSize === 'fit') {
        pageWidth = imgDims.width;
        pageHeight = imgDims.height;
      } else {
        const sizes = pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
        pageWidth = sizes[0];
        pageHeight = sizes[1];
      }

      const page = pdf.addPage([pageWidth, pageHeight]);

      // Scale image to fit page while maintaining aspect ratio
      const scale = Math.min(
        pageWidth / imgDims.width,
        pageHeight / imgDims.height
      );
      const scaledWidth = imgDims.width * scale;
      const scaledHeight = imgDims.height * scale;

      page.drawImage(image, {
        x: (pageWidth - scaledWidth) / 2,
        y: (pageHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    processing?.onProgress?.(95, 'Saving PDF...');
    const outputData = await pdf.save();

    return {
      success: true,
      outputFiles: [{
        name: options.outputFilename || 'images.pdf',
        data: Buffer.from(outputData),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: outputData.length,
      }],
      metadata: {
        totalPages: images.length,
        pageSize,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to create PDF from images: ${(error as Error).message}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function parsePageRanges(rangeStr: string, totalPages: number): [number, number][] {
  const ranges: [number, number][] = [];
  const parts = rangeStr.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : totalPages;
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= totalPages && start <= end) {
        ranges.push([start, end]);
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        ranges.push([page, page]);
      }
    }
  }

  if (ranges.length === 0) {
    throw new ValidationError(`Invalid page range: "${rangeStr}". Total pages: ${totalPages}`);
  }

  return ranges;
}

function formatPageNumber(num: number, format: string): string {
  switch (format) {
    case 'roman':
      return toRoman(num);
    case 'alpha':
      return String.fromCharCode(64 + (((num - 1) % 26) + 1));
    default:
      return String(num);
  }
}

function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let remaining = num;
  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

// ─── PDF to DOCX Conversion ──────────────────────────────────

export async function pdfToDocx(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  processing?.onProgress?.(10, 'Preparing PDF for Word conversion...');

  const tempDir = join(tmpdir(), `pdf2docx_${generateId()}`);
  const inputPdfPath = join(tempDir, 'input.pdf');
  const outputDocxPath = join(tempDir, 'output.docx');

  try {
    await mkdir(tempDir, { recursive: true });
    await writeFile(inputPdfPath, data);

    // Resolve pdf_to_docx.py helper script
    let scriptPath = '';
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const candidates = [
        join(currentDir, 'pdf_to_docx.py'),
        join(process.cwd(), 'packages', 'shared', 'src', 'services', 'pdf', 'pdf_to_docx.py'),
        join(process.cwd(), 'packages', 'shared', 'dist', 'services', 'pdf', 'pdf_to_docx.py'),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          scriptPath = cand;
          break;
        }
      }
    } catch {
      // Ignore resolution issues
    }

    let convertedSuccessfully = false;

    if (scriptPath) {
      processing?.onProgress?.(40, 'Converting PDF structure to Word format...');
      try {
        await execFileAsync('python', [scriptPath, inputPdfPath, outputDocxPath]);
        convertedSuccessfully = existsSync(outputDocxPath);
      } catch {
        try {
          await execFileAsync('python3', [scriptPath, inputPdfPath, outputDocxPath]);
          convertedSuccessfully = existsSync(outputDocxPath);
        } catch (pyErr: any) {
          console.warn('[pdfToDocx] Python execution failed, attempting fallback:', pyErr?.message);
        }
      }
    }

    let docxBuffer: Buffer;

    if (convertedSuccessfully && existsSync(outputDocxPath)) {
      processing?.onProgress?.(80, 'Finalizing Word document...');
      docxBuffer = await readFile(outputDocxPath);
    } else {
      // Fallback: extract text and construct DOCX using docx node module
      processing?.onProgress?.(50, 'Converting text to DOCX document...');
      const textResult = await extractText(data, filename);
      const text = textResult.outputFiles[0].data.toString('utf-8');
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const lines = text.split(/\r?\n/);
      const paragraphs = lines.map(line => new Paragraph({ children: [new TextRun(line)] }));
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const buffer = await Packer.toBuffer(doc);
      docxBuffer = Buffer.from(buffer);
    }

    processing?.onProgress?.(100, 'Conversion complete');

    const outName = `${getBaseName(filename)}.docx`;
    return {
      success: true,
      outputFiles: [{
        name: outName,
        data: docxBuffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
        size: docxBuffer.length,
      }],
      metadata: { originalFilename: filename, outputSize: docxBuffer.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert PDF to DOCX: ${(error as Error).message}`);
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Cleanup best effort
    }
  }
}

// ─── PDF to HTML Conversion ──────────────────────────────────

export async function pdfToHtml(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  processing?.onProgress?.(30, 'Extracting PDF content...');
  const textResult = await extractText(data, filename);
  const text = textResult.outputFiles[0].data.toString('utf-8');

  const title = getBaseName(filename);
  const paragraphsHtml = text.split(/\n\s*\n/).map(p => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`).join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; line-height: 1.6; color: #222; }
    p { margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${paragraphsHtml}
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
}

// ─── PDF to Images (JPG / PNG) ───────────────────────────────

export interface PdfToImagesOptions {
  mode?: 'auto' | 'pages' | 'embedded' | string;
  format?: 'png' | 'jpg' | 'jpeg' | string;
}

async function extractEmbeddedImagesPureJs(
  data: Buffer | Uint8Array,
  baseName: string,
  preferredFmt = 'png'
): Promise<OutputFile[]> {
  const outputFiles: OutputFile[] = [];
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const enumerated = pdfDoc.context.enumerateIndirectObjects();
    let imgIdx = 1;

    for (const [ref, obj] of enumerated) {
      if (obj instanceof PDFRawStream) {
        const dict = obj.dict;
        const subtype = dict.get(PDFName.of('Subtype'));
        if (subtype === PDFName.of('Image')) {
          const filter = dict.get(PDFName.of('Filter'));
          const filterName = filter instanceof PDFName ? filter.asString() : String(filter || '');

          if (filterName === '/DCTDecode' || filterName.includes('DCTDecode')) {
            const imgBuf = Buffer.from(obj.contents);
            outputFiles.push({
              name: `${baseName}_img_${imgIdx}.jpg`,
              data: imgBuf,
              mimeType: 'image/jpeg',
              extension: '.jpg',
              size: imgBuf.length,
            });
            imgIdx++;
          } else {
            try {
              const sharpMod = await import('sharp');
              const sharp = sharpMod.default;
              const width = dict.get(PDFName.of('Width'))?.toString();
              const height = dict.get(PDFName.of('Height'))?.toString();
              const w = width ? parseInt(width, 10) : 0;
              const h = height ? parseInt(height, 10) : 0;

              let decompressed = Buffer.from(obj.contents);
              if (filterName.includes('FlateDecode')) {
                const zlib = await import('node:zlib');
                try {
                  decompressed = zlib.inflateSync(decompressed);
                } catch {
                  // Ignore inflation error if raw
                }
              }

              if (w > 0 && h > 0) {
                const channels = decompressed.length >= w * h * 4 ? 4 : (decompressed.length >= w * h * 3 ? 3 : 1);
                const img = sharp(decompressed, { raw: { width: w, height: h, channels: channels as any } });
                const pngBuf = await img.png().toBuffer();
                outputFiles.push({
                  name: `${baseName}_img_${imgIdx}.png`,
                  data: pngBuf,
                  mimeType: 'image/png',
                  extension: '.png',
                  size: pngBuf.length,
                });
                imgIdx++;
              }
            } catch {
              // Ignore unparseable raw stream
            }
          }
        }
      }
    }
  } catch {
    // Pure JS extraction error ignored
  }
  return outputFiles;
}

export async function pdfToImages(
  data: Buffer | Uint8Array,
  filename: string,
  options: PdfToImagesOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const baseName = getBaseName(filename);
  const tempDir = join(tmpdir(), `pdf_img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const inputPdfPath = join(tempDir, filename);
  const outputImgDir = join(tempDir, 'extracted');

  try {
    processing?.onProgress?.(20, 'Preparing PDF for image extraction...');
    await mkdir(tempDir, { recursive: true });
    await mkdir(outputImgDir, { recursive: true });
    await writeFile(inputPdfPath, data);

    // Resolve extract_pdf_images.py helper script
    let scriptPath = '';
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const candidates = [
        join(currentDir, 'extract_pdf_images.py'),
        join(process.cwd(), 'packages', 'shared', 'src', 'services', 'pdf', 'extract_pdf_images.py'),
        join(process.cwd(), 'packages', 'shared', 'dist', 'services', 'pdf', 'extract_pdf_images.py'),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          scriptPath = cand;
          break;
        }
      }
    } catch {
      // Ignore resolution issues
    }

    const mode = options.mode || 'auto';
    const preferredFmt = (options.format || 'png').toLowerCase().includes('jpg') ? 'jpg' : 'png';

    let jsonOutput = '';

    if (scriptPath) {
      try {
        const { stdout } = await execFileAsync('python', [scriptPath, inputPdfPath, outputImgDir, baseName, mode, preferredFmt], { timeout: 25000, maxBuffer: 50 * 1024 * 1024 });
        jsonOutput = stdout;
      } catch (err: any) {
        try {
          const { stdout } = await execFileAsync('python3', [scriptPath, inputPdfPath, outputImgDir, baseName, mode, preferredFmt], { timeout: 25000, maxBuffer: 50 * 1024 * 1024 });
          jsonOutput = stdout;
        } catch (err2: any) {
          // Python execution failed, will fallback to pure JS below
        }
      }
    }

    let outputFiles: OutputFile[] = [];

    // Parse RESULT_JSON from stdout if Python succeeded
    const marker = 'RESULT_JSON:';
    const markerIndex = jsonOutput ? jsonOutput.indexOf(marker) : -1;
    if (markerIndex !== -1) {
      try {
        const parsedJsonStr = jsonOutput.slice(markerIndex + marker.length).trim();
        const extractedList: Array<{ name: string; path: string; size: number; mimeType: string; extension: string }> = JSON.parse(parsedJsonStr);

        for (const item of extractedList) {
          const fileData = await readFile(item.path);
          outputFiles.push({
            name: item.name,
            data: fileData,
            mimeType: item.mimeType,
            extension: item.extension,
            size: fileData.length,
          });
        }
      } catch {
        // Fallback to pure JS below if JSON parsing fails
      }
    }

    // Pure JS fallback: extract embedded images directly using pdf-lib and sharp
    if (outputFiles.length === 0) {
      outputFiles = await extractEmbeddedImagesPureJs(data, baseName, preferredFmt);
    }

    if (outputFiles.length === 0) {
      throw new ValidationError('No images could be extracted or found in this PDF');
    }

    return {
      success: true,
      outputFiles,
      metadata: { totalImagesExtracted: outputFiles.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert PDF to images: ${(error as Error).message}`);
  } finally {
    // Cleanup temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

// ─── Insert Pages ─────────────────────────────────────────────

export interface InsertPagesOptions {
  insertAtIndex?: number; // 1-indexed insertion position
}

export async function insertPages(
  targetPdfData: Buffer | Uint8Array,
  sourcePdfData: Buffer | Uint8Array,
  options: InsertPagesOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(20, 'Loading target and source PDFs...');
    const targetDoc = await PDFDocument.load(targetPdfData, { ignoreEncryption: true });
    const sourceDoc = await PDFDocument.load(sourcePdfData, { ignoreEncryption: true });

    const totalTargetPages = targetDoc.getPageCount();
    const insertIdx = Math.max(0, Math.min(totalTargetPages, (options.insertAtIndex ?? totalTargetPages + 1) - 1));

    processing?.onProgress?.(50, 'Copying and inserting pages...');
    const sourcePages = await targetDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());

    sourcePages.forEach((page, i) => {
      targetDoc.insertPage(insertIdx + i, page);
    });

    const pdfBytes = await targetDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: 'inserted.pdf',
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      metadata: { totalPages: targetDoc.getPageCount() },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to insert pages into PDF: ${(error as Error).message}`);
  }
}

// ─── Duplicate Pages ──────────────────────────────────────────

function parseDuplicatePagesInput(input: any, maxPages: number): number[] {
  if (!input) return [1];
  const list: number[] = [];

  const addRange = (startStr: string, endStr: string) => {
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : maxPages;
    if (!isNaN(start) && !isNaN(end)) {
      const s = Math.max(1, Math.min(start, end));
      const e = Math.min(maxPages, Math.max(start, end));
      for (let i = s; i <= e; i++) list.push(i);
    }
  };

  const processItem = (item: any) => {
    if (typeof item === 'number' && !isNaN(item)) {
      list.push(Math.max(1, Math.min(item, maxPages)));
    } else if (typeof item === 'string') {
      const parts = item.split(',').map((s) => s.trim());
      for (const part of parts) {
        if (!part) continue;
        if (part.includes('-')) {
          const [s, e] = part.split('-').map((str) => str.trim());
          addRange(s, e);
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num)) list.push(Math.max(1, Math.min(num, maxPages)));
        }
      }
    }
  };

  if (Array.isArray(input)) {
    input.forEach(processItem);
  } else {
    processItem(input);
  }

  return list.length > 0 ? list : [1];
}

export async function duplicatePages(
  data: Buffer | Uint8Array,
  filename: string,
  options: { pages?: number[] | number | string; page?: number | string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const totalCount = pdfDoc.getPageCount();
    const rawPages = options.pages !== undefined ? options.pages : (options.page !== undefined ? options.page : [1]);
    const parsedPages = parseDuplicatePagesInput(rawPages, totalCount);

    // Get unique page numbers and sort descending so insertion does not alter indices of earlier pages
    const uniquePages = Array.from(new Set(parsedPages)).sort((a, b) => b - a);

    for (const pageNum of uniquePages) {
      if (pageNum >= 1 && pageNum <= totalCount) {
        const [copied] = await pdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        pdfDoc.insertPage(pageNum, copied);
      }
    }

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_duplicated.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      metadata: { totalPages: pdfDoc.getPageCount(), duplicatedPages: uniquePages },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to duplicate PDF pages: ${(error as Error).message}`);
  }
}

// ─── Swap Pages ───────────────────────────────────────────────

export async function swapPages(
  data: Buffer | Uint8Array,
  filename: string,
  options: { pageA: number; pageB: number },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    const idxA = options.pageA - 1;
    const idxB = options.pageB - 1;

    if (idxA < 0 || idxA >= count || idxB < 0 || idxB >= count) {
      throw new ValidationError(`Page numbers must be between 1 and ${count}`);
    }

    const indices = pdfDoc.getPageIndices();
    const temp = indices[idxA];
    indices[idxA] = indices[idxB];
    indices[idxB] = temp;

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(pdfDoc, indices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const pdfBytes = await newDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_swapped.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      metadata: { totalPages: count },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to swap PDF pages: ${(error as Error).message}`);
  }
}

// ─── Reverse Pages ────────────────────────────────────────────

export async function reversePages(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    const reversedIndices = pdfDoc.getPageIndices().reverse();

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(pdfDoc, reversedIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const pdfBytes = await newDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_reversed.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      metadata: { totalPages: count },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to reverse PDF pages: ${(error as Error).message}`);
  }
}

// ─── Edit PDF Metadata ────────────────────────────────────────

export interface EditMetadataOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}

export async function editPdfMetadata(
  data: Buffer | Uint8Array,
  filename: string,
  options: EditMetadataOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });

    if (options.title !== undefined) pdfDoc.setTitle(options.title);
    if (options.author !== undefined) pdfDoc.setAuthor(options.author);
    if (options.subject !== undefined) pdfDoc.setSubject(options.subject);
    if (options.keywords !== undefined) pdfDoc.setKeywords(options.keywords);
    if (options.creator !== undefined) pdfDoc.setCreator(options.creator);
    if (options.producer !== undefined) pdfDoc.setProducer(options.producer);

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_updated.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      metadata: {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to edit PDF metadata: ${(error as Error).message}`);
  }
}

// ─── Flatten PDF Form ─────────────────────────────────────────

export async function flattenPdfForm(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    form.flatten();

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_flattened.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to flatten PDF form: ${(error as Error).message}`);
  }
}

// ─── Extract Form Fields ──────────────────────────────────────

export async function extractFormFields(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fieldData = fields.map(field => {
      const name = field.getName();
      const type = field.constructor.name;
      return { name, type };
    });

    const jsonStr = JSON.stringify(fieldData, null, 2);
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_fields.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: { totalFields: fields.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract PDF form fields: ${(error as Error).message}`);
  }
}

// ─── PDF to TXT ───────────────────────────────────────────────

export async function pdfToTxt(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const textResult = await extractText(data, filename, processing);
  return {
    ...textResult,
    outputFiles: [{
      ...textResult.outputFiles[0],
      name: `${getBaseName(filename)}.txt`,
      mimeType: 'text/plain',
      extension: '.txt',
    }],
  };
}

// ─── TXT to PDF ───────────────────────────────────────────────

export async function txtToPdf(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const text = Buffer.from(data).toString('utf-8');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const pageWidth = 595.28; // A4 width
    const pageHeight = 841.89; // A4 height

    const lines = text.split('\n');
    let page = pdfDoc.addPage(PageSizes.A4);
    let y = pageHeight - margin;

    for (const line of lines) {
      if (y < margin + fontSize) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = pageHeight - margin;
      }
      page.drawText(line.slice(0, 80), { x: margin, y, size: fontSize, font });
      y -= fontSize + 4;
    }

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      metadata: { totalPages: pdfDoc.getPageCount() },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert TXT to PDF: ${(error as Error).message}`);
  }
}

// ─── Crop PDF ─────────────────────────────────────────────────

export interface CropPdfOptions {
  cropBox?: { x: number; y: number; width: number; height: number };
}

export async function cropPdf(
  data: Buffer | Uint8Array,
  filename: string,
  options: CropPdfOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    const box = options.cropBox || { x: 20, y: 20, width: 550, height: 800 };

    pages.forEach(p => {
      p.setCropBox(box.x, box.y, box.width, box.height);
    });

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_cropped.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to crop PDF: ${(error as Error).message}`);
  }
}

// ─── Resize PDF Pages ─────────────────────────────────────────

export async function resizePdfPages(
  data: Buffer | Uint8Array,
  filename: string,
  options: { size?: 'A4' | 'Letter' | 'A3' } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    const targetSize = options.size === 'Letter' ? PageSizes.Letter : options.size === 'A3' ? PageSizes.A3 : PageSizes.A4;

    pages.forEach(p => {
      p.setSize(targetSize[0], targetSize[1]);
    });

    const pdfBytes = await pdfDoc.save();
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_resized.pdf`,
        data: Buffer.from(pdfBytes),
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: pdfBytes.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to resize PDF pages: ${(error as Error).message}`);
  }
}

// ─── Validate PDF ─────────────────────────────────────────────

export async function validatePdf(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const valid = true;
    const pageCount = pdfDoc.getPageCount();

    const resultObj = {
      filename,
      valid,
      pageCount,
      title: pdfDoc.getTitle() || null,
      author: pdfDoc.getAuthor() || null,
    };

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_validation.json`,
        data: Buffer.from(JSON.stringify(resultObj, null, 2), 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(JSON.stringify(resultObj), 'utf-8'),
      }],
      metadata: resultObj,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      outputFiles: [],
      metadata: { valid: false, error: (error as Error).message },
      duration: Date.now() - start,
    };
  }
}
