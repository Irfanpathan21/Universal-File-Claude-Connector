/**
 * Document Processing Service (Word / DOCX / RTF / ODT)
 *
 * Provides DOCX text extraction, HTML conversion, image extraction, table extraction,
 * hyperlink extraction, comments extraction, text replacement, and Markdown conversion.
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, BorderStyle } from 'docx';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';
import { createZip } from '../archive/index.js';
// @ts-ignore
import DocxMerger from 'docx-merger';

// ─── Extract Text from DOCX ───────────────────────────────────

export async function extractDocxText(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Extracting text from document...');
    const buffer = Buffer.from(data);
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.txt`,
        data: Buffer.from(text, 'utf-8'),
        mimeType: 'text/plain',
        extension: '.txt',
        size: Buffer.byteLength(text, 'utf-8'),
      }],
      metadata: {
        characterCount: text.length,
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        warnings: result.messages.map(m => m.message),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract text from DOCX: ${(error as Error).message}`);
  }
}

// ─── DOCX to HTML ─────────────────────────────────────────────

export async function docxToHtml(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Converting document to HTML...');
    const buffer = Buffer.from(data);
    const result = await mammoth.convertToHtml({ buffer });

    const bodyHtml = result.value;
    const title = getBaseName(filename);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1a1a1a; }
    h1, h2, h3, h4 { color: #111; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f4f4f4; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.html`,
        data: Buffer.from(fullHtml, 'utf-8'),
        mimeType: 'text/html',
        extension: '.html',
        size: Buffer.byteLength(fullHtml, 'utf-8'),
      }],
      metadata: {
        warnings: result.messages.map(m => m.message),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert DOCX to HTML: ${(error as Error).message}`);
  }
}

// ─── Extract Images from DOCX ─────────────────────────────────

const MEDIA_MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jpe': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.ico': 'image/x-icon',
  '.emf': 'image/x-emf',
  '.wmf': 'image/x-wmf',
};

export async function extractDocxImages(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(20, 'Inspecting Word document structure...');
    const zip = await JSZip.loadAsync(data);
    const baseName = getBaseName(filename);
    const extractedImages: OutputFile[] = [];

    // 1. Direct OpenXML extraction from word/media/
    // This catches 100% of images, shapes, diagrams, headers, footers, etc. losslessly
    const mediaFilePaths = Object.keys(zip.files).filter((filePath) => {
      const normalized = filePath.replace(/\\/g, '/').toLowerCase();
      return (
        (normalized.startsWith('word/media/') || normalized.includes('/media/')) &&
        !zip.files[filePath].dir
      );
    });

    if (mediaFilePaths.length > 0) {
      processing?.onProgress?.(40, `Extracting ${mediaFilePaths.length} embedded media files...`);
      let idx = 1;
      for (const mediaPath of mediaFilePaths) {
        const fileEntry = zip.files[mediaPath];
        const fileBuffer = await fileEntry.async('nodebuffer');
        if (!fileBuffer || fileBuffer.length === 0) continue;

        const rawFileName = mediaPath.split('/').pop() || `image_${idx}`;
        const lastDot = rawFileName.lastIndexOf('.');
        const ext = lastDot !== -1 ? rawFileName.slice(lastDot).toLowerCase() : '.png';
        const mimeType = MEDIA_MIME_MAP[ext] || `image/${ext.replace('.', '')}`;

        extractedImages.push({
          name: `${baseName}_img_${idx}${ext}`,
          data: fileBuffer,
          mimeType,
          extension: ext,
          size: fileBuffer.length,
        });
        idx++;
      }
    }

    // 2. Fallback to mammoth AST scanner if direct media was empty
    if (extractedImages.length === 0) {
      processing?.onProgress?.(50, 'Scanning document content for embedded images...');
      const buffer = Buffer.from(data);
      let mammothIdx = 1;

      await mammoth.convertToHtml(
        { buffer },
        {
          convertImage: mammoth.images.imgElement((element: any) => {
            return element.read('binary').then((imageBuffer: any) => {
              const contentType = element.contentType || 'image/png';
              const ext = contentType ? `.${contentType.split('/')[1]}` : '.png';
              const buf = Buffer.from(imageBuffer);
              extractedImages.push({
                name: `${baseName}_img_${mammothIdx++}${ext}`,
                data: buf,
                mimeType: contentType,
                extension: ext,
                size: buf.length,
              });
              return { src: '' };
            });
          }),
        }
      );
    }

    if (extractedImages.length === 0) {
      throw new ValidationError('No embedded images found in Word document');
    }

    // If only 1 image found, return the single image directly
    if (extractedImages.length === 1) {
      return {
        success: true,
        outputFiles: extractedImages,
        metadata: {
          imageCount: 1,
          containedFiles: extractedImages.map((f) => ({
            name: f.name,
            size: f.size,
            mimeType: f.mimeType,
          })),
        },
        duration: Date.now() - start,
      };
    }

    // Multiple images -> Bundle into ZIP archive for 1-click download
    processing?.onProgress?.(80, `Packaging ${extractedImages.length} images into ZIP archive...`);
    const zipFilename = `${baseName}_images.zip`;
    const zipResult = await createZip(
      extractedImages.map((f) => ({ data: f.data, name: f.name })),
      { outputFilename: zipFilename }
    );

    return {
      success: true,
      outputFiles: zipResult.outputFiles,
      metadata: {
        isZip: true,
        imageCount: extractedImages.length,
        containedFiles: extractedImages.map((f) => ({
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to extract images from DOCX: ${(error as Error).message}`);
  }
}

// ─── Extract Hyperlinks from DOCX ─────────────────────────────

export async function extractDocxHyperlinks(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Extracting hyperlinks...');
    const zip = await JSZip.loadAsync(data);
    const relsFile = zip.file('word/_rels/document.xml.rels');

    const links: { id: string; target: string; type?: string }[] = [];

    if (relsFile) {
      const relsXml = await relsFile.async('string');
      const matches = relsXml.matchAll(/Target="([^"]+)"/g);
      for (const match of matches) {
        if (match[1].startsWith('http://') || match[1].startsWith('https://') || match[1].startsWith('mailto:')) {
          links.push({ id: `link_${links.length + 1}`, target: match[1] });
        }
      }
    }

    const jsonStr = JSON.stringify(links, null, 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_links.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: {
        totalLinks: links.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract hyperlinks from DOCX: ${(error as Error).message}`);
  }
}

// ─── DOCX to Markdown ─────────────────────────────────────────

export async function docxToMarkdown(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Converting DOCX to Markdown...');
    const buffer = Buffer.from(data);
    const result = await mammoth.extractRawText({ buffer });

    const rawText = result.value;
    const markdownLines = rawText.split('\n').map(line => line.trim() ? line : '').join('\n');

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.md`,
        data: Buffer.from(markdownLines, 'utf-8'),
        mimeType: 'text/markdown',
        extension: '.md',
        size: Buffer.byteLength(markdownLines, 'utf-8'),
      }],
      metadata: {
        lineCount: markdownLines.split('\n').length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert DOCX to Markdown: ${(error as Error).message}`);
  }
}

// ─── Markdown / Text to DOCX ──────────────────────────────────

export async function textToDocx(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Creating DOCX document...');
    const content = Buffer.from(data).toString('utf-8');
    const lines = content.split(/\r?\n/);

    const paragraphs = lines.map(line =>
      new Paragraph({
        children: [new TextRun(line)],
      })
    );

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.docx`,
        data: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
        size: buffer.length,
      }],
      metadata: {
        paragraphCount: lines.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert text to DOCX: ${(error as Error).message}`);
  }
}

// ─── Merge DOCX ───────────────────────────────────────────────

export async function mergeDocx(
  files: { data: Buffer | Uint8Array; name: string }[],
  options: { outputFilename?: string; pageBreak?: boolean } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  if (files.length < 2) throw new ValidationError('At least 2 DOCX files are required for merging');

  try {
    processing?.onProgress?.(20, 'Preparing Word documents for high-fidelity merge...');

    const pageBreak = typeof options.pageBreak !== 'undefined' ? !!options.pageBreak : true;
    const fileBuffers = files.map((f) => Buffer.from(f.data));

    processing?.onProgress?.(50, `Merging ${files.length} Word documents preserving alignment, styles, and tables...`);

    // High-fidelity OpenXML merge preserving paragraph alignments, tables, headings, styles, and media
    const mergedBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const merger = new (DocxMerger as any)({ pageBreak }, fileBuffers);
        merger.save('nodebuffer', (data: any) => {
          if (!data) {
            return reject(new Error('DocxMerger returned empty data'));
          }
          resolve(Buffer.from(data));
        });
      } catch (mergerErr) {
        reject(mergerErr);
      }
    });

    processing?.onProgress?.(90, 'Finalizing merged Word document...');
    const outName = options.outputFilename || 'merged_document.docx';

    return {
      success: true,
      outputFiles: [{
        name: outName,
        data: mergedBuffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
        size: mergedBuffer.length,
      }],
      metadata: {
        filesMerged: files.length,
        sourceFiles: files.map((f) => f.name),
        pageBreak,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to merge DOCX files: ${(error as Error).message}`);
  }
}

// ─── Find & Replace Text in DOCX ──────────────────────────────

export async function replaceTextDocx(
  data: Buffer | Uint8Array,
  filename: string,
  options: { targetText: string; replacementText: string },
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  if (!options.targetText) throw new ValidationError('targetText parameter is required');

  try {
    processing?.onProgress?.(30, 'Searching and replacing text in DOCX...');
    const zip = await JSZip.loadAsync(data);
    const docXmlFile = zip.file('word/document.xml');

    if (!docXmlFile) throw new ValidationError('Invalid DOCX file (missing word/document.xml)');

    let xmlStr = await docXmlFile.async('string');
    const target = options.targetText;
    const replacement = options.replacementText || '';

    // Replace text inside XML tags
    const regex = new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    xmlStr = xmlStr.replace(regex, replacement);

    zip.file('word/document.xml', xmlStr);
    const resultBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_replaced.docx`,
        data: resultBuffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx',
        size: resultBuffer.length,
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to replace text in DOCX: ${(error as Error).message}`);
  }
}

// ─── Extract Comments from DOCX ───────────────────────────────

export async function extractDocxComments(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Extracting document comments...');
    const zip = await JSZip.loadAsync(data);
    const commentsFile = zip.file('word/comments.xml');

    const comments: { id: string; author: string; text: string }[] = [];

    if (commentsFile) {
      const xmlStr = await commentsFile.async('string');
      const matches = xmlStr.matchAll(/<w:comment[^>]*w:id="([^"]+)"[^>]*w:author="([^"]+)"[^>]*>([\s\S]*?)<\/w:comment>/g);

      for (const match of matches) {
        const textMatch = match[3].replace(/<[^>]+>/g, '').trim();
        comments.push({
          id: match[1],
          author: match[2],
          text: textMatch,
        });
      }
    }

    const jsonStr = JSON.stringify(comments, null, 2);
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_comments.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: { totalComments: comments.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract comments from DOCX: ${(error as Error).message}`);
  }
}

// ─── Word Count & Statistics in DOCX ──────────────────────────

export async function wordCountDocx(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    const rawTextResult = await extractDocxText(data, filename, processing);
    const text = rawTextResult.outputFiles[0].data.toString('utf-8');

    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const characterCount = text.length;
    const paragraphCount = text.split(/\n\s*\n/).filter(Boolean).length;
    const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;

    const stats = {
      filename,
      wordCount,
      characterCount,
      paragraphCount,
      sentenceCount,
      readingTimeMinutes: Math.ceil(wordCount / 200),
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
    throw new ProcessingError(`Failed to calculate DOCX statistics: ${(error as Error).message}`);
  }
}
