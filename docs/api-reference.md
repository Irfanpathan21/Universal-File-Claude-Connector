# Universal File Toolkit — API Reference

## Base URL
`http://localhost:3001/api`

Interactive Swagger/OpenAPI UI: `http://localhost:3001/docs`

---

## Utility Endpoints

### List Tools
`GET /api/tools`
Query params: `q` (search query), `category` (category filter)

### Get Tool Details
`GET /api/tools/:id`

### List Categories
`GET /api/categories`

### Download Processed File
`GET /api/download/:id/:filename`

---

## PDF Operations (`/api/pdf`)

- `POST /api/pdf/merge` (multipart: `file` x N, `outputFilename`)
- `POST /api/pdf/split` (multipart: `file`, `ranges`, `splitEvery`)
- `POST /api/pdf/compress` (multipart: `file`, `quality`)
- `POST /api/pdf/rotate` (multipart: `file`, `angle`, `pages`)
- `POST /api/pdf/extract-pages` (multipart: `file`, `pages`)
- `POST /api/pdf/delete-pages` (multipart: `file`, `pages`)
- `POST /api/pdf/rearrange` (multipart: `file`, `order`)
- `POST /api/pdf/extract-text` (multipart: `file`)
- `POST /api/pdf/watermark` (multipart: `file`, `text`, `fontSize`, `opacity`, `position`)
- `POST /api/pdf/page-numbers` (multipart: `file`, `position`, `format`, `startNumber`)
- `POST /api/pdf/protect` (multipart: `file`, `password`)
- `POST /api/pdf/metadata` (multipart: `file`, `title`, `author`, `subject`)
- `POST /api/pdf/from-images` (multipart: `file` x N, `pageSize`)

---

## Image Operations (`/api/image`)

- `POST /api/image/resize` (multipart: `file`, `width`, `height`, `fit`)
- `POST /api/image/crop` (multipart: `file`, `left`, `top`, `width`, `height`)
- `POST /api/image/rotate` (multipart: `file`, `angle`)
- `POST /api/image/flip` (multipart: `file`, `direction`)
- `POST /api/image/compress` (multipart: `file`, `quality`, `format`)
- `POST /api/image/convert` (multipart: `file`, `format`, `quality`)
- `POST /api/image/blur` (multipart: `file`, `sigma`)
- `POST /api/image/sharpen` (multipart: `file`, `sigma`)
- `POST /api/image/adjust` (multipart: `file`, `brightness`, `saturation`)
- `POST /api/image/grayscale` (multipart: `file`)
- `POST /api/image/metadata` (multipart: `file`)
- `POST /api/image/remove-exif` (multipart: `file`)
- `POST /api/image/thumbnail` (multipart: `file`, `width`, `height`)
- `POST /api/image/batch-resize` (multipart: `file` x N, `width`, `height`)

---

## Data Operations (`/api/data`)

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
