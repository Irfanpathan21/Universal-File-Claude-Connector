/**
 * OCR Processing Service (Tesseract.js)
 *
 * Provides Optical Character Recognition for images (PNG, JPG, TIFF, BMP) and scanned documents.
 */

import { createWorker } from 'tesseract.js';
import type { ProcessingResult, ProcessingOptions } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

// ─── Extract Text from Image via OCR ─────────────────────────

export interface OcrOptions {
  language?: string; // e.g. 'eng', 'spa', 'fra', 'deu'
  preserveLayout?: boolean; // Defaults to true; preserves visual columns, tables, and spacing
}

interface WordBox {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
  height: number;
}

interface VisualLine {
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: WordBox[];
  height: number;
}

function cleanWordText(w: string): string {
  return w.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function cleanRawOcrText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

export function reconstructStructuredOcrText(data: any): string {
  const blocks = data?.blocks;
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return cleanRawOcrText(data?.text || '');
  }

  // 1. Extract all lines and valid words with spatial bounding boxes
  const rawLines: VisualLine[] = [];
  for (const block of blocks) {
    for (const p of block.paragraphs || []) {
      for (const line of p.lines || []) {
        if (!line.text || !line.text.trim()) continue;
        const words: WordBox[] = (line.words || [])
          .filter((w: any) => w.text && w.text.trim())
          .map((w: any) => ({
            text: cleanWordText(w.text.trim()),
            bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
            confidence: w.confidence ?? 0,
            height: (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0),
          }))
          .filter((w: WordBox) => w.text.length > 0);

        if (words.length === 0) continue;

        const x0 = Math.min(...words.map(w => w.bbox.x0));
        const y0 = Math.min(...words.map(w => w.bbox.y0));
        const x1 = Math.max(...words.map(w => w.bbox.x1));
        const y1 = Math.max(...words.map(w => w.bbox.y1));

        rawLines.push({
          bbox: { x0, y0, x1, y1 },
          words,
          height: Math.max(y1 - y0, line.bbox ? line.bbox.y1 - line.bbox.y0 : 16),
        });
      }
    }
  }

  if (rawLines.length === 0) {
    return cleanRawOcrText(data?.text || '');
  }

  // 2. Sort lines vertically (top to bottom), then horizontally (left to right)
  rawLines.sort((a, b) => {
    const yOverlap = Math.min(a.bbox.y1, b.bbox.y1) - Math.max(a.bbox.y0, b.bbox.y0);
    const minHeight = Math.min(a.height, b.height);
    if (yOverlap > minHeight * 0.45) {
      return a.bbox.x0 - b.bbox.x0;
    }
    return a.bbox.y0 - b.bbox.y0;
  });

  // 3. Group into visual lines (merge horizontal line fragments sharing the same baseline)
  const visualLines: VisualLine[] = [];
  for (const line of rawLines) {
    if (visualLines.length === 0) {
      visualLines.push(line);
      continue;
    }
    const prev = visualLines[visualLines.length - 1];
    const yOverlap = Math.min(prev.bbox.y1, line.bbox.y1) - Math.max(prev.bbox.y0, line.bbox.y0);
    const minHeight = Math.min(prev.height, line.height);

    if (yOverlap > minHeight * 0.45) {
      prev.words = [...prev.words, ...line.words].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      prev.bbox.x0 = Math.min(prev.bbox.x0, line.bbox.x0);
      prev.bbox.x1 = Math.max(prev.bbox.x1, line.bbox.x1);
      prev.bbox.y0 = Math.min(prev.bbox.y0, line.bbox.y0);
      prev.bbox.y1 = Math.max(prev.bbox.y1, line.bbox.y1);
      prev.height = prev.bbox.y1 - prev.bbox.y0;
    } else {
      visualLines.push(line);
    }
  }

  // 4. Calculate median line height & character dimensions
  const heights = visualLines.map(l => l.height).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 16;

  let totalChars = 0;
  let totalWordWidth = 0;
  for (const l of visualLines) {
    for (const w of l.words) {
      totalChars += w.text.length;
      totalWordWidth += (w.bbox.x1 - w.bbox.x0);
    }
  }
  const avgCharPx = totalChars > 0 ? (totalWordWidth / totalChars) : 10;
  const colScale = 1 / Math.max(avgCharPx * 0.95, 6);

  const minX = Math.min(...visualLines.map(l => l.bbox.x0));
  const maxX = Math.max(...visualLines.map(l => l.bbox.x1));
  const pageWidth = Math.max(maxX - minX, 100);

  // 5. Format visual lines with spatial column alignment and paragraph spacing
  const outputLines: string[] = [];

  for (let i = 0; i < visualLines.length; i++) {
    const line = visualLines[i];
    const prevLine = i > 0 ? visualLines[i - 1] : null;

    // Check vertical gap between lines for paragraph / section breaks
    if (prevLine) {
      const gapY = line.bbox.y0 - prevLine.bbox.y1;
      if (gapY > medianHeight * 0.6) {
        outputLines.push('');
      }
    }

    const words = line.words;
    let lineStr = '';
    let currentPos = 0;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      const targetCol = Math.round((word.bbox.x0 - minX) * colScale);

      if (wIdx === 0) {
        const leadSpaces = Math.max(0, targetCol);
        lineStr += (leadSpaces > 3 ? ' '.repeat(leadSpaces) : '');
        lineStr += word.text;
        currentPos = lineStr.length;
      } else {
        const prevWord = words[wIdx - 1];
        const gapPx = word.bbox.x0 - prevWord.bbox.x1;

        if (gapPx >= avgCharPx * 2.0) {
          // Significant spatial gap -> align to character column
          const neededSpaces = Math.max(2, targetCol - currentPos);
          lineStr += ' '.repeat(neededSpaces) + word.text;
        } else {
          // Normal intra-phrase space
          lineStr += ' ' + word.text;
        }
        currentPos = lineStr.length;
      }
    }

    // Heading detection: large font, concise text, no currency or numeric table row
    const lineFullText = words.map(w => w.text).join(' ');
    const isSingleColumn = words.length <= 10 && (line.bbox.x1 - line.bbox.x0) < pageWidth * 0.85;
    const hasTableData = /[\$\€\£\¥\d]{2,}/.test(lineFullText);
    const isHeading = line.height >= medianHeight * 1.35 && isSingleColumn && !hasTableData && words.length <= 8;

    if (isHeading && i < 5) {
      // Document title
      outputLines.push(lineStr);
      outputLines.push('='.repeat(Math.min(lineStr.length, 75)));
    } else if (isHeading) {
      // Section header
      outputLines.push(lineStr);
      outputLines.push('-'.repeat(Math.min(lineStr.length, 50)));
    } else {
      outputLines.push(lineStr);
    }
  }

  return cleanRawOcrText(outputLines.join('\n'));
}

export async function extractTextFromImageOcr(
  data: Buffer | Uint8Array,
  filename: string,
  options: OcrOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const lang = options.language || 'eng';
  const preserveLayout = options.preserveLayout !== false;

  try {
    processing?.onProgress?.(20, `Initializing OCR engine (${lang})...`);
    const worker = await createWorker(lang);

    processing?.onProgress?.(50, 'Recognizing text and analyzing document layout...');
    const ret = await worker.recognize(
      data,
      {},
      { text: true, blocks: true, tsv: true } as any
    );

    processing?.onProgress?.(90, 'Formatting structured text and finalizing...');
    await worker.terminate();

    let text: string;
    if (preserveLayout && ret.data.blocks && ret.data.blocks.length > 0) {
      text = reconstructStructuredOcrText(ret.data);
    } else {
      text = cleanRawOcrText(ret.data.text || '');
    }

    if (!text.trim()) {
      text = 'No text detected by OCR.';
    }

    const confidence = ret.data.confidence || 0;
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_ocr.txt`,
        data: Buffer.from(text, 'utf-8'),
        mimeType: 'text/plain',
        extension: '.txt',
        size: Buffer.byteLength(text, 'utf-8'),
      }],
      metadata: {
        ocrConfidence: `${confidence.toFixed(1)}%`,
        characterCount: text.length,
        lineCount: lines.length,
        language: lang,
        layoutPreserved: preserveLayout,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to perform OCR on image: ${(error as Error).message}`);
  }
}
