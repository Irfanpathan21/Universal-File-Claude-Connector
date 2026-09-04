/**
 * Universal File Toolkit — MCP Server
 *
 * Fully compliant Model Context Protocol server that exposes
 * every file processing operation as an MCP tool.
 *
 * Transport: STDIO (primary), HTTP Streamable (secondary)
 * SDK: @modelcontextprotocol/sdk v1.x (stable)
 *
 * Compatible with:
 *  - Claude Desktop
 *  - Claude Code
 *  - Cursor
 *  - VS Code MCP clients
 *  - Any standards-compliant MCP client
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import http from 'node:http';
import { exec } from 'node:child_process';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';
import { existsSync } from 'node:fs';
import {
  pdfService,
  imageService,
  dataService,
  documentService,
  spreadsheetService,
  presentationService,
  textService,
  archiveService,
  audioService,
  videoService,
  ocrService,
  utilityService,
  aiService,
  getTools,
  getActiveCategories,
  SUPPORTED_FORMATS,
} from '@uft/shared';

// ─── Server Setup ────────────────────────────────────────────

const server = new Server(
  {
    name: 'universal-file-toolkit',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ─── Helper Functions ────────────────────────────────────────

async function readInputFile(filePath: string): Promise<Buffer> {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return readFile(resolved);
}

async function writeOutputFile(data: Buffer | Uint8Array, outputPath: string): Promise<string> {
  const resolved = resolve(outputPath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, data);
  return resolved;
}

async function readMultipleFiles(paths: string[]): Promise<{ data: Buffer; name: string }[]> {
  return Promise.all(
    paths.map(async (p) => ({
      data: await readInputFile(p),
      name: basename(p),
    }))
  );
}

function getOutputPath(inputPath: string, suffix: string, outputDir?: string): string {
  const base = basename(inputPath, '.pdf');
  const dir = outputDir || dirname(resolve(inputPath));
  return join(dir, `${base}${suffix}`);
}

// ─── Tool Registration ──────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ── PDF Tools ──────────────────────────────────────
      {
        name: 'merge_pdf',
        description: 'Merge multiple PDF files directly on the local disk. Local MCP tool with full disk access to C:\\ file paths. Call this tool directly when requested.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Array of absolute file paths to merge (e.g. C:\\path\\file.pdf)' },
            outputPath: { type: 'string', description: 'Output absolute file path (optional)' },
          },
          required: ['files'],
        },
      },
      {
        name: 'split_pdf',
        description: 'Split a PDF into multiple files by page ranges',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            ranges: { type: 'string', description: 'Page ranges like "1-5,10-15"' },
            splitEvery: { type: 'number', description: 'Split every N pages' },
            outputDir: { type: 'string', description: 'Output directory' },
          },
          required: ['file'],
        },
      },
      {
        name: 'compress_pdf',
        description: 'Reduce PDF file size while maintaining quality',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            quality: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Compression quality' },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file'],
        },
      },
      {
        name: 'rotate_pdf',
        description: 'Rotate PDF pages by 90°, 180°, or 270°',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            angle: { type: 'number', enum: [90, 180, 270], description: 'Rotation angle (clockwise)' },
            pages: { type: 'array', items: { type: 'number' }, description: 'Page numbers to rotate (1-based). Empty = all pages' },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file', 'angle'],
        },
      },
      {
        name: 'extract_pdf_pages',
        description: 'Extract specific pages from a PDF into a new file',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            pages: { type: 'array', items: { type: 'number' }, description: 'Page numbers to extract (1-based)' },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file', 'pages'],
        },
      },
      {
        name: 'delete_pdf_pages',
        description: 'Remove specific pages from a PDF',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            pages: { type: 'array', items: { type: 'number' }, description: 'Page numbers to delete (1-based)' },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file', 'pages'],
        },
      },
      {
        name: 'extract_pdf_text',
        description: 'Extract all text content from a PDF document',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string', description: 'Output text file path' },
          },
          required: ['file'],
        },
      },
      {
        name: 'add_pdf_watermark',
        description: 'Add a text watermark to every page of a PDF',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            text: { type: 'string', description: 'Watermark text' },
            fontSize: { type: 'number', description: 'Font size (default: 48)' },
            opacity: { type: 'number', description: 'Opacity 0-1 (default: 0.3)' },
            rotation: { type: 'number', description: 'Rotation angle in degrees (default: 45)' },
            position: { type: 'string', enum: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file', 'text'],
        },
      },
      {
        name: 'add_pdf_page_numbers',
        description: 'Add page numbers to a PDF document',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            position: { type: 'string', enum: ['bottom-center', 'bottom-left', 'bottom-right', 'top-center', 'top-left', 'top-right'] },
            format: { type: 'string', enum: ['numeric', 'roman', 'alpha'] },
            startNumber: { type: 'number', description: 'Starting page number (default: 1)' },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file'],
        },
      },
      {
        name: 'get_pdf_metadata',
        description: 'Read metadata from a PDF document (title, author, page count, etc.)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'images_to_pdf',
        description: 'Convert multiple images into a single PDF document',
        inputSchema: {
          type: 'object' as const,
          properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Array of image file paths' },
            pageSize: { type: 'string', enum: ['A4', 'Letter', 'fit'], description: 'PDF page size' },
            outputPath: { type: 'string', description: 'Output PDF file path' },
          },
          required: ['files'],
        },
      },
      {
        name: 'duplicate_pages',
        description: 'Duplicate specified pages in a PDF. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            pages: { type: 'array', items: { type: 'number' }, description: '1-indexed page numbers to duplicate' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'swap_pages',
        description: 'Swap positions of two pages in a PDF. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            pageA: { type: 'number', description: 'First page number' },
            pageB: { type: 'number', description: 'Second page number' },
            outputPath: { type: 'string' },
          },
          required: ['file', 'pageA', 'pageB'],
        },
      },
      {
        name: 'reverse_pages',
        description: 'Reverse the order of all pages in a PDF. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'edit_pdf_metadata',
        description: 'Modify title, author, and subject properties of a PDF. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            title: { type: 'string', description: 'Document title' },
            author: { type: 'string', description: 'Author name' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'flatten_pdf_form',
        description: 'Flatten interactive form fields into permanent page content. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'pdf_to_txt',
        description: 'Extract PDF text into a plain .txt file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'txt_to_pdf',
        description: 'Convert plain .txt file into a formatted PDF. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the TXT file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'validate_pdf',
        description: 'Verify structure and validity of a PDF file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },

      // ── Image Tools ────────────────────────────────────
      {
        name: 'resize_image',
        description: 'Resize an image to specific dimensions',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            width: { type: 'number', description: 'Target width in pixels' },
            height: { type: 'number', description: 'Target height in pixels' },
            fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] },
            outputPath: { type: 'string', description: 'Output file path' },
          },
          required: ['file'],
        },
      },
      {
        name: 'crop_image',
        description: 'Crop an image visually or with specific dimensions. When left/top/width/height are omitted or visual=true, automatically pops up an interactive visible cropping window on screen for direct manipulation with Rule-of-Thirds grid and aspect ratio presets.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            left: { type: 'number', description: 'Left offset in pixels (optional - omit to open visual cropping window)' },
            top: { type: 'number', description: 'Top offset in pixels (optional - omit to open visual cropping window)' },
            width: { type: 'number', description: 'Crop width in pixels (optional - omit to open visual cropping window)' },
            height: { type: 'number', description: 'Crop height in pixels (optional - omit to open visual cropping window)' },
            visual: { type: 'boolean', description: 'Set to true to launch the visible interactive cropping window' },
            outputPath: { type: 'string', description: 'Target output path for the cropped file (optional)' },
          },
          required: ['file'],
        },
      },
      {
        name: 'convert_image',
        description: 'Convert an image to a different format (PNG, JPG, WebP, AVIF, TIFF, GIF)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'], description: 'Target format' },
            quality: { type: 'number', description: 'Output quality 1-100' },
            outputPath: { type: 'string' },
          },
          required: ['file', 'format'],
        },
      },
      {
        name: 'compress_image',
        description: 'Compress an image to reduce file size',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            quality: { type: 'number', description: 'Quality 1-100 (default: 80)' },
            format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'rotate_image',
        description: 'Rotate an image by a specified angle',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            angle: { type: 'number', description: 'Rotation angle in degrees (clockwise)' },
            outputPath: { type: 'string' },
          },
          required: ['file', 'angle'],
        },
      },
      {
        name: 'image_grayscale',
        description: 'Convert an image to grayscale (black & white)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'get_image_metadata',
        description: 'Read image metadata including dimensions, format, EXIF data',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'remove_image_exif',
        description: 'Strip all EXIF/metadata from an image for privacy',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'generate_thumbnail',
        description: 'Create a thumbnail version of an image',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            width: { type: 'number', description: 'Thumbnail width (default: 200)' },
            height: { type: 'number', description: 'Thumbnail height (default: 200)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'invert_image',
        description: 'Invert colors of an image. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'gamma_image',
        description: 'Apply gamma correction to adjust image luminance. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            gamma: { type: 'number', description: 'Gamma level (default 2.2)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'threshold_image',
        description: 'Apply binary black & white threshold to image. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            threshold: { type: 'number', description: 'Threshold level 0-255 (default 128)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'dominant_colors',
        description: 'Extract dominant color palette and channel statistics from image. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'trim_transparent_edges',
        description: 'Crop and trim transparent outer borders from image. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },

      // ── Data Tools ─────────────────────────────────────
      {
        name: 'json_to_csv',
        description: 'Convert a JSON array file to CSV format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
            delimiter: { type: 'string', description: 'CSV delimiter (default: comma)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'csv_to_json',
        description: 'Convert a CSV file to JSON format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the CSV file' },
            header: { type: 'boolean', description: 'First row is header (default: true)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'json_to_xml',
        description: 'Convert a JSON file to XML format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
            rootName: { type: 'string', description: 'Root XML element name (default: root)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'xml_to_json',
        description: 'Convert an XML file to JSON format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the XML file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'json_to_yaml',
        description: 'Convert a JSON file to YAML format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'yaml_to_json',
        description: 'Convert a YAML file to JSON format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the YAML file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'format_json',
        description: 'Pretty-print and format a JSON file',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
            indent: { type: 'number', description: 'Indentation (default: 2)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'minify_json',
        description: 'Minify a JSON file by removing whitespace',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'validate_json',
        description: 'Check if a JSON file is valid and well-formed',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'markdown_to_html',
        description: 'Convert a Markdown file to styled HTML',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Markdown file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'html_to_markdown',
        description: 'Convert an HTML file to Markdown format',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the HTML file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },

      // ── Document Tools (Phase 2) ─────────────────────────
      {
        name: 'extract_docx_text',
        description: 'Extract raw text content from Word DOCX document. Local MCP tool with disk access.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            outputPath: { type: 'string', description: 'Output txt file path' },
          },
          required: ['file'],
        },
      },
      {
        name: 'docx_to_html',
        description: 'Convert Word DOCX document to HTML with formatting. Local MCP tool with disk access.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'extract_docx_images',
        description: 'Extract all embedded images from a Word DOCX document. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'merge_docx',
        description: 'Merge multiple Word (.docx) files into a single unified document. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Array of DOCX file paths' },
            outputPath: { type: 'string' },
          },
          required: ['files'],
        },
      },
      {
        name: 'replace_text_docx',
        description: 'Find and replace target text occurrences inside a Word document. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            targetText: { type: 'string', description: 'Text to search for' },
            replacementText: { type: 'string', description: 'Replacement text' },
            outputPath: { type: 'string' },
          },
          required: ['file', 'targetText'],
        },
      },
      {
        name: 'extract_docx_comments',
        description: 'Extract reviewer comments and notes from a Word document. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'word_count_docx',
        description: 'Calculate word count, character count, sentence count, and reading time in Word documents. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },

      // ── Spreadsheet Tools (Phase 2) ──────────────────────
      {
        name: 'excel_to_csv',
        description: 'Convert an Excel workbook sheet to CSV format. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel XLSX/XLS file' },
            sheetName: { type: 'string', description: 'Name of the sheet (optional)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'csv_to_excel',
        description: 'Convert a CSV file to an Excel XLSX workbook. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the CSV file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'excel_to_json',
        description: 'Convert Excel spreadsheet data to JSON array of objects. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel file' },
            sheetName: { type: 'string' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'merge_excel_sheets',
        description: 'Combine multiple Excel workbooks into a single workbook. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Array of Excel file paths to merge' },
            outputPath: { type: 'string' },
          },
          required: ['files'],
        },
      },
      {
        name: 'remove_csv_duplicates',
        description: 'Remove duplicate rows from a CSV file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the CSV file' },
            columnHeader: { type: 'string', description: 'Unique column header to check (optional)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'protect_workbook',
        description: 'Add password protection and lock worksheet editing in Excel workbooks. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel file' },
            password: { type: 'string', description: 'Protection password' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'split_workbook',
        description: 'Split a multi-sheet Excel workbook into separate individual sheet files. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'find_replace_excel',
        description: 'Find and replace target cell values across all Excel worksheets. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel file' },
            targetValue: { type: 'string', description: 'Text or number to search for' },
            replacementValue: { type: 'string', description: 'Replacement cell value' },
            outputPath: { type: 'string' },
          },
          required: ['file', 'targetValue'],
        },
      },
      {
        name: 'workbook_statistics',
        description: 'Analyze Excel workbook structure, sheet counts, row counts, and stats. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },

      {
        name: 'extract_docx_hyperlinks',
        description: 'Extract all embedded URLs and hyperlinks from a Word DOCX document. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'docx_to_markdown',
        description: 'Convert a Word DOCX document to Markdown format. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the DOCX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'text_to_docx',
        description: 'Convert a text file or Markdown file into a Word DOCX document. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the text/markdown file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'json_to_excel',
        description: 'Convert a JSON file containing an array of objects into an Excel XLSX workbook. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the JSON file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'transpose_sheet',
        description: 'Transpose rows and columns in a CSV file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the CSV file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'extract_pptx_text',
        description: 'Extract raw text from all slides in a PowerPoint PPTX presentation. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PPTX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'extract_pptx_notes',
        description: 'Extract speaker notes from PowerPoint PPTX presentation slides. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PPTX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'extract_pptx_images',
        description: 'Extract all embedded graphics and images from PowerPoint PPTX slides. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PPTX file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'pptx_to_html',
        description: 'Convert PowerPoint (.pptx) presentation slides into a web HTML slide deck. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PPTX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'read_pptx_metadata',
        description: 'Extract presentation slide counts, speaker notes count, media count, and metadata. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PPTX file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'word_count',
        description: 'Calculate word count, character count, sentence count, and reading time for a text file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the text/markdown/html file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'pdf_to_docx',
        description: 'Convert a PDF document into an editable Word DOCX file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'pdf_to_html',
        description: 'Convert a PDF document into a styled HTML web page. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'excel_to_html',
        description: 'Convert an Excel spreadsheet into an HTML formatted table. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the Excel file' },
            sheetName: { type: 'string' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'pdf_to_images',
        description: 'Extract photos, graphics, and embedded images from a PDF file into JPG/PNG files. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the PDF file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'create_zip',
        description: 'Compress multiple files into a single ZIP archive. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Paths of files to zip' },
            outputPath: { type: 'string' },
          },
          required: ['files'],
        },
      },
      {
        name: 'extract_zip',
        description: 'Extract files and folders from a ZIP archive. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the ZIP file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'list_archive_contents',
        description: 'Inspect file contents inside a ZIP archive without extracting. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the ZIP file' },
          },
          required: ['file'],
        },
      },
      {
        name: 'convert_audio',
        description: 'Convert audio format (MP3, WAV, AAC, OGG, FLAC, M4A). Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the audio file' },
            targetFormat: { type: 'string', description: 'Target format (mp3, wav, aac, ogg, flac)' },
            outputPath: { type: 'string' },
          },
          required: ['file', 'targetFormat'],
        },
      },
      {
        name: 'extract_audio_from_video',
        description: 'Extract audio track from MP4/MKV/AVI/MOV video file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the video file' },
            targetFormat: { type: 'string', description: 'Target audio format (mp3, wav, aac)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'compress_video',
        description: 'Reduce video file size using H.264 video compression. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the video file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'generate_video_thumbnail',
        description: 'Extract a frame from a video file at a given timestamp as a JPG image. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the video file' },
            timestamp: { type: 'string', description: 'Timestamp (HH:MM:SS), default 00:00:01' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'trim_audio',
        description: 'Cut audio clip between start and end timestamps. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the audio file' },
            startTime: { type: 'string', description: 'Start timestamp (HH:MM:SS)' },
            endTime: { type: 'string', description: 'End timestamp (HH:MM:SS)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'change_audio_speed',
        description: 'Adjust audio playback speed (0.5x to 2.0x). Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the audio file' },
            speed: { type: 'number', description: 'Playback speed multiplier (e.g. 1.5)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'audio_to_waveform',
        description: 'Generate a visual waveform PNG image of an audio file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the audio file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'video_to_gif',
        description: 'Convert video clip into a smooth animated GIF file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the video file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'gif_to_video',
        description: 'Convert an animated GIF into an MP4 video clip. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the GIF file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'trim_video',
        description: 'Cut video clip between start and end timestamps. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the video file' },
            startTime: { type: 'string', description: 'Start timestamp (HH:MM:SS)' },
            endTime: { type: 'string', description: 'End timestamp (HH:MM:SS)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'mute_video',
        description: 'Remove audio stream from video file to create a silent video. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the video file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'compress_gzip',
        description: 'Compress a file using GZIP compression algorithm (.gz). Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'decompress_gzip',
        description: 'Decompress a GZIP (.gz) archive file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the GZIP file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'extract_text_from_image_ocr',
        description: 'Perform Optical Character Recognition on image (PNG, JPG, TIFF) to extract text. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the image file' },
            language: { type: 'string', description: 'Language code (e.g. eng, spa, fra, deu)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'hash_file',
        description: 'Calculate MD5, SHA1, SHA256, and SHA512 checksum hashes of a file. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to the file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'summarize_text',
        description: 'Summarize long text, documents, or extracted PDF text into key bullet points. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to text or document file' },
            maxSentences: { type: 'number', description: 'Number of sentences (default 5)' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'extract_keywords',
        description: 'Extract top keywords and key phrases from text or document files. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to text or document file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
      {
        name: 'sentiment_analysis',
        description: 'Analyze sentiment (Positive, Negative, Neutral) and emotion score of text. Local MCP tool.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file: { type: 'string', description: 'Path to text or document file' },
            outputPath: { type: 'string' },
          },
          required: ['file'],
        },
      },
    ],
  };
});

// ─── Tool Execution ──────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args: Record<string, any> = request.params.arguments || {};

  try {
    switch (name) {
      // ── PDF Tools ──────────────────────────────────────
      case 'merge_pdf': {
        const files = await readMultipleFiles(args.files as string[]);
        const result = await pdfService.mergePdf(files, {
          outputFilename: args.outputPath ? basename(args.outputPath as string) : undefined,
        });
        const outputPath = args.outputPath as string || getOutputPath((args.files as string[])[0], '_merged.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Merged ${files.length} PDFs → ${outputPath}\nTotal pages: ${result.metadata?.totalPages}` }] };
      }

      case 'split_pdf': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.splitPdf(data, basename(args.file as string), {
          ranges: args.ranges as string,
          splitEvery: args.splitEvery as number,
        });
        const outDir = (args.outputDir as string) || dirname(resolve(args.file as string));
        const outputPaths: string[] = [];
        for (const file of result.outputFiles) {
          const outPath = join(outDir, file.name);
          await writeOutputFile(file.data as Buffer, outPath);
          outputPaths.push(outPath);
        }
        return { content: [{ type: 'text', text: `✅ Split into ${outputPaths.length} files:\n${outputPaths.map(p => `  • ${p}`).join('\n')}` }] };
      }

      case 'compress_pdf': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.compressPdf(data, basename(args.file as string), {
          quality: args.quality as any,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_compressed.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Compressed PDF → ${outputPath}\nOriginal: ${result.metadata?.originalSize} bytes\nCompressed: ${result.metadata?.compressedSize} bytes\nSavings: ${result.metadata?.savingsPercent}%` }] };
      }

      case 'rotate_pdf': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.rotatePdf(data, basename(args.file as string), {
          angle: args.angle as 90 | 180 | 270,
          pages: args.pages as number[],
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_rotated.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Rotated ${result.metadata?.rotatedPages} pages by ${args.angle}° → ${outputPath}` }] };
      }

      case 'extract_pdf_pages': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.extractPages(data, basename(args.file as string), args.pages as number[]);
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_extracted.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted ${(args.pages as number[]).length} pages → ${outputPath}` }] };
      }

      case 'delete_pdf_pages': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.deletePages(data, basename(args.file as string), args.pages as number[]);
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_modified.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Deleted pages ${(args.pages as number[]).join(', ')} → ${outputPath}\nRemaining pages: ${result.metadata?.remainingPages}` }] };
      }

      case 'extract_pdf_text': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.extractText(data, basename(args.file as string));
        if (args.outputPath) {
          await writeOutputFile(result.outputFiles[0].data as Buffer, args.outputPath as string);
          return { content: [{ type: 'text', text: `✅ Extracted text → ${args.outputPath}\nPages: ${result.metadata?.pages}\nCharacters: ${result.metadata?.characters}` }] };
        }
        return { content: [{ type: 'text', text: result.outputFiles[0].data.toString() }] };
      }

      case 'add_pdf_watermark': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.addWatermark(data, basename(args.file as string), {
          text: args.text as string,
          fontSize: args.fontSize as number,
          opacity: args.opacity as number,
          rotation: args.rotation as number,
          position: args.position as any,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_watermarked.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Added watermark "${args.text}" → ${outputPath}` }] };
      }

      case 'add_pdf_page_numbers': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.addPageNumbers(data, basename(args.file as string), {
          position: args.position as any,
          format: args.format as any,
          startNumber: args.startNumber as number,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_numbered.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Added page numbers → ${outputPath}\nPages numbered: ${result.metadata?.pagesNumbered}` }] };
      }

      case 'get_pdf_metadata': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.getMetadata(data);
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'images_to_pdf': {
        const files = await readMultipleFiles(args.files as string[]);
        const result = await pdfService.imagesToPdf(files, { pageSize: args.pageSize as any });
        const outputPath = (args.outputPath as string) || join(dirname(resolve((args.files as string[])[0])), 'images.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Created PDF from ${files.length} images → ${outputPath}` }] };
      }

      // ── Image Tools ────────────────────────────────────
      case 'resize_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.resizeImage(data, basename(args.file as string), {
          width: args.width as number,
          height: args.height as number,
          fit: args.fit as any,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_resized${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Resized → ${outputPath}\nDimensions: ${result.metadata?.width}x${result.metadata?.height}` }] };
      }

      case 'crop_image': {
        const filePath = resolve(args.file as string);
        const outputPath = (args.outputPath as string) || getOutputPath(filePath, '_cropped.png');

        // Check if coordinates were supplied or if visual mode is requested
        const hasCoords = args.left !== undefined && args.top !== undefined && args.width !== undefined && args.height !== undefined;

        if (hasCoords && !args.visual) {
          const data = await readInputFile(filePath);
          const result = await imageService.cropImage(data, basename(filePath), {
            left: Math.max(0, Math.round(args.left as number)),
            top: Math.max(0, Math.round(args.top as number)),
            width: Math.max(1, Math.round(args.width as number)),
            height: Math.max(1, Math.round(args.height as number)),
          });
          await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
          return { content: [{ type: 'text', text: `✅ Cropped → ${outputPath}\nResolution: ${result.metadata?.width}x${result.metadata?.height} px` }] };
        }

        // Visual Window Mode: Pop up visible window on user's screen
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const popupUrl = `${frontendUrl}/editor/crop?file=${encodeURIComponent(filePath)}&out=${encodeURIComponent(outputPath)}`;

        // Launch OS window
        try {
          if (process.platform === 'win32') {
            exec(`start "" "${popupUrl}"`);
          } else if (process.platform === 'darwin') {
            exec(`open "${popupUrl}"`);
          } else {
            exec(`xdg-open "${popupUrl}"`);
          }
        } catch {
          // Ignored if headless
        }

        return {
          content: [
            {
              type: 'text',
              text: `✂️ **Visible Cropper Window Opened!**\n\nA dedicated visual cropping window has popped up on your screen.\n\n👉 **Click here if the window did not open automatically:**\n[**Open Visual Crop Window**](${popupUrl})\n\n**File:** \`${filePath}\`\n**Output Path:** \`${outputPath}\`\n\n**Instructions:**\n1. In the popup window, drag the 8 corner & edge handles to set your crop box.\n2. Choose an aspect ratio preset (\`1:1 Square\`, \`16:9 Landscape\`, \`4:3\`, or \`Freeform\`).\n3. Click **"Confirm Crop & Apply to Claude"**.\n4. The cropped image will be saved directly to your disk!`,
            },
          ],
        };
      }

      case 'convert_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.convertImage(data, basename(args.file as string), {
          format: args.format as any,
          quality: args.quality as number,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, result.outputFiles[0].extension);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted to ${args.format} → ${outputPath}` }] };
      }

      case 'compress_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.compressImage(data, basename(args.file as string), {
          quality: args.quality as number,
          format: args.format as any,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_compressed${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Compressed → ${outputPath}\nSavings: ${result.metadata?.savingsPercent}%` }] };
      }

      case 'rotate_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.rotateImage(data, basename(args.file as string), {
          angle: args.angle as number,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_rotated${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Rotated ${args.angle}° → ${outputPath}` }] };
      }

      case 'image_grayscale': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.grayscaleImage(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_grayscale${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted to grayscale → ${outputPath}` }] };
      }

      case 'get_image_metadata': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.getImageMetadata(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'remove_image_exif': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.removeExif(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_noexif${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Removed EXIF data → ${outputPath}` }] };
      }

      case 'generate_thumbnail': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.generateThumbnail(data, basename(args.file as string), {
          width: args.width as number,
          height: args.height as number,
        });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_thumb${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Generated thumbnail → ${outputPath}` }] };
      }

      case 'invert_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.invertImage(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_inverted${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Inverted image colors → ${outputPath}` }] };
      }

      case 'gamma_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.gammaImage(data, basename(args.file as string), { gamma: args.gamma as number });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_gamma${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Applied gamma correction → ${outputPath}` }] };
      }

      case 'threshold_image': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.thresholdImage(data, basename(args.file as string), { threshold: args.threshold as number });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_threshold${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Applied threshold → ${outputPath}` }] };
      }

      case 'dominant_colors': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.dominantColorsImage(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'trim_transparent_edges': {
        const data = await readInputFile(args.file as string);
        const result = await imageService.trimTransparentEdges(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_trimmed${result.outputFiles[0].extension}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Trimmed transparent edges → ${outputPath}` }] };
      }

      case 'duplicate_pages': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.duplicatePages(data, basename(args.file as string), { pages: args.pages as number[] });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_duplicated.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Duplicated PDF pages → ${outputPath}` }] };
      }

      case 'swap_pages': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.swapPages(data, basename(args.file as string), { pageA: args.pageA as number, pageB: args.pageB as number });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_swapped.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Swapped PDF pages ${args.pageA} & ${args.pageB} → ${outputPath}` }] };
      }

      case 'reverse_pages': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.reversePages(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_reversed.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Reversed PDF page order → ${outputPath}` }] };
      }

      case 'edit_pdf_metadata': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.editPdfMetadata(data, basename(args.file as string), { title: args.title as string, author: args.author as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_updated.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Updated PDF metadata → ${outputPath}` }] };
      }

      case 'flatten_pdf_form': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.flattenPdfForm(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_flattened.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Flattened interactive PDF form → ${outputPath}` }] };
      }

      case 'pdf_to_txt': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.pdfToTxt(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.txt');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted PDF text to TXT → ${outputPath}` }] };
      }

      case 'txt_to_pdf': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.txtToPdf(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.pdf');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted TXT file to PDF → ${outputPath}` }] };
      }

      case 'validate_pdf': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.validatePdf(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      // ── Data Tools ─────────────────────────────────────
      case 'json_to_csv':
      case 'csv_to_json':
      case 'json_to_xml':
      case 'xml_to_json':
      case 'json_to_yaml':
      case 'yaml_to_json':
      case 'format_json':
      case 'minify_json':
      case 'markdown_to_html':
      case 'html_to_markdown': {
        const data = await readInputFile(args.file as string);
        const fname = basename(args.file as string);

        let result;
        switch (name) {
          case 'json_to_csv': result = await dataService.jsonToCsv(data, fname, { delimiter: args.delimiter as string }); break;
          case 'csv_to_json': result = await dataService.csvToJson(data, fname, { header: args.header as boolean }); break;
          case 'json_to_xml': result = await dataService.jsonToXml(data, fname, { rootName: args.rootName as string }); break;
          case 'xml_to_json': result = await dataService.xmlToJson(data, fname); break;
          case 'json_to_yaml': result = await dataService.jsonToYaml(data, fname); break;
          case 'yaml_to_json': result = await dataService.yamlToJson(data, fname); break;
          case 'format_json': result = await dataService.formatJson(data, fname, { indent: args.indent as number }); break;
          case 'minify_json': result = await dataService.minifyJson(data, fname); break;
          case 'markdown_to_html': result = await dataService.markdownToHtml(data, fname); break;
          case 'html_to_markdown': result = await dataService.htmlToMarkdown(data, fname); break;
          default: throw new Error(`Unknown tool: ${name}`);
        }

        if (args.outputPath) {
          await writeOutputFile(result.outputFiles[0].data as Buffer, args.outputPath as string);
          return { content: [{ type: 'text', text: `✅ ${name} → ${args.outputPath}` }] };
        }
        const outputPath = getOutputPath(args.file as string, result.outputFiles[0].extension);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ ${name} → ${outputPath}` }] };
      }

      case 'validate_json': {
        const data = await readInputFile(args.file as string);
        const result = await dataService.validateJson(data, basename(args.file as string));
        return { content: [{ type: 'text', text: result.metadata?.valid ? '✅ JSON is valid' : `❌ JSON is invalid: ${result.metadata?.error}` }] };
      }

      // ── Document Tools (Phase 2) ─────────────────────────
      case 'extract_docx_text': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.extractDocxText(data, basename(args.file as string));
        if (args.outputPath) {
          await writeOutputFile(result.outputFiles[0].data as Buffer, args.outputPath as string);
          return { content: [{ type: 'text', text: `✅ Extracted DOCX text → ${args.outputPath}` }] };
        }
        return { content: [{ type: 'text', text: result.outputFiles[0].data.toString() }] };
      }

      case 'docx_to_html': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.docxToHtml(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.html');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted DOCX to HTML → ${outputPath}` }] };
      }

      case 'extract_docx_images': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.extractDocxImages(data, basename(args.file as string));
        const outDir = dirname(resolve(args.file as string));
        const outputPaths: string[] = [];
        for (const f of result.outputFiles) {
          const p = join(outDir, f.name);
          await writeOutputFile(f.data as Buffer, p);
          outputPaths.push(p);
        }
        return { content: [{ type: 'text', text: `✅ Extracted ${outputPaths.length} images from DOCX:\n${outputPaths.map(p => `  • ${p}`).join('\n')}` }] };
      }

      // ── Spreadsheet Tools (Phase 2) ──────────────────────
      case 'excel_to_csv': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.excelToCsv(data, basename(args.file as string), { sheetName: args.sheetName as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.csv');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted Excel sheet to CSV → ${outputPath}` }] };
      }

      case 'merge_docx': {
        const files = await readMultipleFiles(args.files as string[]);
        const result = await documentService.mergeDocx(files);
        const outputPath = (args.outputPath as string) || getOutputPath(args.files[0] as string, '_merged.docx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Merged Word documents → ${outputPath}` }] };
      }

      case 'replace_text_docx': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.replaceTextDocx(data, basename(args.file as string), { targetText: args.targetText as string, replacementText: args.replacementText as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_replaced.docx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Replaced text in DOCX → ${outputPath}` }] };
      }

      case 'extract_docx_comments': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.extractDocxComments(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_comments.json');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted DOCX comments → ${outputPath}` }] };
      }

      case 'word_count_docx': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.wordCountDocx(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'csv_to_excel': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.csvToExcel(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.xlsx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted CSV to Excel → ${outputPath}` }] };
      }

      case 'excel_to_json': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.excelToJson(data, basename(args.file as string), { sheetName: args.sheetName as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.json');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted Excel to JSON → ${outputPath}` }] };
      }

      case 'merge_excel_sheets': {
        const files = await readMultipleFiles(args.files as string[]);
        const result = await spreadsheetService.mergeExcelSheets(files, { outputFilename: args.outputPath ? basename(args.outputPath as string) : undefined });
        const outputPath = (args.outputPath as string) || join(dirname(resolve((args.files as string[])[0])), 'merged_workbook.xlsx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Merged ${files.length} Excel workbooks → ${outputPath}` }] };
      }

      case 'remove_csv_duplicates': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.removeCsvDuplicates(data, basename(args.file as string), { columnHeader: args.columnHeader as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_deduped.csv');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Removed ${result.metadata?.duplicatesRemoved} duplicate rows → ${outputPath}` }] };
      }

      case 'protect_workbook': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.protectWorkbook(data, basename(args.file as string), { password: args.password as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_protected.xlsx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Protected Excel workbook → ${outputPath}` }] };
      }

      case 'split_workbook': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.splitExcelWorkbook(data, basename(args.file as string));
        const outDir = dirname(resolve(args.file as string));
        const outputPaths: string[] = [];
        for (const f of result.outputFiles) {
          const p = join(outDir, f.name);
          await writeOutputFile(f.data as Buffer, p);
          outputPaths.push(p);
        }
        return { content: [{ type: 'text', text: `✅ Split Excel workbook into ${outputPaths.length} sheets:\n${outputPaths.map(p => `  • ${p}`).join('\n')}` }] };
      }

      case 'find_replace_excel': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.findReplaceExcel(data, basename(args.file as string), { targetValue: args.targetValue as string, replacementValue: args.replacementValue as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_replaced.xlsx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Replaced ${result.metadata?.replacementCount} cells in Excel → ${outputPath}` }] };
      }

      case 'workbook_statistics': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.workbookStatistics(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'extract_docx_hyperlinks': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.extractDocxHyperlinks(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_links.json');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted ${result.metadata?.totalLinks} hyperlinks → ${outputPath}` }] };
      }

      case 'docx_to_markdown': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.docxToMarkdown(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.md');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted DOCX to Markdown → ${outputPath}` }] };
      }

      case 'text_to_docx': {
        const data = await readInputFile(args.file as string);
        const result = await documentService.textToDocx(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.docx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Created Word DOCX → ${outputPath}` }] };
      }

      case 'json_to_excel': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.jsonToExcel(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.xlsx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted JSON to Excel → ${outputPath}` }] };
      }

      case 'transpose_sheet': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.transposeSheet(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_transposed.csv');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Transposed CSV rows/columns → ${outputPath}` }] };
      }

      case 'extract_pptx_text': {
        const data = await readInputFile(args.file as string);
        const result = await presentationService.extractPptxText(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_slides.txt');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted text from ${result.metadata?.slideCount} PPTX slides → ${outputPath}` }] };
      }

      case 'extract_pptx_notes': {
        const data = await readInputFile(args.file as string);
        const result = await presentationService.extractPptxNotes(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_notes.txt');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted speaker notes → ${outputPath}` }] };
      }

      case 'extract_pptx_images': {
        const data = await readInputFile(args.file as string);
        const result = await presentationService.extractPptxImages(data, basename(args.file as string));
        const outDir = dirname(resolve(args.file as string));
        const outputPaths: string[] = [];
        for (const f of result.outputFiles) {
          const p = join(outDir, f.name);
          await writeOutputFile(f.data as Buffer, p);
          outputPaths.push(p);
        }
        return { content: [{ type: 'text', text: `✅ Extracted ${outputPaths.length} images from PPTX:\n${outputPaths.map(p => `  • ${p}`).join('\n')}` }] };
      }

      case 'pptx_to_html': {
        const data = await readInputFile(args.file as string);
        const result = await presentationService.pptxToHtml(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.html');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted PPTX slides to HTML deck → ${outputPath}` }] };
      }

      case 'read_pptx_metadata': {
        const data = await readInputFile(args.file as string);
        const result = await presentationService.readPptxMetadata(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'word_count': {
        const data = await readInputFile(args.file as string);
        const result = await textService.analyzeTextStats(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'pdf_to_docx': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.pdfToDocx(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.docx');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted PDF to Word DOCX → ${outputPath}` }] };
      }

      case 'pdf_to_html': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.pdfToHtml(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.html');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted PDF to HTML → ${outputPath}` }] };
      }

      case 'excel_to_html': {
        const data = await readInputFile(args.file as string);
        const result = await spreadsheetService.excelToHtml(data, basename(args.file as string), { sheetName: args.sheetName as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.html');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted Excel to HTML Table → ${outputPath}` }] };
      }

      case 'pdf_to_images': {
        const data = await readInputFile(args.file as string);
        const result = await pdfService.pdfToImages(data, basename(args.file as string));
        const outDir = dirname(resolve(args.file as string));
        const outputPaths: string[] = [];
        for (const f of result.outputFiles) {
          const p = join(outDir, f.name);
          await writeOutputFile(f.data as Buffer, p);
          outputPaths.push(p);
        }
        return { content: [{ type: 'text', text: `✅ Extracted ${outputPaths.length} images from PDF:\n${outputPaths.map(p => `  • ${p}`).join('\n')}` }] };
      }

      // ── Archive Tools (Phase 3) ───────────────────────────
      case 'create_zip': {
        const files = await readMultipleFiles(args.files as string[]);
        const result = await archiveService.createZip(files, { outputFilename: args.outputPath ? basename(args.outputPath as string) : undefined });
        const outputPath = (args.outputPath as string) || join(dirname(resolve((args.files as string[])[0])), 'archive.zip');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Created ZIP archive with ${files.length} files → ${outputPath}` }] };
      }

      case 'extract_zip': {
        const data = await readInputFile(args.file as string);
        const result = await archiveService.extractZip(data, basename(args.file as string));
        const outDir = dirname(resolve(args.file as string));
        const outputPaths: string[] = [];
        for (const f of result.outputFiles) {
          const p = join(outDir, f.name);
          await writeOutputFile(f.data as Buffer, p);
          outputPaths.push(p);
        }
        return { content: [{ type: 'text', text: `✅ Extracted ${outputPaths.length} files from ZIP archive:\n${outputPaths.map(p => `  • ${p}`).join('\n')}` }] };
      }

      case 'list_archive_contents': {
        const data = await readInputFile(args.file as string);
        const result = await archiveService.listArchiveContents(data, basename(args.file as string));
        return { content: [{ type: 'text', text: result.outputFiles[0].data.toString('utf-8') }] };
      }

      // ── Audio Tools (Phase 3) ────────────────────────────
      case 'convert_audio': {
        const data = await readInputFile(args.file as string);
        const result = await audioService.convertAudio(data, basename(args.file as string), { targetFormat: args.targetFormat as any });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `.${args.targetFormat}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted audio to ${args.targetFormat} → ${outputPath}` }] };
      }

      case 'extract_audio_from_video': {
        const data = await readInputFile(args.file as string);
        const result = await audioService.extractAudioFromVideo(data, basename(args.file as string), { targetFormat: (args.targetFormat as any) || 'mp3' });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, `_audio.${args.targetFormat || 'mp3'}`);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted audio track from video → ${outputPath}` }] };
      }

      // ── Video Tools (Phase 3) ────────────────────────────
      case 'compress_video': {
        const data = await readInputFile(args.file as string);
        const result = await videoService.compressVideo(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_compressed.mp4');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Compressed video (${result.metadata?.compressionRatio} reduction) → ${outputPath}` }] };
      }

      case 'generate_video_thumbnail': {
        const data = await readInputFile(args.file as string);
        const result = await videoService.generateVideoThumbnail(data, basename(args.file as string), { timestamp: args.timestamp as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_thumb.jpg');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted video thumbnail frame → ${outputPath}` }] };
      }

      case 'trim_audio': {
        const data = await readInputFile(args.file as string);
        const result = await audioService.trimAudio(data, basename(args.file as string), { startTime: args.startTime as string, endTime: args.endTime as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_trimmed.mp3');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Trimmed audio clip → ${outputPath}` }] };
      }

      case 'change_audio_speed': {
        const data = await readInputFile(args.file as string);
        const result = await audioService.changeAudioSpeed(data, basename(args.file as string), { speed: args.speed as number });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_speed.mp3');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Changed audio playback speed → ${outputPath}` }] };
      }

      case 'audio_to_waveform': {
        const data = await readInputFile(args.file as string);
        const result = await audioService.audioToWaveform(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_waveform.png');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Generated audio waveform PNG → ${outputPath}` }] };
      }

      case 'video_to_gif': {
        const data = await readInputFile(args.file as string);
        const result = await videoService.videoToGif(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.gif');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted video to smooth animated GIF → ${outputPath}` }] };
      }

      case 'gif_to_video': {
        const data = await readInputFile(args.file as string);
        const result = await videoService.gifToVideo(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.mp4');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Converted animated GIF to MP4 video → ${outputPath}` }] };
      }

      case 'trim_video': {
        const data = await readInputFile(args.file as string);
        const result = await videoService.trimVideo(data, basename(args.file as string), { startTime: args.startTime as string, endTime: args.endTime as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_trimmed.mp4');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Trimmed video clip → ${outputPath}` }] };
      }

      case 'mute_video': {
        const data = await readInputFile(args.file as string);
        const result = await videoService.muteVideo(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_muted.mp4');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Muted video (removed audio stream) → ${outputPath}` }] };
      }

      case 'compress_gzip': {
        const data = await readInputFile(args.file as string);
        const result = await archiveService.compressGzip(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '.gz');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Compressed file with GZIP → ${outputPath}` }] };
      }

      case 'decompress_gzip': {
        const data = await readInputFile(args.file as string);
        const result = await archiveService.decompressGzip(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || join(dirname(resolve(args.file as string)), result.outputFiles[0].name);
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Decompressed GZIP file → ${outputPath}` }] };
      }

      case 'extract_text_from_image_ocr': {
        const data = await readInputFile(args.file as string);
        const result = await ocrService.extractTextFromImageOcr(data, basename(args.file as string), { language: args.language as string });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_ocr.txt');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted OCR text (${result.metadata?.ocrConfidence} confidence) → ${outputPath}` }] };
      }

      case 'hash_file': {
        const data = await readInputFile(args.file as string);
        const result = await utilityService.hashFile(data, basename(args.file as string));
        return { content: [{ type: 'text', text: JSON.stringify(result.metadata, null, 2) }] };
      }

      case 'summarize_text': {
        const data = await readInputFile(args.file as string);
        const result = await aiService.summarizeText(data, basename(args.file as string), { maxSentences: args.maxSentences as number });
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_summary.txt');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Summarized text document (${result.metadata?.compressionRatio} reduction) → ${outputPath}` }] };
      }

      case 'extract_keywords': {
        const data = await readInputFile(args.file as string);
        const result = await aiService.extractKeywords(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_keywords.json');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Extracted ${result.metadata?.totalKeywordsExtracted} keywords → ${outputPath}` }] };
      }

      case 'sentiment_analysis': {
        const data = await readInputFile(args.file as string);
        const result = await aiService.analyzeSentiment(data, basename(args.file as string));
        const outputPath = (args.outputPath as string) || getOutputPath(args.file as string, '_sentiment.json');
        await writeOutputFile(result.outputFiles[0].data as Buffer, outputPath);
        return { content: [{ type: 'text', text: `✅ Analyzed sentiment (${result.metadata?.sentiment}) → ${outputPath}` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
});

// ─── Resources ───────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'toolkit://tools',
        name: 'Available Tools',
        description: 'List of all available file processing tools',
        mimeType: 'application/json',
      },
      {
        uri: 'toolkit://formats',
        name: 'Supported Formats',
        description: 'All supported file formats',
        mimeType: 'application/json',
      },
      {
        uri: 'toolkit://version',
        name: 'Version Info',
        description: 'Server version and capabilities',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'toolkit://tools':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(getTools().map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            inputFormats: t.inputFormats,
            outputFormats: t.outputFormats,
          })), null, 2),
        }],
      };

    case 'toolkit://formats':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(SUPPORTED_FORMATS, null, 2),
        }],
      };

    case 'toolkit://version':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            name: 'Universal File Toolkit',
            version: '1.0.0',
            categories: getActiveCategories().map(c => c.name),
            totalTools: getTools().length,
          }, null, 2),
        }],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// ─── Prompts ─────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'merge-pdfs',
        description: 'Guided workflow for merging multiple PDF files',
        arguments: [
          { name: 'directory', description: 'Directory containing PDF files to merge', required: false },
        ],
      },
      {
        name: 'interactive-crop-guide',
        description: 'Guided interactive image cropping with aspect ratios',
        arguments: [
          { name: 'imagePath', description: 'Path to target image file to crop', required: true },
          { name: 'aspectRatio', description: 'Target aspect ratio (1:1, 4:3, 16:9, 9:16)', required: false },
        ],
      },
      {
        name: 'interactive-watermark-guide',
        description: 'Guided image/PDF watermarking workflow with visual position',
        arguments: [
          { name: 'filePath', description: 'Path to source image or PDF', required: true },
          { name: 'text', description: 'Watermark overlay text', required: true },
        ],
      },
      {
        name: 'interactive-pdf-reorder',
        description: 'Guided PDF page thumbnail reordering and rotation workflow',
        arguments: [
          { name: 'pdfPath', description: 'Path to target PDF file', required: true },
        ],
      },
      {
        name: 'batch-resize-images',
        description: 'Resize all images in a directory',
        arguments: [
          { name: 'directory', description: 'Directory containing images', required: true },
          { name: 'width', description: 'Target width in pixels', required: false },
          { name: 'height', description: 'Target height in pixels', required: false },
        ],
      },
      {
        name: 'convert-data-format',
        description: 'Convert a data file between formats (JSON, CSV, XML, YAML)',
        arguments: [
          { name: 'file', description: 'Path to the source file', required: true },
          { name: 'targetFormat', description: 'Target format (json, csv, xml, yaml)', required: true },
        ],
      },
      {
        name: 'optimize-images',
        description: 'Compress and optimize images for web use',
        arguments: [
          { name: 'directory', description: 'Directory containing images', required: true },
          { name: 'format', description: 'Target format (webp recommended)', required: false },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const name = request.params.name;
  const args: Record<string, any> = request.params.arguments || {};

  switch (name) {
    case 'merge-pdfs':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please merge all PDF files${args?.directory ? ` in the directory "${args.directory}"` : ''} into a single PDF. Use the merge_pdf tool. List the files first, then merge them in alphabetical order.`,
          },
        }],
      };

    case 'interactive-crop-guide':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please help crop the image "${args?.imagePath}". Use the crop_image tool with left, top, width, height parameters matching ${args?.aspectRatio || '1:1'} ratio bounds.`,
          },
        }],
      };

    case 'interactive-watermark-guide':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Apply watermark text "${args?.text || 'CONFIDENTIAL'}" to "${args?.filePath}". Use add_watermark or add_watermark_image with opacity 0.6 and center placement.`,
          },
        }],
      };

    case 'interactive-pdf-reorder':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Inspect and reorder PDF pages for "${args?.pdfPath}". Use rearrange_pages or rotate_pdf to visually adjust orientation and page sequence.`,
          },
        }],
      };

    case 'batch-resize-images':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Resize all images in "${args?.directory || '.'}" to ${args?.width || 1200}x${args?.height || 'auto'} pixels. Use the resize_image tool for each image. Maintain aspect ratio.`,
          },
        }],
      };

    case 'convert-data-format':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Convert the file "${args?.file}" to ${args?.targetFormat || 'JSON'} format. Use the appropriate conversion tool and save the output next to the original file.`,
          },
        }],
      };

    case 'optimize-images':
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Optimize all images in "${args?.directory || '.'}" for web use. Convert them to ${args?.format || 'WebP'} format with quality 80 using the convert_image or compress_image tools.`,
          },
        }],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ─── Start Server ────────────────────────────────────────────

async function main() {
  const isSse = process.argv.includes('--sse') || process.env.TRANSPORT === 'sse' || !!process.env.PORT;

  if (isSse) {
    const port = parseInt(process.env.PORT || '3002', 10);
    const host = process.env.HOST || '0.0.0.0';

    let sseTransport: SSEServerTransport | null = null;

    const httpServer = http.createServer(async (req, res) => {
      // Enable CORS for web MCP clients and Claude
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/sse' && req.method === 'GET') {
        sseTransport = new SSEServerTransport('/messages', res);
        await server.connect(sseTransport);
        return;
      }

      if (url.pathname === '/messages' && req.method === 'POST') {
        if (!sseTransport) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No active SSE connection established yet' }));
          return;
        }
        await sseTransport.handlePostMessage(req, res);
        return;
      }

      if (url.pathname === '/' || url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'Universal File Toolkit MCP Server',
          version: '1.0.0',
          transport: 'SSE',
          sseEndpoint: '/sse',
          messagesEndpoint: '/messages',
          toolsCount: 108,
          timestamp: new Date().toISOString()
        }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found', endpoints: ['/sse', '/messages', '/health'] }));
    });

    httpServer.listen(port, host, () => {
      console.log(`🚀 Universal File Toolkit MCP Server running on SSE at http://${host}:${port}/sse`);
      console.log(`📚 Health check available at http://${host}:${port}/health`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Universal File Toolkit MCP Server running on STDIO');
  }
}

main().catch(console.error);

