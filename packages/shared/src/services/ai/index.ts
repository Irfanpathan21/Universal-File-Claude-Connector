/**
 * AI & NLP Processing Service (Zero API Keys Required)
 *
 * Provides multi-format document extraction, extractive text summarization,
 * keyword extraction, and sentiment analysis.
 */

import type { ProcessingResult, ProcessingOptions } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

// ─── Stop Words for NLP Analysis ─────────────────────────────

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t',
  'doing', 'don\'t', 'down', 'during', 'each', 'even', 'few', 'for', 'from', 'further', 'had',
  'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'page', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t',
  'slide', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s',
  'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why',
  'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re',
  'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'table', 'figure', 'pptx', 'docx',
  'pdfpage', 'converted'
]);

// ─── Document Text Extraction ─────────────────────────────────

/**
 * Extract clean, readable plain text from various document formats
 * (PDF, Word DOCX, HTML, Markdown, JSON, Text).
 */
export async function extractDocumentText(
  data: Buffer | Uint8Array,
  filename: string = ''
): Promise<string> {
  const buf = Buffer.from(data);
  const ext = (filename.split('.').pop() || '').toLowerCase();

  // 1. PDF Document Parsing
  const isPdf =
    ext === 'pdf' ||
    (buf.length >= 4 &&
      buf[0] === 0x25 && // %
      buf[1] === 0x50 && // P
      buf[2] === 0x44 && // D
      buf[3] === 0x46);   // F

  if (isPdf) {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfResult = await pdfParse(buf);
      const text = (pdfResult.text || '').trim();

      const alnumCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
      if (alnumCount < 25) {
        throw new ValidationError(
          'No extractable text found in this PDF. If this document contains scanned images or photos of text, please use the "Image OCR Text Extractor" tool first.'
        );
      }
      return text;
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(
        `Unable to extract text from this PDF (${err?.message || 'Unreadable or image-only format'}). If this document is a scanned image, please use the "Image OCR Text Extractor" tool first.`
      );
    }
  }

  // 2. Word DOCX Document Parsing
  const isDocx =
    ext === 'docx' ||
    (buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04 &&
      ext !== 'zip');

  if (isDocx) {
    try {
      const mammoth = (await import('mammoth')).default;
      const docxResult = await mammoth.extractRawText({ buffer: buf });
      const text = (docxResult.value || '').trim();

      const alnumCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
      if (alnumCount < 25) {
        throw new ValidationError('No extractable text found in this Word document.');
      }
      return text;
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`Unable to extract text from Word document: ${err?.message || 'Invalid or unreadable DOCX'}`);
    }
  }

  // 3. HTML Document Parsing
  let rawText = buf.toString('utf-8');
  const isHtml =
    ext === 'html' ||
    ext === 'htm' ||
    /<!doctype\s+html/i.test(rawText.slice(0, 300)) ||
    /<html[\s>]/i.test(rawText.slice(0, 300));

  if (isHtml) {
    rawText = rawText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<(?:br|\/p|\/h[1-6]|\/li|\/div|hr)[\s/>]/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  // Sanitize non-printable control characters (excluding newline and tab)
  rawText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  if (!rawText.trim()) {
    throw new ValidationError('Input file contains no readable text content.');
  }

  return rawText;
}

// ─── Text Cleaning & Sentence Extraction ───────────────────────

function cleanDocumentText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove typical presentation slide headers/footers and conversion artifacts
    .replace(/[^\n]+\.pptx\s*-\s*(?:converted to pdf)?\s*(?:page)?\s*\d*(?:\s*of\s*\d+)?/gi, '')
    .replace(/(?:converted to pdf|page \d+ of \d+|slide \d+ of \d+|\.pptx\b)/gi, '')
    // Join hyphenated line breaks (e.g. imple-\nmentation -> implementation)
    .replace(/([a-zA-Z]{2,})-(?:\n\s*)([a-zA-Z]{2,})/g, '$1$2')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function extractSentences(text: string): string[] {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cleanUnits: string[] = [];

  for (const line of rawLines) {
    // Skip noise lines (slide headers, page markers, table borders)
    if (/^(page\s+\d+|\d+\s+of\s+\d+|slide\s+\d+|slide\s*\d+\s*of\s*\d+|project presentation)$/i.test(line)) continue;
    if (/^[-=_~*#|+.]{4,}$/.test(line)) continue;
    if (/^\d{1,3}$/.test(line)) continue; // standalone numbers like "01", "02"

    // Protect common abbreviations and decimals
    const protectedLine = line
      .replace(/\b(e\.g\.|i\.e\.|etc\.|vs\.|mr\.|mrs\.|ms\.|dr\.|prof\.|inc\.|ltd\.|co\.|univ\.|al\.)/gi, (m) => m.replace(/\./g, '@@DOT@@'))
      .replace(/(\d+)\.(\d+)/g, '$1@@DOT@@$2');

    // Split on sentence-ending punctuation inside line
    const sents = protectedLine.split(/(?<=[.!?])\s+(?=[A-Z0-9"'\u201C\u2018])/);
    for (let s of sents) {
      s = s.replace(/@@DOT@@/g, '.').replace(/\s+/g, ' ').trim();
      // Strip leading bullet markers or numbers
      s = s.replace(/^[•\-\*\u2022\d+\.\)]\s*/, '').trim();
      // Strip trailing pipes or symbols
      s = s.replace(/[|\s]+$/, '').trim();

      // Skip lines that look like raw table schemas or database columns (e.g. A | B | C | D)
      if ((s.match(/\|/g) || []).length >= 3) continue;

      if (s.length >= 25 && s.split(/\s+/).length >= 4) {
        if (!/[.!?]$/.test(s)) s += '.';
        cleanUnits.push(s);
      }
    }
  }

  return cleanUnits;
}

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

  processing?.onProgress?.(15, 'Extracting human-readable document text...');
  const rawText = await extractDocumentText(data, filename);

  processing?.onProgress?.(35, 'Cleaning and analyzing sentence structure...');
  const cleanedText = cleanDocumentText(rawText);
  const validSentences = extractSentences(cleanedText);

  if (validSentences.length === 0) {
    throw new ValidationError('Could not extract any meaningful sentences from this document.');
  }

  const maxSentences = Math.max(1, options.maxSentences || 5);
  const docTitle = getBaseName(filename)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  processing?.onProgress?.(60, 'Computing semantic relevance & scoring sentences...');

  // Tokenize words for frequency analysis
  const words = cleanedText.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freqMap: Record<string, number> = {};

  for (const w of words) {
    if (!STOP_WORDS.has(w)) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }
  }

  const maxFreq = Math.max(...Object.values(freqMap), 1);
  const titleWords = new Set(
    filename.toLowerCase().replace(/\.[^/.]+$/, '').match(/\b[a-z]{3,}\b/g) || []
  );

  // Score sentences using TF-IDF, position, and title affinity
  const scoredSentences = validSentences.map((sentence, index) => {
    const sentWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let score = 0;
    let titleMatches = 0;

    for (const w of sentWords) {
      if (freqMap[w]) {
        score += freqMap[w] / maxFreq;
      }
      if (titleWords.has(w)) {
        titleMatches++;
      }
    }

    // Square-root length normalization
    score = sentWords.length > 0 ? score / Math.sqrt(sentWords.length) : 0;

    // Position weighting (early sentences introduce core themes)
    if (index === 0) score *= 1.7;
    else if (index === 1) score *= 1.4;
    else if (index === 2) score *= 1.25;

    // Title affinity bonus
    score += titleMatches * 0.35;

    // Key indicator phrase bonus
    if (/(?:primary objective|key feature|in conclusion|centralized|architecture|demonstrates?|system helps|portal provides|designed to|developed to|management of|purpose:)/i.test(sentence)) {
      score *= 1.4;
    }

    return { sentence, index, score, sentWords };
  });

  // Sort candidate sentences by score descending
  scoredSentences.sort((a, b) => b.score - a.score);

  // Select top diverse sentences (avoid redundant ideas)
  const selected: typeof scoredSentences = [];
  const selectedWordSets: Set<string>[] = [];

  for (const item of scoredSentences) {
    if (selected.length >= maxSentences + 1) break;
    const itemWords = new Set(item.sentWords);

    let tooSimilar = false;
    for (const existingSet of selectedWordSets) {
      let intersection = 0;
      for (const w of itemWords) {
        if (existingSet.has(w)) intersection++;
      }
      const similarity = intersection / Math.max(itemWords.size, 1);
      if (similarity > 0.5) {
        tooSimilar = true;
        break;
      }
    }

    if (!tooSimilar) {
      selected.push(item);
      selectedWordSets.push(itemWords);
    }
  }

  // Restore chronological reading order
  selected.sort((a, b) => a.index - b.index);

  processing?.onProgress?.(85, 'Formatting structured executive summary...');

  // Designate Executive Overview vs Key Highlights
  let overview = '';
  let highlights: string[] = [];

  if (selected.length <= 2) {
    overview = selected[0]?.sentence || '';
    highlights = selected.map(s => s.sentence);
  } else {
    // Select the best informative sentence (length >= 40) as the Executive Overview
    const bestOverviewIdx = selected.findIndex(
      s => s.sentence.length >= 40 && !s.sentence.toLowerCase().startsWith(docTitle.toLowerCase())
    );
    if (bestOverviewIdx !== -1) {
      overview = selected[bestOverviewIdx].sentence;
      const remaining = selected.filter((_, idx) => idx !== bestOverviewIdx);
      highlights = remaining.slice(0, maxSentences).map(s => s.sentence);
    } else {
      overview = selected[0].sentence;
      highlights = selected.slice(1, maxSentences + 1).map(s => s.sentence);
    }
  }

  const originalWordCount = words.length;
  const summarySentencesCombined = [overview, ...highlights].join(' ');
  const summaryWordCount = (summarySentencesCombined.match(/\b[a-z0-9'-]+\b/gi) || []).length;
  const reductionRatio = Math.max(0, Math.min(99, Math.round((1 - summaryWordCount / (originalWordCount || 1)) * 100)));

  // Build Structured Executive Summary Output
  const reportLines = [
    '='.repeat(80),
    `AI DOCUMENT SUMMARY: ${docTitle.toUpperCase()}`,
    '='.repeat(80),
    '',
    'EXECUTIVE OVERVIEW',
    '-'.repeat(80),
    overview,
    '',
    'KEY HIGHLIGHTS & TAKEAWAYS',
    '-'.repeat(80),
    ...highlights.map(h => `• ${h}`),
    '',
    'DOCUMENT METRICS',
    '-'.repeat(80),
    `• Source Document: ${filename}`,
    `• Original Length: ${originalWordCount.toLocaleString()} words (${validSentences.length} sentences)`,
    `• Summary Length:  ${summaryWordCount.toLocaleString()} words (${highlights.length + (overview ? 1 : 0)} key points)`,
    `• Compression:     ${reductionRatio}% text reduction`,
    '='.repeat(80),
  ];

  const formattedSummary = reportLines.join('\n');

  processing?.onProgress?.(100, 'Summary complete!');

  return {
    success: true,
    outputFiles: [{
      name: `${getBaseName(filename)}_summary.txt`,
      data: Buffer.from(formattedSummary, 'utf-8'),
      mimeType: 'text/plain',
      extension: '.txt',
      size: Buffer.byteLength(formattedSummary, 'utf-8'),
    }],
    metadata: {
      originalSentences: validSentences.length,
      summarySentences: highlights.length + (overview ? 1 : 0),
      originalWords: originalWordCount,
      summaryWords: summaryWordCount,
      compressionRatio: `${reductionRatio}%`,
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

  processing?.onProgress?.(20, 'Extracting document text for keyword analysis...');
  const rawText = await extractDocumentText(data, filename);
  const text = cleanDocumentText(rawText);

  processing?.onProgress?.(50, 'Extracting keywords and calculating frequencies...');
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];

  const freqMap: Record<string, number> = {};
  for (const w of words) {
    if (!STOP_WORDS.has(w)) {
      freqMap[w] = (freqMap[w] || 0) + 1;
    }
  }

  const sortedKeywords = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([keyword, count]) => ({ keyword, count }));

  const jsonStr = JSON.stringify({
    filename,
    totalKeywords: sortedKeywords.length,
    keywords: sortedKeywords,
  }, null, 2);

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

  processing?.onProgress?.(20, 'Extracting document text for sentiment analysis...');
  const rawText = await extractDocumentText(data, filename);
  const text = cleanDocumentText(rawText);

  processing?.onProgress?.(50, 'Analyzing emotional tone and polarity...');

  const positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'positive', 'success', 'successful', 'best',
    'benefit', 'benefits', 'improved', 'love', 'perfect', 'gain', 'fast', 'secure', 'reliable',
    'easy', 'effective', 'efficient', 'helpful', 'high', 'innovative', 'solution', 'advantage',
    'outstanding', 'superior', 'valuable', 'exceptional'
  ]);
  const negativeWords = new Set([
    'bad', 'error', 'failed', 'failure', 'worst', 'issue', 'problem', 'negative', 'poor',
    'slow', 'bug', 'wrong', 'defect', 'loss', 'vulnerability', 'difficult', 'hard', 'broken',
    'damage', 'delay', 'danger', 'risk', 'warning', 'severe', 'critical', 'flaw', 'harm'
  ]);

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
    score: Number(((posCount - negCount) / (words.length || 1)).toFixed(4)),
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

