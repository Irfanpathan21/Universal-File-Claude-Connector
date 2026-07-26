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
}

export async function extractTextFromImageOcr(
  data: Buffer | Uint8Array,
  filename: string,
  options: OcrOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const lang = options.language || 'eng';

  try {
    processing?.onProgress?.(20, `Initializing OCR engine (${lang})...`);
    const worker = await createWorker(lang);

    processing?.onProgress?.(50, 'Recognizing text in image...');
    const ret = await worker.recognize(data);

    processing?.onProgress?.(90, 'Terminating OCR worker...');
    await worker.terminate();

    const text = ret.data.text || 'No text detected by OCR.';
    const confidence = ret.data.confidence || 0;

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
        language: lang,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to perform OCR on image: ${(error as Error).message}`);
  }
}
