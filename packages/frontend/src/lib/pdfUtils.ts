/**
 * PDF Client Utilities
 * Accurately detects real PDF page counts and page metadata directly in the browser using pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';

/**
 * Get the exact real page count of a PDF file.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  if (!file || (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')) {
    return 1;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    return count > 0 ? count : 1;
  } catch (err) {
    console.warn(`Could not parse page count with pdf-lib for ${file.name}, trying stream fallback:`, err);
    try {
      // Fallback: fast regex scan on binary buffer for /Count
      const arrayBuffer = await file.arrayBuffer();
      const text = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer.slice(0, 100000)));
      const countMatch = text.match(/\/Count\s+(\d+)/);
      if (countMatch && countMatch[1]) {
        const count = parseInt(countMatch[1], 10);
        if (count > 0) return count;
      }
    } catch {
      // Fallback default
    }
    return 1;
  }
}

/**
 * Get page counts for a list of files.
 */
export async function getFilesPdfPageCounts(files: File[]): Promise<{ fileIndex: number; fileName: string; pageCount: number }[]> {
  const results = await Promise.all(
    files.map(async (file, fileIndex) => {
      const pageCount = await getPdfPageCount(file);
      return { fileIndex, fileName: file.name, pageCount };
    })
  );
  return results;
}
