/**
 * Utility Service
 *
 * Provides file hashing (MD5, SHA1, SHA256, SHA512) and file verification.
 */

import { createHash } from 'node:crypto';
import type { ProcessingResult, ProcessingOptions } from '../../types/index.js';
import { getBaseName } from '../../utils/index.js';

export async function hashFile(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  processing?.onProgress?.(50, 'Calculating file checksum hashes...');

  const md5 = createHash('md5').update(data).digest('hex');
  const sha1 = createHash('sha1').update(data).digest('hex');
  const sha256 = createHash('sha256').update(data).digest('hex');
  const sha512 = createHash('sha512').update(data).digest('hex');

  const hashes = {
    filename,
    sizeBytes: data.length,
    md5,
    sha1,
    sha256,
    sha512,
  };

  const jsonStr = JSON.stringify(hashes, null, 2);

  return {
    success: true,
    outputFiles: [{
      name: `${getBaseName(filename)}_hashes.json`,
      data: Buffer.from(jsonStr, 'utf-8'),
      mimeType: 'application/json',
      extension: '.json',
      size: Buffer.byteLength(jsonStr, 'utf-8'),
    }],
    metadata: hashes,
    duration: Date.now() - start,
  };
}
