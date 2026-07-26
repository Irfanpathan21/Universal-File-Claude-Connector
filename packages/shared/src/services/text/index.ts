/**
 * Text Statistics & Analysis Service
 *
 * Provides word count, character count, sentence count, paragraph count,
 * readability metrics, and estimated reading time.
 */

import type { ProcessingResult, ProcessingOptions } from '../../types/index.js';
import { getBaseName } from '../../utils/index.js';

export async function analyzeTextStats(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  const text = Buffer.from(data).toString('utf-8');

  processing?.onProgress?.(50, 'Analyzing text statistics...');

  const charCount = text.length;
  const charNoSpaces = text.replace(/\s/g, '').length;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const paragraphCount = paragraphs.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const sentenceCount = sentences.length;

  // Average reading speed: 200 words per minute
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  const stats = {
    filename,
    wordCount,
    characterCount: charCount,
    characterCountWithoutSpaces: charNoSpaces,
    lineCount,
    paragraphCount,
    sentenceCount,
    averageWordLength: wordCount > 0 ? (charNoSpaces / wordCount).toFixed(2) : 0,
    averageSentenceLength: sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(2) : 0,
    estimatedReadingTimeMinutes: readingTimeMinutes,
  };

  const jsonStr = JSON.stringify(stats, null, 2);

  return {
    success: true,
    outputFiles: [{
      name: `${getBaseName(filename)}_text_stats.json`,
      data: Buffer.from(jsonStr, 'utf-8'),
      mimeType: 'application/json',
      extension: '.json',
      size: Buffer.byteLength(jsonStr, 'utf-8'),
    }],
    metadata: stats,
    duration: Date.now() - start,
  };
}
