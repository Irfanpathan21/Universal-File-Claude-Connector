/**
 * Universal File Toolkit — Shared Library
 *
 * This is the main entry point for the shared processing library.
 * All processing logic lives here and is consumed by:
 *  - Backend (Fastify REST API)
 *  - MCP Server
 *  - CLI
 */

// Types
export * from './types/index.js';

// Errors
export * from './errors/index.js';

// Utilities
export * from './utils/index.js';

// Tool Registry
export {
  tools,
  categories,
  getTools,
  getToolById,
  getToolsByCategory,
  searchTools,
  getCategories,
  getActiveCategories,
} from './registry/index.js';

// PDF Service
export * as pdfService from './services/pdf/index.js';

// Image Service
export * as imageService from './services/image/index.js';

// Data Service
export * as dataService from './services/data/index.js';

// Document Service (Phase 2)
export * as documentService from './services/document/index.js';

// Spreadsheet Service (Phase 2)
export * as spreadsheetService from './services/spreadsheet/index.js';

// Presentation Service (Phase 2)
export * as presentationService from './services/presentation/index.js';

// Text Analysis Service (Phase 2)
export * as textService from './services/text/index.js';

// Archive Service (Phase 3)
export * as archiveService from './services/archive/index.js';

// Audio Service (Phase 3)
export * as audioService from './services/audio/index.js';

// Video Service (Phase 3)
export * as videoService from './services/video/index.js';

// OCR Service (Phase 4)
export * as ocrService from './services/ocr/index.js';

// Utility Service (Phase 4)
export * as utilityService from './services/utility/index.js';

// AI & NLP Service (Phase 4)
export * as aiService from './services/ai/index.js';
