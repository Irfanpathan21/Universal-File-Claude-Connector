/**
 * Presentation Processing Service (PowerPoint PPTX / ODP)
 *
 * Provides slide text extraction, speaker notes extraction, image extraction, and HTML conversion.
 */

import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName } from '../../utils/index.js';

const execFileAsync = promisify(execFile);

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
    processing?.onProgress?.(20, 'Inspecting PowerPoint presentation media...');
    const zip = await JSZip.loadAsync(data);
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/media/'));

    // Sort media files numerically if named image1, image2, etc.
    mediaFiles.sort((a, b) => {
      const numA = parseInt(a.match(/image(\d+)/i)?.[1] || '0', 10);
      const numB = parseInt(b.match(/image(\d+)/i)?.[1] || '0', 10);
      return numA - numB;
    });

    if (mediaFiles.length === 0) {
      throw new ValidationError('No embedded media/images found in presentation');
    }

    const baseName = getBaseName(filename);
    const outZip = new JSZip();
    const containedFiles: { name: string; size: number; mimeType: string }[] = [];

    processing?.onProgress?.(40, `Extracting ${mediaFiles.length} embedded images...`);

    let idx = 1;
    for (const mediaPath of mediaFiles) {
      const mediaBuffer = await zip.files[mediaPath].async('nodebuffer');
      if (!mediaBuffer || mediaBuffer.length === 0) continue;

      const rawMediaName = mediaPath.split('/').pop() || `image_${idx}.png`;
      const dotIndex = rawMediaName.lastIndexOf('.');
      const ext = dotIndex !== -1 ? rawMediaName.slice(dotIndex).toLowerCase() : '.png';
      const cleanImgName = `${baseName}_${rawMediaName}`;

      const mimeType = ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.gif'
        ? 'image/gif'
        : ext === '.webp'
        ? 'image/webp'
        : ext === '.svg'
        ? 'image/svg+xml'
        : 'application/octet-stream';

      outZip.file(cleanImgName, mediaBuffer);
      containedFiles.push({
        name: cleanImgName,
        size: mediaBuffer.length,
        mimeType,
      });
      idx++;
    }

    if (containedFiles.length === 0) {
      throw new ValidationError('No valid images could be extracted from presentation');
    }

    processing?.onProgress?.(80, `Packaging ${containedFiles.length} images into ZIP folder...`);

    const zipBuffer = await outZip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFilename = `${baseName}_images.zip`;

    return {
      success: true,
      outputFiles: [{
        name: zipFilename,
        data: zipBuffer,
        mimeType: 'application/zip',
        extension: '.zip',
        size: zipBuffer.length,
      }],
      metadata: {
        isZip: true,
        imageCount: containedFiles.length,
        imagesExtracted: containedFiles.length,
        containedFiles,
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

// ─── High-Fidelity PPTX to PDF Presentation Engine ────────────

async function convertPptxViaPowerPointCom(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<Buffer | null> {
  if (process.platform !== 'win32') return null;

  const tempDir = os.tmpdir();
  const safeBase = getBaseName(filename).replace(/[^a-zA-Z0-9_-]/g, '_');
  const tempInput = path.join(tempDir, `ppt_in_${Date.now()}_${safeBase}.pptx`);
  const tempOutput = path.join(tempDir, `ppt_out_${Date.now()}_${safeBase}.pdf`);

  try {
    processing?.onProgress?.(30, 'Saving presentation for PowerPoint conversion...');
    await writeFile(tempInput, data);

    processing?.onProgress?.(50, 'Converting slides with Microsoft PowerPoint engine...');
    const psScript = `
$ErrorActionPreference = "Stop"
$fullInput = [System.IO.Path]::GetFullPath("${tempInput.replace(/\\/g, '\\\\')}")
$fullOutput = [System.IO.Path]::GetFullPath("${tempOutput.replace(/\\/g, '\\\\')}")

$ppt = $null
$presentation = $null
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $presentation = $ppt.Presentations.Open($fullInput, -1, 0, 0)
    $presentation.SaveAs($fullOutput, 32)
    $presentation.Close()
    $presentation = $null
    if (Test-Path $fullOutput) {
        exit 0
    } else {
        exit 2
    }
} catch {
    Write-Error $_.Exception.Message
    exit 3
} finally {
    if ($presentation) {
        try { $presentation.Close() } catch {}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
    }
    if ($ppt) {
        try { $ppt.Quit() } catch {}
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
`;

    await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      timeout: 60000,
    });

    if (existsSync(tempOutput)) {
      processing?.onProgress?.(85, 'Reading converted PDF document...');
      const pdfBuffer = await readFile(tempOutput);
      return pdfBuffer;
    }
    return null;
  } catch (err: any) {
    console.warn('[pptxToPdf] PowerPoint COM conversion warning:', err?.message);
    return null;
  } finally {
    try { if (existsSync(tempInput)) await unlink(tempInput); } catch {}
    try { if (existsSync(tempOutput)) await unlink(tempOutput); } catch {}
  }
}

async function convertPptxViaLibreOffice(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<Buffer | null> {
  const tempDir = os.tmpdir();
  const safeBase = getBaseName(filename).replace(/[^a-zA-Z0-9_-]/g, '_');
  const tempInput = path.join(tempDir, `ppt_lo_in_${Date.now()}_${safeBase}.pptx`);
  const expectedOutput = path.join(tempDir, `ppt_lo_in_${Date.now()}_${safeBase}.pdf`);

  const binaries = [
    'soffice',
    'libreoffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ];

  try {
    await writeFile(tempInput, data);

    for (const bin of binaries) {
      try {
        processing?.onProgress?.(50, 'Converting with LibreOffice engine...');
        await execFileAsync(bin, ['--headless', '--convert-to', 'pdf', '--outdir', tempDir, tempInput], {
          timeout: 45000,
        });
        if (existsSync(expectedOutput)) {
          const pdfBuffer = await readFile(expectedOutput);
          return pdfBuffer;
        }
      } catch {
        // Try next binary
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    try { if (existsSync(tempInput)) await unlink(tempInput); } catch {}
    try { if (existsSync(expectedOutput)) await unlink(expectedOutput); } catch {}
  }
}

function sanitizePdfText(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[^\x20-\x7E\t\n\r]/g, ' ')
    .trim();
}

async function renderPptxWithPdfLib(
  data: Buffer | Uint8Array,
  filename: string,
  processing: ProcessingOptions | undefined,
  start: number
): Promise<ProcessingResult> {
  const zip = await JSZip.loadAsync(data);
  const slideFiles = Object.keys(zip.files).filter(f => f.match(/^ppt\/slides\/slide\d+\.xml$/));

  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
    const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
    return numA - numB;
  });

  if (slideFiles.length === 0) {
    throw new ValidationError('No slides found in PowerPoint presentation');
  }

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const slideWidth = 960;
  const slideHeight = 540;

  for (let i = 0; i < slideFiles.length; i++) {
    const page = pdfDoc.addPage([slideWidth, slideHeight]);
    const slideXml = await zip.files[slideFiles[i]].async('string');

    page.drawRectangle({
      x: 0,
      y: 0,
      width: slideWidth,
      height: slideHeight,
      color: rgb(0.98, 0.98, 1.0),
    });

    page.drawRectangle({
      x: 0,
      y: slideHeight - 8,
      width: slideWidth,
      height: 8,
      color: rgb(0.867, 0.420, 0.125),
    });

    page.drawRectangle({
      x: 40,
      y: slideHeight - 42,
      width: 130,
      height: 24,
      color: rgb(0.95, 0.90, 0.85),
      borderColor: rgb(0.867, 0.420, 0.125),
      borderWidth: 1,
    });
    page.drawText(`SLIDE ${i + 1} OF ${slideFiles.length}`, {
      x: 52,
      y: slideHeight - 35,
      size: 10,
      font: fontBold,
      color: rgb(0.75, 0.32, 0.08),
    });

    const paragraphs = Array.from(slideXml.matchAll(/<a:p[\s>](.*?)<\/a:p>/gs), m => {
      const runs = Array.from(m[1].matchAll(/<a:t>([^<]+)<\/a:t>/g), rm => rm[1]);
      return sanitizePdfText(runs.join(' '));
    }).filter(t => t.length > 0);

    const rawTitle = paragraphs[0] || `Slide ${i + 1}`;
    const title = rawTitle.length > 70 ? rawTitle.slice(0, 67) + '...' : rawTitle;
    const bodyParagraphs = paragraphs.slice(1);

    page.drawText(title, {
      x: 40,
      y: slideHeight - 85,
      size: 24,
      font: fontBold,
      color: rgb(0.12, 0.14, 0.18),
    });

    page.drawLine({
      start: { x: 40, y: slideHeight - 98 },
      end: { x: slideWidth - 40, y: slideHeight - 98 },
      thickness: 1.5,
      color: rgb(0.88, 0.89, 0.93),
    });

    let yPos = slideHeight - 130;
    const maxContentWidth = 860;

    for (let pIdx = 0; pIdx < bodyParagraphs.length; pIdx++) {
      if (yPos < 60) break;
      const pText = bodyParagraphs[pIdx];

      page.drawCircle({
        x: 48,
        y: yPos + 4,
        size: 3,
        color: rgb(0.867, 0.420, 0.125),
      });

      const words = pText.split(/\s+/);
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = fontRegular.widthOfTextAtSize(testLine, 13);
        if (textWidth > maxContentWidth - 30 && currentLine) {
          page.drawText(currentLine, {
            x: 60,
            y: yPos,
            size: 13,
            font: fontRegular,
            color: rgb(0.20, 0.23, 0.28),
          });
          yPos -= 20;
          currentLine = word;
          if (yPos < 60) break;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine && yPos >= 60) {
        page.drawText(currentLine, {
          x: 60,
          y: yPos,
          size: 13,
          font: fontRegular,
          color: rgb(0.20, 0.23, 0.28),
        });
        yPos -= 26;
      }
    }

    page.drawLine({
      start: { x: 40, y: 35 },
      end: { x: slideWidth - 40, y: 35 },
      thickness: 1,
      color: rgb(0.90, 0.91, 0.94),
    });

    page.drawText(`${filename} - Converted to PDF`, {
      x: 40,
      y: 20,
      size: 9,
      font: fontRegular,
      color: rgb(0.45, 0.48, 0.55),
    });

    page.drawText(`Page ${i + 1} of ${slideFiles.length}`, {
      x: slideWidth - 110,
      y: 20,
      size: 9,
      font: fontBold,
      color: rgb(0.45, 0.48, 0.55),
    });
  }

  processing?.onProgress?.(90, 'Finalizing PDF document...');
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
    metadata: {
      slideCount: slideFiles.length,
      pageCount: slideFiles.length,
    },
    duration: Date.now() - start,
  };
}

export async function pptxToPdf(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();
  try {
    processing?.onProgress?.(15, 'Preparing presentation for high-fidelity conversion...');

    // Strategy 1: High-Fidelity Microsoft PowerPoint Native COM Engine (100% exact design, layouts, vectors, graphics)
    const comPdfBuffer = await convertPptxViaPowerPointCom(data, filename, processing);
    if (comPdfBuffer && comPdfBuffer.length > 0) {
      processing?.onProgress?.(95, 'Finalizing PDF output...');
      let pageCount = 1;
      try {
        const loadedDoc = await PDFDocument.load(comPdfBuffer);
        pageCount = loadedDoc.getPageCount();
      } catch {}

      return {
        success: true,
        outputFiles: [{
          name: `${getBaseName(filename)}.pdf`,
          data: comPdfBuffer,
          mimeType: 'application/pdf',
          extension: '.pdf',
          size: comPdfBuffer.length,
        }],
        metadata: {
          engine: 'Microsoft PowerPoint Native Engine',
          fidelity: '100% Exact Presentation Layout & Graphics',
          pageCount,
          slideCount: pageCount,
        },
        duration: Date.now() - start,
      };
    }

    // Strategy 2: LibreOffice Headless CLI
    const loPdfBuffer = await convertPptxViaLibreOffice(data, filename, processing);
    if (loPdfBuffer && loPdfBuffer.length > 0) {
      let pageCount = 1;
      try {
        const loadedDoc = await PDFDocument.load(loPdfBuffer);
        pageCount = loadedDoc.getPageCount();
      } catch {}

      return {
        success: true,
        outputFiles: [{
          name: `${getBaseName(filename)}.pdf`,
          data: loPdfBuffer,
          mimeType: 'application/pdf',
          extension: '.pdf',
          size: loPdfBuffer.length,
        }],
        metadata: {
          engine: 'LibreOffice Headless Engine',
          pageCount,
          slideCount: pageCount,
        },
        duration: Date.now() - start,
      };
    }

    // Strategy 3: Pure JavaScript fallback renderer (pdf-lib + jszip)
    processing?.onProgress?.(40, 'Rendering presentation slides with fallback engine...');
    return await renderPptxWithPdfLib(data, filename, processing, start);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert PPTX to PDF: ${(error as Error).message}`);
  }
}

