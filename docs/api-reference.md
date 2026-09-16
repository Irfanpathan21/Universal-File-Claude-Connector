# Universal File Toolkit — API Reference

## Base URL
`http://localhost:3001/api` (Local) or `https://<your-backend-url>/api` (Production)

Interactive Swagger / OpenAPI UI: `http://localhost:3001/docs`  
Root Service Information: `GET http://localhost:3001/`  
Health Check: `GET http://localhost:3001/health`

---

## Utility & Information Endpoints (`/api`)

- `GET /` — API root service discovery, documentation links, and system status
- `GET /health` — Service health probe and uptime check
- `GET /api/tools` — List all 111 available file tools (Query params: `q`, `category`)
- `GET /api/tools/:id` — Get detailed metadata, parameters, and input/output formats for a tool
- `GET /api/categories` — List all 13 tool categories with tool counts
- `GET /api/download/:id/:filename` — Download a processed output file by job ID
- `GET /api/formats` — List all supported file extensions and MIME types
- `GET /api/version` — Get current API server version and release information
- `POST /api/hash` — Compute MD5, SHA-1, SHA-256, or SHA-512 checksums for any uploaded file

---

## PDF Operations (`/api/pdf`) — 28 Tools

- `POST /api/pdf/merge` (multipart: `files` x N, `outputFilename`)
- `POST /api/pdf/split` (multipart: `file`, `ranges`, `splitEvery`)
- `POST /api/pdf/compress` (multipart: `file`, `quality`)
- `POST /api/pdf/rotate` (multipart: `file`, `angle`, `pages`)
- `POST /api/pdf/extract-pages` (multipart: `file`, `pages`)
- `POST /api/pdf/delete-pages` (multipart: `file`, `pages`)
- `POST /api/pdf/rearrange` or `/rearrange-pages` (multipart: `file`, `order`)
- `POST /api/pdf/extract-text` (multipart: `file`)
- `POST /api/pdf/watermark` (multipart: `file`, `text`, `fontSize`, `opacity`, `position`)
- `POST /api/pdf/page-numbers` (multipart: `file`, `position`, `format`, `startNumber`)
- `POST /api/pdf/protect` (multipart: `file`, `password`)
- `POST /api/pdf/metadata` (multipart: `file`)
- `POST /api/pdf/from-images` (multipart: `files` x N, `pageSize`)
- `POST /api/pdf/to-docx` or `/to-word` (multipart: `file`)
- `POST /api/pdf/to-html` (multipart: `file`)
- `POST /api/pdf/extract-images` (multipart: `file`, `mode`, `format`)
- `POST /api/pdf/duplicate-pages` (multipart: `file`, `pages`)
- `POST /api/pdf/swap-pages` (multipart: `file`, `page1`, `page2`)
- `POST /api/pdf/reverse-pages` (multipart: `file`)
- `POST /api/pdf/edit-metadata` (multipart: `file`, `title`, `author`, `subject`, `creator`, `producer`)
- `POST /api/pdf/flatten-form` (multipart: `file`)
- `POST /api/pdf/to-txt` (multipart: `file`)
- `POST /api/pdf/from-txt` (multipart: `file`)
- `POST /api/pdf/validate` (multipart: `file`)
- `POST /api/pdf/crop` (multipart: `file`, `top`, `right`, `bottom`, `left`)
- `POST /api/pdf/resize-pages` (multipart: `file`, `pageSize`, `orientation`)

---

## Image Operations (`/api/image`) — 21 Tools

- `POST /api/image/resize` (multipart: `file`, `width`, `height`, `fit`)
- `POST /api/image/crop` (multipart: `file`, `left`, `top`, `width`, `height`)
- `POST /api/image/rotate` (multipart: `file`, `angle`)
- `POST /api/image/flip` (multipart: `file`, `direction`)
- `POST /api/image/compress` (multipart: `file`, `quality`, `format`)
- `POST /api/image/convert` (multipart: `file`, `format`, `quality`)
- `POST /api/image/blur` (multipart: `file`, `sigma`)
- `POST /api/image/sharpen` (multipart: `file`, `sigma`)
- `POST /api/image/adjust` (multipart: `file`, `brightness`, `contrast`, `saturation`)
- `POST /api/image/grayscale` (multipart: `file`)
- `POST /api/image/metadata` (multipart: `file`)
- `POST /api/image/remove-exif` (multipart: `file`)
- `POST /api/image/thumbnail` (multipart: `file`, `width`, `height`)
- `POST /api/image/batch-resize` (multipart: `files` x N, `width`, `height`)
- `POST /api/image/invert` (multipart: `file`)
- `POST /api/image/gamma` (multipart: `file`, `gamma`)
- `POST /api/image/threshold` (multipart: `file`, `threshold`)
- `POST /api/image/dominant-colors` (multipart: `file`, `count`)
- `POST /api/image/trim` (multipart: `file`, `threshold`)
- `POST /api/image/watermark` (multipart: `file`, `watermarkFile`, `text`, `position`, `opacity`)
- `POST /api/image/remove-bg` or `/remove-background` (multipart: `file`)

---

## Data Interchange & Parsing (`/api/data`) — 12 Tools

- `POST /api/data/json-to-csv` (multipart: `file`, `delimiter`)
- `POST /api/data/csv-to-json` (multipart: `file`, `header`)
- `POST /api/data/json-to-xml` (multipart: `file`, `rootName`)
- `POST /api/data/xml-to-json` (multipart: `file`)
- `POST /api/data/json-to-yaml` (multipart: `file`)
- `POST /api/data/yaml-to-json` (multipart: `file`)
- `POST /api/data/validate-json` (multipart: `file`)
- `POST /api/data/format-json` (multipart: `file`, `indent`)
- `POST /api/data/minify-json` (multipart: `file`)
- `POST /api/data/format-xml` (multipart: `file`)
- `POST /api/data/markdown-to-html` (multipart: `file`, `wrapInHtml`)
- `POST /api/data/html-to-markdown` (multipart: `file`)

---

## Word Document Processing (`/api/document`) — 10 Tools

- `POST /api/document/extract-text` (multipart: `file`)
- `POST /api/document/to-html` (multipart: `file`)
- `POST /api/document/extract-images` (multipart: `file`)
- `POST /api/document/extract-links` (multipart: `file`)
- `POST /api/document/to-markdown` (multipart: `file`)
- `POST /api/document/from-text` (multipart: `file` or JSON: `text`, `title`)
- `POST /api/document/merge` (multipart: `files` x N)
- `POST /api/document/replace-text` (multipart: `file`, `search`, `replace`)
- `POST /api/document/comments` (multipart: `file`)
- `POST /api/document/word-count` (multipart: `file`)

---

## Excel & Spreadsheets (`/api/spreadsheet`) — 12 Tools

- `POST /api/spreadsheet/excel-to-csv` (multipart: `file`, `sheetName`)
- `POST /api/spreadsheet/csv-to-excel` (multipart: `file`, `sheetName`)
- `POST /api/spreadsheet/json-to-excel` (multipart: `file`, `sheetName`)
- `POST /api/spreadsheet/excel-to-json` (multipart: `file`, `sheetName`, `headerRow`)
- `POST /api/spreadsheet/merge-sheets` (multipart: `files` x N)
- `POST /api/spreadsheet/remove-duplicates` (multipart: `file`, `columns`)
- `POST /api/spreadsheet/transpose` (multipart: `file`, `sheetName`)
- `POST /api/spreadsheet/to-html` (multipart: `file`)
- `POST /api/spreadsheet/protect` (multipart: `file`, `password`)
- `POST /api/spreadsheet/split` (multipart: `file`)
- `POST /api/spreadsheet/replace-cells` (multipart: `file`, `find`, `replace`)
- `POST /api/spreadsheet/stats` (multipart: `file`, `sheetName`)

---

## PowerPoint Presentations (`/api/presentation`) — 6 Tools

- `POST /api/presentation/extract-text` (multipart: `file`)
- `POST /api/presentation/extract-notes` (multipart: `file`)
- `POST /api/presentation/extract-images` (multipart: `file`)
- `POST /api/presentation/to-html` (multipart: `file`)
- `POST /api/presentation/metadata` (multipart: `file`)
- `POST /api/presentation/to-pdf` (multipart: `file`)

---

## Text Analytics (`/api/text`) — 1 Tool

- `POST /api/text/word-count` (multipart: `file` or JSON: `text`)

---

## Archives & Compression (`/api/archive`) — 5 Tools

- `POST /api/archive/create-zip` (multipart: `files` x N, `zipFilename`)
- `POST /api/archive/extract-zip` (multipart: `file`)
- `POST /api/archive/list-contents` (multipart: `file`)
- `POST /api/archive/compress-gzip` (multipart: `file`)
- `POST /api/archive/decompress-gzip` (multipart: `file`)

---

## Audio Processing (`/api/audio`) — 5 Tools

- `POST /api/audio/convert` (multipart: `file`, `targetFormat`, `bitrate`)
- `POST /api/audio/extract-from-video` (multipart: `file`, `audioFormat`)
- `POST /api/audio/trim` (multipart: `file`, `startTime`, `duration`)
- `POST /api/audio/change-speed` (multipart: `file`, `speedMultiplier`)
- `POST /api/audio/waveform` (multipart: `file`, `width`, `height`)

---

## Video Processing (`/api/video`) — 6 Tools

- `POST /api/video/compress` (multipart: `file`, `crf`, `preset`)
- `POST /api/video/thumbnail` (multipart: `file`, `timestamp`, `width`)
- `POST /api/video/to-gif` (multipart: `file`, `fps`, `width`, `startTime`, `duration`)
- `POST /api/video/from-gif` (multipart: `file`)
- `POST /api/video/trim` (multipart: `file`, `startTime`, `duration`)
- `POST /api/video/mute` (multipart: `file`)

---

## Optical Character Recognition (`/api/ocr`) — 1 Tool

- `POST /api/ocr/image-ocr` (multipart: `file`, `language`)

---

## AI Document Intelligence (`/api/ai`) — 3 Tools

- `POST /api/ai/summarize` (multipart: `file` or JSON: `text`, `maxSentences`)
- `POST /api/ai/extract-keywords` (multipart: `file` or JSON: `text`, `topN`)
- `POST /api/ai/sentiment` (multipart: `file` or JSON: `text`)
