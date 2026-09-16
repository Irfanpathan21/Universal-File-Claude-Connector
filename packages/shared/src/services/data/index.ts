/**
 * Data Processing Service
 *
 * Handles semi-structured data conversions and formatting.
 * Supports: JSON, XML, YAML, CSV, Markdown, HTML
 */

import Papa from 'papaparse';
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import yaml from 'js-yaml';
import { marked } from 'marked';
import type { ProcessingResult, ProcessingOptions, OutputFile } from '../../types/index.js';
import { ValidationError, ProcessingError } from '../../errors/index.js';
import { getBaseName, normalizeJsonToTabularRows } from '../../utils/index.js';

// ─── JSON ↔ CSV ──────────────────────────────────────────────

export interface JsonToCsvOptions {
  delimiter?: string;
  header?: boolean;
  columns?: string[];
}

export async function jsonToCsv(
  data: Buffer | Uint8Array,
  filename: string,
  options: JsonToCsvOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(25, 'Parsing and validating JSON structure...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    if (!jsonStr.trim()) throw new ValidationError('JSON data is empty');

    let jsonData: any;
    try {
      jsonData = JSON.parse(jsonStr);
    } catch (parseErr: any) {
      throw new ValidationError(`Invalid JSON format: ${parseErr.message}`);
    }

    processing?.onProgress?.(50, 'Normalizing data records and flattening structures...');
    const { rows, columns } = normalizeJsonToTabularRows(jsonData);

    if (rows.length === 0) throw new ValidationError('No convertible data rows found in JSON');

    processing?.onProgress?.(75, 'Generating CSV table...');

    const chosenColumns = options.columns && options.columns.length > 0 ? options.columns : columns;

    const csv = Papa.unparse(rows, {
      delimiter: options.delimiter || ',',
      header: options.header !== false,
      columns: chosenColumns,
    });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.csv`,
        data: Buffer.from(csv, 'utf-8'),
        mimeType: 'text/csv',
        extension: '.csv',
        size: Buffer.byteLength(csv, 'utf-8'),
      }],
      metadata: { rows: rows.length, columns: chosenColumns.length },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert JSON to CSV: ${(error as Error).message}`);
  }
}

export interface CsvToJsonOptions {
  delimiter?: string;
  header?: boolean;
  dynamicTyping?: boolean;
  skipEmptyLines?: boolean;
}

export async function csvToJson(
  data: Buffer | Uint8Array,
  filename: string,
  options: CsvToJsonOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing CSV...');
    const csvStr = Buffer.from(data).toString('utf-8');

    const result = Papa.parse(csvStr, {
      header: options.header !== false,
      delimiter: options.delimiter || '',
      dynamicTyping: options.dynamicTyping !== false,
      skipEmptyLines: options.skipEmptyLines !== false,
    });

    if (result.errors.length > 0) {
      const errorMsgs = result.errors.slice(0, 5).map(e => e.message).join('; ');
      throw new ValidationError(`CSV parsing errors: ${errorMsgs}`);
    }

    processing?.onProgress?.(60, 'Converting to JSON...');
    const jsonStr = JSON.stringify(result.data, null, 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      metadata: {
        rows: result.data.length,
        fields: result.meta.fields?.length || 0,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert CSV to JSON: ${(error as Error).message}`);
  }
}

// ─── JSON ↔ XML ──────────────────────────────────────────────

export interface JsonToXmlOptions {
  rootName?: string;
  indent?: boolean;
  cdataTagName?: string;
}

export async function jsonToXml(
  data: Buffer | Uint8Array,
  filename: string,
  options: JsonToXmlOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing JSON...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    const jsonData = JSON.parse(jsonStr);

    processing?.onProgress?.(60, 'Converting to XML...');

    const builder = new XMLBuilder({
      format: options.indent !== false,
      indentBy: '  ',
      suppressEmptyNode: true,
      cdataPropName: options.cdataTagName,
    });

    const wrappedData = { [options.rootName || 'root']: jsonData };
    let xmlStr = builder.build(wrappedData);
    xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlStr;

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.xml`,
        data: Buffer.from(xmlStr, 'utf-8'),
        mimeType: 'application/xml',
        extension: '.xml',
        size: Buffer.byteLength(xmlStr, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert JSON to XML: ${(error as Error).message}`);
  }
}

export interface XmlToJsonOptions {
  ignoreAttributes?: boolean;
  preserveOrder?: boolean;
}

export async function xmlToJson(
  data: Buffer | Uint8Array,
  filename: string,
  options: XmlToJsonOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing XML...');
    const xmlStr = Buffer.from(data).toString('utf-8');

    // Validate XML first
    const validation = XMLValidator.validate(xmlStr);
    if (validation !== true) {
      throw new ValidationError(`Invalid XML: ${JSON.stringify(validation)}`);
    }

    const parser = new XMLParser({
      ignoreAttributes: options.ignoreAttributes ?? false,
      preserveOrder: options.preserveOrder ?? false,
      parseAttributeValue: true,
      trimValues: true,
    });

    processing?.onProgress?.(60, 'Converting to JSON...');
    const jsonData = parser.parse(xmlStr);
    const jsonStr = JSON.stringify(jsonData, null, 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert XML to JSON: ${(error as Error).message}`);
  }
}

// ─── JSON ↔ YAML ─────────────────────────────────────────────

export async function jsonToYaml(
  data: Buffer | Uint8Array,
  filename: string,
  options: { indent?: number; lineWidth?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing JSON...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    const jsonData = JSON.parse(jsonStr);

    processing?.onProgress?.(60, 'Converting to YAML...');
    const yamlStr = yaml.dump(jsonData, {
      indent: options.indent || 2,
      lineWidth: options.lineWidth || 80,
      noRefs: true,
    });

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.yaml`,
        data: Buffer.from(yamlStr, 'utf-8'),
        mimeType: 'application/x-yaml',
        extension: '.yaml',
        size: Buffer.byteLength(yamlStr, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert JSON to YAML: ${(error as Error).message}`);
  }
}

export async function yamlToJson(
  data: Buffer | Uint8Array,
  filename: string,
  options: { indent?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing YAML...');
    const yamlStr = Buffer.from(data).toString('utf-8');
    const yamlData = yaml.load(yamlStr);

    processing?.onProgress?.(60, 'Converting to JSON...');
    const jsonStr = JSON.stringify(yamlData, null, options.indent || 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.json`,
        data: Buffer.from(jsonStr, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(jsonStr, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert YAML to JSON: ${(error as Error).message}`);
  }
}

// ─── JSON Formatting ─────────────────────────────────────────

export async function formatJson(
  data: Buffer | Uint8Array,
  filename: string,
  options: { indent?: number } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing JSON...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    const jsonData = JSON.parse(jsonStr);

    processing?.onProgress?.(60, 'Formatting...');
    const formatted = JSON.stringify(jsonData, null, options.indent || 2);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_formatted.json`,
        data: Buffer.from(formatted, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: Buffer.byteLength(formatted, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Invalid JSON: ${(error as Error).message}`);
  }
}

export async function minifyJson(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing JSON...');
    const jsonStr = Buffer.from(data).toString('utf-8');
    const jsonData = JSON.parse(jsonStr);

    const minified = JSON.stringify(jsonData);
    const originalSize = data.length;
    const newSize = Buffer.byteLength(minified, 'utf-8');

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.min.json`,
        data: Buffer.from(minified, 'utf-8'),
        mimeType: 'application/json',
        extension: '.json',
        size: newSize,
      }],
      metadata: {
        originalSize,
        minifiedSize: newSize,
        savingsPercent: Math.round(((originalSize - newSize) / originalSize) * 10000) / 100,
      },
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Invalid JSON: ${(error as Error).message}`);
  }
}

// ─── Validate JSON ───────────────────────────────────────────

export async function validateJson(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    const jsonStr = Buffer.from(data).toString('utf-8');
    JSON.parse(jsonStr);

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_validation.json`,
        data: Buffer.from(JSON.stringify({ valid: true, errors: [] }, null, 2)),
        mimeType: 'application/json',
        extension: '.json',
      }],
      metadata: { valid: true },
      message: 'JSON is valid',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_validation.json`,
        data: Buffer.from(JSON.stringify({
          valid: false,
          errors: [(error as Error).message],
        }, null, 2)),
        mimeType: 'application/json',
        extension: '.json',
      }],
      metadata: { valid: false, error: (error as Error).message },
      message: `JSON is invalid: ${(error as Error).message}`,
      duration: Date.now() - start,
    };
  }
}

// ─── Format XML ──────────────────────────────────────────────

export async function formatXml(
  data: Buffer | Uint8Array,
  filename: string,
  options: { indent?: string } = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Parsing XML...');
    const xmlStr = Buffer.from(data).toString('utf-8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
    });
    const parsed = parser.parse(xmlStr);

    processing?.onProgress?.(60, 'Formatting XML...');
    const builder = new XMLBuilder({
      format: true,
      indentBy: options.indent || '  ',
      ignoreAttributes: false,
      preserveOrder: true,
      suppressEmptyNode: false,
    });

    let formatted = builder.build(parsed);
    if (!formatted.startsWith('<?xml')) {
      formatted = '<?xml version="1.0" encoding="UTF-8"?>\n' + formatted;
    }

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}_formatted.xml`,
        data: Buffer.from(formatted, 'utf-8'),
        mimeType: 'application/xml',
        extension: '.xml',
        size: Buffer.byteLength(formatted, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to format XML: ${(error as Error).message}`);
  }
}

// ─── Markdown ↔ HTML ─────────────────────────────────────────

export interface MarkdownToHtmlOptions {
  wrapInHtml?: boolean;
  title?: string;
}

export async function markdownToHtml(
  data: Buffer | Uint8Array,
  filename: string,
  options: MarkdownToHtmlOptions = {},
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(30, 'Converting Markdown to HTML...');
    const mdStr = Buffer.from(data).toString('utf-8');
    const htmlContent = await marked(mdStr);

    let html: string;
    if (options.wrapInHtml !== false) {
      const title = options.title || getBaseName(filename);
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1a1a1a; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f4f4f4; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    } else {
      html = htmlContent;
    }

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.html`,
        data: Buffer.from(html, 'utf-8'),
        mimeType: 'text/html',
        extension: '.html',
        size: Buffer.byteLength(html, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    throw new ProcessingError(`Failed to convert Markdown to HTML: ${(error as Error).message}`);
  }
}

export async function htmlToMarkdown(
  data: Buffer | Uint8Array,
  filename: string,
  processing?: ProcessingOptions
): Promise<ProcessingResult> {
  const start = Date.now();

  try {
    processing?.onProgress?.(25, 'Preprocessing HTML content...');
    let htmlStr = Buffer.from(data).toString('utf-8');
    if (!htmlStr.trim()) throw new ValidationError('HTML content is empty');

    // Extract title from <head> if present
    const titleMatch = htmlStr.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const docTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
    // Strip <title> from HTML so Turndown doesn't dump raw unformatted text with indentation
    htmlStr = htmlStr.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');

    // Dynamic import for Turndown (CommonJS)
    const TurndownService = (await import('turndown')).default;
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // 1. Remove non-content / decorative tags
    turndown.remove(['style', 'script', 'noscript', 'iframe', 'svg', 'canvas']);

    // 2. Preserve action buttons and buttons with links
    turndown.addRule('buttonLink', {
      filter: (node: any) =>
        node.nodeName === 'BUTTON' ||
        (node.nodeName === 'INPUT' && (node.getAttribute('type') === 'button' || node.getAttribute('type') === 'submit')),
      replacement: (content: string, node: any) => {
        const onclick = node.getAttribute('onclick') || '';
        const dataHref = node.getAttribute('data-href') || node.getAttribute('href') || '';
        const match = onclick.match(/location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/) ||
                      onclick.match(/window\.open\(['"]([^'"]+)['"]\)/);
        const href = dataHref || (match ? match[1] : '');
        const text = (node.value || content || '').replace(/\s+/g, ' ').trim();
        if (href && text) {
          return `\n\n[${text}](${href})\n\n`;
        }
        return text ? `\n\n**${text}**\n\n` : '';
      },
    });

    // 3. Full HTML Table Support (GFM Markdown Table)
    turndown.addRule('table', {
      filter: 'table',
      replacement: (_content: string, node: any) => {
        const rows = Array.from(node.querySelectorAll('tr')) as any[];
        if (rows.length === 0) return '';

        const matrix = rows.map(tr => {
          const cells = Array.from(tr.querySelectorAll('th, td')) as any[];
          return cells.map(cell => (cell.textContent || '').replace(/[\r\n\t]+/g, ' ').replace(/\|/g, '\\|').trim());
        });

        if (matrix.length === 0 || matrix[0].length === 0) return '';

        const colCount = Math.max(...matrix.map(r => r.length));
        const normalizedMatrix = matrix.map(r => {
          while (r.length < colCount) r.push('');
          return r;
        });

        const header = normalizedMatrix[0];
        const separator = new Array(colCount).fill('---');
        const dataRows = normalizedMatrix.slice(1);

        const lines = [
          '| ' + header.join(' | ') + ' |',
          '| ' + separator.join(' | ') + ' |',
          ...dataRows.map(r => '| ' + r.join(' | ') + ' |'),
        ];

        return '\n\n' + lines.join('\n') + '\n\n';
      },
    });

    // 4. Clean List Item (- Item instead of -   Item)
    turndown.addRule('cleanListItem', {
      filter: 'li',
      replacement: (content: string, node: any, options: any) => {
        content = content
          .replace(/^\n+/, '')
          .replace(/\n+$/, '\n')
          .replace(/\n/gm, '\n  ');
        let prefix = (options.bulletListMarker || '-') + ' ';
        const parent = node.parentNode;
        if (parent && parent.nodeName === 'OL') {
          const start = parent.getAttribute('start');
          const index = Array.prototype.indexOf.call(parent.children, node);
          prefix = (start ? Number(start) + index : index + 1) + '. ';
        }
        return (
          prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
        );
      },
    });

    // 5. Clean Image URLs (encode spaces to %20 instead of < >)
    turndown.addRule('cleanImage', {
      filter: 'img',
      replacement: (_content: string, node: any) => {
        const alt = node.getAttribute('alt') || '';
        let src = node.getAttribute('src') || '';
        if (!src) return '';
        src = src.trim().replace(/\s+/g, '%20');
        return `![${alt}](${src})`;
      },
    });

    processing?.onProgress?.(60, 'Converting document structure to Markdown...');
    let markdown = turndown.turndown(htmlStr);

    // Prefix with clean title header if extracted from <head>
    if (docTitle) {
      markdown = `# ${docTitle}\n\n` + markdown;
    }

    processing?.onProgress?.(85, 'Formatting and cleaning Markdown layout...');
    // Post-processing:
    // 1. Trim trailing whitespace on all lines
    markdown = markdown
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n');
    // 2. Collapse 3+ consecutive newlines (including whitespace-only lines) to standard double newlines
    markdown = markdown.replace(/\n[ \t]*\n[ \t]*\n+/g, '\n\n').trim() + '\n';

    return {
      success: true,
      outputFiles: [{
        name: `${getBaseName(filename)}.md`,
        data: Buffer.from(markdown, 'utf-8'),
        mimeType: 'text/markdown',
        extension: '.md',
        size: Buffer.byteLength(markdown, 'utf-8'),
      }],
      duration: Date.now() - start,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ProcessingError(`Failed to convert HTML to Markdown: ${(error as Error).message}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
