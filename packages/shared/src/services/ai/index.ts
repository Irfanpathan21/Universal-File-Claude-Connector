/**
 * AI & NLP Processing Service (Zero API Keys Required)
 *
 * Provides extractive text summarization, keyword extraction, language detection, and sentiment analysis.
 */

import type { ProcessingResult, ProcessingOptions } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

// ─── Summarize Text ───────────────────────────────────────────

export interface SummarizeOptions {
  maxSentences?: number;
}

export async function summarizeText(
  data: Buffer | Uint8Array,
  filename: string,
  options: SummarizeOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const text = Buffer.from(data).toString('utf-8');

  if (!text.trim()) throw new ValidationError('Input text is empty');

  processing?.onProgress?.(30, 'Analyzing text structure & word frequencies...');

  const maxSentences = options.maxSentences || 5;

  // Split into sentences
  const rawSentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15);
  if (rawSentences.length <= maxSentences) {
    const summary = rawSentences.join(' ');
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_summary.txt`,
        data: Buffer.from(summary, 'utf-8'),
        mimeType: 'text/plain',
        extension: '.txt',
        size: Buffer.byteLength(summary, 'utf-8'),
      }],
      metadata: { originalSentences: rawSentences.length, summarySentences: rawSentences.length },
      duration: Date.now() - start,
    };
  }

  // Calculate word frequencies
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const stopWords = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'were', 'which', 'about', 'been', 'there', 'would']);
  const wordFreq: Record<string, number> = {};

  for (const w of words) {
    if (!stopWords.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  // Score sentences based on word frequency
  const scoredSentences = rawSentences.map((sentence, index) => {
    const sentWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;
    for (const w of sentWords) {
      score += wordFreq[w] || 0;
    }
    // Normalize by sentence length
    score = sentWords.length > 0 ? score / sentWords.length : 0;
    // Boost first paragraph/sentence
    if (index === 0) score *= 1.5;
    return { sentence, index, score };
  });

  // Pick top scoring sentences and restore original sentence order
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);

  const summary = topSentences.join('\n\n');

  return {
    success: true,
    outputFiles: [{
      name: `${getBaseName(filename)}_summary.txt`,
      data: Buffer.from(summary, 'utf-8'),
      mimeType: 'text/plain',
      extension: '.txt',
      size: Buffer.byteLength(summary, 'utf-8'),
    }],
    metadata: {
      originalSentences: rawSentences.length,
      summarySentences: topSentences.length,
      compressionRatio: `${((1 - summary.length / text.length) * 100).toFixed(1)}%`,
    },
    duration: Date.now() - start,
  };
}

// ─── Extract Keywords ─────────────────────────────────────────

export async function extractKeywords(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const text = Buffer.from(data).toString('utf-8');

  processing?.onProgress?.(30, 'Extracting keywords and key phrases...');

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const stopWords = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'were', 'which', 'about', 'been', 'there', 'would', 'their', 'will', 'when', 'what', 'some']);

  const freqMap: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }
  }

  const sortedKeywords = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({ keyword, count }));

  const jsonStr = JSON.stringify({ filename, keywords: sortedKeywords }, null, 2);

  return {
    success: true,
    outputFiles: [{
      name: `${getBaseName(filename)}_keywords.json`,
      data: Buffer.from(jsonStr, 'utf-8'),
      mimeType: 'application/json',
      extension: '.json',
      size: Buffer.byteLength(jsonStr, 'utf-8'),
    }],
    metadata: { totalKeywordsExtracted: sortedKeywords.length },
    duration: Date.now() - start,
  };
}

// ─── Sentiment Analysis ───────────────────────────────────────

export async function analyzeSentiment(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  const text = Buffer.from(data).toString('utf-8');

  processing?.onProgress?.(30, 'Analyzing text sentiment...');

  const positiveWords = new Set(['good', 'great', 'excellent', 'amazing', 'positive', 'success', 'successful', 'best', 'benefit', 'benefits', 'improved', 'love', 'perfect', 'gain']);
  const negativeWords = new Set(['bad', 'error', 'failed', 'failure', 'worst', 'issue', 'problem', 'negative', 'poor', 'slow', 'bug', 'wrong', 'defect', 'loss']);

  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let posCount = 0;
  let negCount = 0;

  for (const w of words) {
    if (positiveWords.has(w)) posCount++;
    if (negativeWords.has(w)) negCount++;
  }

  let sentiment = 'Neutral';
  if (posCount > negCount) sentiment = 'Positive';
  else if (negCount > posCount) sentiment = 'Negative';

  const resultData = {
    filename,
    sentiment,
    positiveWordCount: posCount,
    negativeWordCount: negCount,
    totalWords: words.length,
    score: (posCount - negCount) / (words.length || 1),
  };

  const jsonStr = JSON.stringify(resultData, null, 2);

  return {
    success: true,
    outputFiles: [{
      name: `${getBaseName(filename)}_sentiment.json`,
      data: Buffer.from(jsonStr, 'utf-8'),
      mimeType: 'application/json',
      extension: '.json',
      size: Buffer.byteLength(jsonStr, 'utf-8'),
    }],
    metadata: resultData,
    duration: Date.now() - start,
  };
}
