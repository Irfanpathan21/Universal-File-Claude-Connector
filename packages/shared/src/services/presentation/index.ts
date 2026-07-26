/**
 * Presentation Processing Service (PowerPoint PPTX / ODP)
 *
 * Provides slide text extraction, speaker notes extraction, image extraction, and HTML conversion.
 */

import JSZip from 'jszip';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

// ─── Extract Slide Text from PPTX ─────────────────────────────

export async function extractPptxText(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading PowerPoint presentation...');
    const zip = await JSZip.loadAsync(data);
    const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));

    // Sort slides numerically
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
      return numA - numB;
    });

    if (slideFiles.length === 0) {
      throw new ValidationError('No slides found in PowerPoint presentation');
    }

    const slideTexts: string[] = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.files[slideFiles[i]].async('string');
      // Extract text inside <a:t> tags
      const textMatches = xml.matchAll(/<a:t>([^<]+)<\/a:t>/g);
      const textRuns = Array.from(textMatches, m => m[1]);
      const slideText = textRuns.join(' ');
      slideTexts.push(`--- Slide ${i + 1} ---\n${slideText}`);
    }

    const fullText = slideTexts.join('\n\n');

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_slides.txt`,
        data: Buffer.from(fullText, 'utf-8'),
        mimeType: 'text/plain',
        extension: '.txt',
        size: Buffer.byteLength(fullText, 'utf-8'),
      }],
      metadata: {
        slideCount: slideFiles.length,
        characterCount: fullText.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to extract text from PPTX: ${(error as Error).message}`);
  }
}

// ─── Extract Speaker Notes from PPTX ──────────────────────────

export async function extractPptxNotes(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Reading speaker notes...');
    const zip = await JSZip.loadAsync(data);
    const notesFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/notesSlides\/notesSlide\d+\.xml$/));

    notesFiles.sort((a, b) => {
      const numA = parseInt(a.match(/notesSlide(\d+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/notesSlide(\d+)\.xml/)?.[1] || '0');
      return numA - numB;
    });

    const notesTexts: string[] = [];

    for (let i = 0; i < notesFiles.length; i++) {
      const xml = await zip.files[notesFiles[i]].async('string');
      const textMatches = xml.matchAll(/<a:t>([^<]+)<\/a:t>/g);
      const textRuns = Array.from(textMatches, m => m[1]);
      const noteText = textRuns.join(' ');
      if (noteText.trim()) {
        notesTexts.push(`--- Slide ${i + 1} Notes ---\n${noteText}`);
      }
    }

    const fullNotes = notesTexts.join('\n\n') || 'No speaker notes found in presentation.';

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_notes.txt`,
        data: Buffer.from(fullNotes, 'utf-8'),
        mimeType: 'text/plain',
        extension: '.txt',
        size: Buffer.byteLength(fullNotes, 'utf-8'),
      }],
      metadata: {
        notesExtracted: notesTexts.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to extract speaker notes from PPTX: ${(error as Error).message}`);
  }
}

// ─── Extract Images from PPTX ─────────────────────────────────

export async function extractPptxImages(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Extracting images from PPTX...');
    const zip = await JSZip.loadAsync(data);
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/'));

    if (mediaFiles.length === 0) {
      throw new ValidationError('No embedded media/images found in presentation');
    }

    const outputFiles: OutputFile[] = [];

    for (const mediaPath of mediaFiles) {
      const mediaBuffer = await zip.files[mediaPath].async('nodebuffer');
      const mediaName = mediaPath.split('/').pop() || 'image.png';
      const ext = mediaName.includes('.') ? `.${mediaName.split('.').pop()}` : '.png';

      outputFiles.push({
        name: `${getBaseName(filename)}_${mediaName}`,
        data: mediaBuffer,
        mimeType: ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream',
        extension: ext,
        size: mediaBuffer.length,
      });
    }

    return {
      success: true,
      outputFiles,
      metadata: {
        imagesExtracted: outputFiles.length,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to extract images from PPTX: ${(error as Error).message}`);
  }
}

// ─── PPTX to HTML Presentation ────────────────────────────────

export async function pptxToHtml(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Converting PowerPoint to HTML deck...');
    const zip = await JSZip.loadAsync(data);
    const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));

    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
      return numA - numB;
    });

    let slidesHtml = '';
    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.files[slideFiles[i]].async('string');
      const textMatches = xml.matchAll(/<a:t>([^<]+)<\/a:t>/g);
      const textRuns = Array.from(textMatches, m => m[1]);
      const content = textRuns.map(t => `<p>${t}</p>`).join('\n');

      slidesHtml += `
      <section class="slide" id="slide-${i + 1}">
        <div class="slide-header">Slide ${i + 1} of ${slideFiles.length}</div>
        <div class="slide-body">
          ${content || '<p><em>Empty Slide</em></p>'}
        </div>
      </section>\n`;
    }

    const title = getBaseName(filename);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    .slide { background: #1e293b; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #334155; min-height: 250px; }
    .slide-header { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; font-weight: 600; margin-bottom: 1rem; }
    .slide-body p { font-size: 1.125rem; line-height: 1.6; margin: 0.5rem 0; color: #e2e8f0; }
  </style>
</head>
<body>
  <h1 style="text-align:center;margin-bottom:2rem;color:#f8fafc;">${title}</h1>
  ${slidesHtml}
</body>
</html>`;

    return {
      success: true,
      outputFiles: [{
        name: `${title}.html`,
        data: Buffer.from(fullHtml, 'utf-8'),
        mimeType: 'text/html',
        extension: '.html',
        size: Buffer.byteLength(fullHtml, 'utf-8'),
      }],
      metadata: { slideCount: slideFiles.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert PPTX to HTML: ${(error as Error).message}`);
  }
}

// ─── PPTX Metadata ────────────────────────────────────────────

export async function readPptxMetadata(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(30, 'Reading presentation metadata...');
    const zip = await JSZip.loadAsync(data);
    const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/'));
    const notesFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/notesSlides\/notesSlide\d+\.xml$/));

    const meta = {
      filename,
      slideCount: slideFiles.length,
      mediaCount: mediaFiles.length,
      speakerNotesCount: notesFiles.length,
    };

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_meta.json`,
        data: Buffer.from(JSON.stringify(meta, null, 2), 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(JSON.stringify(meta), 'utf-8'),
      }],
      metadata: meta,
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to read PPTX metadata: ${(error as Error).message}`);
  }
}
