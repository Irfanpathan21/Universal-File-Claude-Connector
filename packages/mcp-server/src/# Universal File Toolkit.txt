# 🛠️ Universal File Toolkit — Available Tools (111 Active Tools)

> Complete directory of all 111 file processing tools available via MCP (Claude Desktop, Claude Web, Cursor, VS Code) and REST API.

## Quick Summary by Category

| Category | Tools | Highlights |
| :--- | :---: | :--- |
| **PDF Professional Toolkit** | **28** | `merge_pdf`, `split_pdf`, `compress_pdf`, `rotate_pdf`, ... |
| **Image Processing Toolkit** | **21** | `resize_image`, `crop_image`, `rotate_image`, `flip_image`, ... |
| **Data Interchange & Parsing** | **12** | `json_to_csv`, `csv_to_json`, `json_to_xml`, `xml_to_json`, ... |
| **Word Document Processing** | **10** | `extract_docx_text`, `docx_to_html`, `extract_docx_images`, `extract_docx_hyperlinks`, ... |
| **Excel & Spreadsheets** | **12** | `excel_to_csv`, `csv_to_excel`, `excel_to_json`, `merge_excel_sheets`, ... |
| **PowerPoint Presentations** | **6** | `extract_pptx_text`, `extract_pptx_notes`, `extract_pptx_images`, `pptx_to_pdf`, ... |
| **Text Analytics & Word Count** | **1** | `word_count` |
| **Archives & Compression** | **5** | `create_zip`, `extract_zip`, `list_archive_contents`, `compress_gzip`, ... |
| **Audio Processing** | **5** | `convert_audio`, `extract_audio_from_video`, `trim_audio`, `change_audio_speed`, ... |
| **Video Processing (FFmpeg)** | **6** | `compress_video`, `generate_video_thumbnail`, `video_to_gif`, `gif_to_video`, ... |
| **Optical Character Recognition (OCR)** | **1** | `extract_text_from_image_ocr` |
| **Checksum & Metadata** | **1** | `hash_file` |
| **AI Document Intelligence** | **3** | `summarize_text`, `extract_keywords`, `sentiment_analysis` |

---

## 📋 Detailed Tool Catalog

### PDF Professional Toolkit (28 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `merge_pdf` | **Merge PDF** | Combine multiple PDF files into a single document | .pdf | .pdf |
| `split_pdf` | **Split PDF** | Split a PDF into multiple files by page ranges | .pdf | .pdf |
| `compress_pdf` | **Compress PDF** | Reduce PDF file size while maintaining quality | .pdf | .pdf |
| `rotate_pdf` | **Rotate PDF** | Rotate PDF pages by 90°, 180°, or 270° | .pdf | .pdf |
| `extract_pages` | **Extract Pages** | Extract specific pages from a PDF | .pdf | .pdf |
| `delete_pages` | **Delete Pages** | Remove specific pages from a PDF | .pdf | .pdf |
| `rearrange_pages` | **Rearrange Pages** | Reorder pages in a PDF | .pdf | .pdf |
| `extract_text` | **Extract Text** | Extract all text content from a PDF | .pdf | .txt |
| `add_watermark` | **Add Watermark** | Add a text watermark to every page of a PDF | .pdf | .pdf |
| `add_page_numbers` | **Add Page Numbers** | Add page numbers to a PDF document | .pdf | .pdf |
| `password_protect` | **Password Protect** | Add password protection to a PDF | .pdf | .pdf |
| `pdf_metadata` | **PDF Metadata** | View and edit PDF metadata (title, author, etc.) | .pdf | .pdf, .json |
| `images_to_pdf` | **Images to PDF** | Convert images into a PDF document | .png, .jpg, .jpeg | .pdf |
| `pdf_to_docx` | **PDF to Word (DOCX)** | Convert PDF document to an editable Word DOCX file | .pdf | .docx |
| `pdf_to_html` | **PDF to HTML** | Convert PDF document content into a styled HTML web page | .pdf | .html |
| `pdf_to_images` | **PDF to JPG / Images** | Extract embedded photos, graphics, and page images from PDF to JPG/PNG | .pdf | .jpg, .png |
| `insert_pages` | **Insert PDF Pages** | Insert pages from a source PDF into another target PDF at a specific page position | .pdf | .pdf |
| `duplicate_pages` | **Duplicate PDF Pages** | Duplicate specified pages in a PDF document | .pdf | .pdf |
| `swap_pages` | **Swap PDF Pages** | Swap the position of two pages in a PDF document | .pdf | .pdf |
| `reverse_pages` | **Reverse PDF Page Order** | Reverse the order of all pages in a PDF document | .pdf | .pdf |
| `edit_pdf_metadata` | **Edit PDF Metadata** | Modify Title, Author, Subject, Creator, and Producer properties of a PDF | .pdf | .pdf |
| `flatten_pdf_form` | **Flatten Interactive Form** | Flatten interactive form fields into permanent page content | .pdf | .pdf |
| `extract_form_fields` | **Extract Form Fields** | Inspect and extract interactive form field names and types from PDF | .pdf | .json |
| `pdf_to_txt` | **PDF to TXT** | Extract raw text content from PDF into a clean plain text file | .pdf | .txt |
| `txt_to_pdf` | **TXT to PDF** | Convert plain text (.txt) file into a formatted PDF document | .txt | .pdf |
| `crop_pdf` | **Crop PDF Margins** | Crop PDF page boundaries and outer whitespace margins | .pdf | .pdf |
| `resize_pdf_pages` | **Resize PDF Page Size** | Resize or scale PDF pages to standard paper sizes (A4, Letter, A3) | .pdf | .pdf |
| `validate_pdf` | **Validate PDF File** | Verify structural validity, integrity, and inspect properties of a PDF document | .pdf | .json |

### Image Processing Toolkit (21 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `resize_image` | **Resize Image** | Resize images to specific dimensions while maintaining aspect ratio | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif, .heic | .png, .jpg, .jpeg, .webp, .avif, .tiff |
| `crop_image` | **Crop Image** | Crop an image to specific dimensions | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif | .png, .jpg, .jpeg, .webp, .avif, .tiff |
| `rotate_image` | **Rotate Image** | Rotate an image by any angle | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif | .png, .jpg, .jpeg, .webp, .avif, .tiff |
| `flip_image` | **Flip Image** | Flip an image horizontally or vertically | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif | .png, .jpg, .jpeg, .webp, .avif, .tiff |
| `compress_image` | **Compress Image** | Reduce image file size with adjustable quality | .png, .jpg, .jpeg, .webp, .avif, .tiff | .png, .jpg, .jpeg, .webp, .avif |
| `convert_image` | **Convert Image** | Convert images between formats (PNG, JPG, WebP, AVIF, TIFF, GIF) | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif, .heic | .png, .jpg, .jpeg, .webp, .avif, .tiff, .gif |
| `image_blur` | **Blur Image** | Apply Gaussian blur to an image | .png, .jpg, .jpeg, .webp, .tiff | .png, .jpg, .jpeg, .webp, .tiff |
| `image_sharpen` | **Sharpen Image** | Sharpen an image to enhance details | .png, .jpg, .jpeg, .webp, .tiff | .png, .jpg, .jpeg, .webp, .tiff |
| `image_adjust` | **Adjust Image** | Adjust brightness, contrast, and saturation | .png, .jpg, .jpeg, .webp, .tiff | .png, .jpg, .jpeg, .webp, .tiff |
| `image_grayscale` | **Grayscale** | Convert an image to grayscale (black & white) | .png, .jpg, .jpeg, .webp, .tiff, .gif | .png, .jpg, .jpeg, .webp, .tiff |
| `image_metadata` | **Image Metadata** | View image metadata and EXIF data | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif, .heic | .json |
| `remove_exif` | **Remove EXIF** | Strip all EXIF metadata from an image for privacy | .png, .jpg, .jpeg, .webp, .tiff | .png, .jpg, .jpeg, .webp, .tiff |
| `generate_thumbnail` | **Generate Thumbnail** | Create a thumbnail version of an image | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif | .jpg, .png, .webp |
| `batch_resize` | **Batch Resize** | Resize multiple images at once and download as a ZIP archive | .png, .jpg, .jpeg, .webp, .gif, .bmp, .tiff, .avif | .zip, .png, .jpg, .jpeg, .webp, .avif, .tiff |
| `watermark_image` | **Watermark Image** | Add custom text or logo watermark overlay to images | .png, .jpg, .jpeg, .webp, .tiff, .avif | .png, .jpg, .jpeg, .webp |
| `remove_bg` | **Remove Background** | Automatically remove image background and make it transparent | .png, .jpg, .jpeg, .webp, .avif | .png, .webp |
| `invert_image` | **Invert Image Colors** | Invert colors of an image to create a negative photo effect | .png, .jpg, .jpeg, .webp, .avif, .tiff, .bmp | .png, .jpg, .webp |
| `gamma_image` | **Gamma Correction** | Apply gamma correction to adjust image luminance | .png, .jpg, .jpeg, .webp, .avif, .tiff, .bmp | .png, .jpg, .webp |
| `threshold_image` | **Image Thresholding** | Apply binary black & white threshold to image | .png, .jpg, .jpeg, .webp, .avif, .tiff, .bmp | .png, .jpg, .webp |
| `dominant_colors` | **Dominant Color Palette** | Extract dominant color palette and channel statistics from image | .png, .jpg, .jpeg, .webp, .avif, .tiff, .bmp | .json |
| `trim_transparent_edges` | **Trim Transparent Edges** | Crop and trim transparent or solid color outer borders from image | .png, .webp, .avif, .tiff | .png, .webp |

### Data Interchange & Parsing (12 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `json_to_csv` | **JSON to CSV** | Convert JSON arrays to CSV format | .json | .csv |
| `csv_to_json` | **CSV to JSON** | Convert CSV files to JSON format | .csv, .tsv | .json |
| `json_to_xml` | **JSON to XML** | Convert JSON data to XML format | .json | .xml |
| `xml_to_json` | **XML to JSON** | Convert XML data to JSON format | .xml | .json |
| `json_to_yaml` | **JSON to YAML** | Convert JSON data to YAML format | .json | .yaml, .yml |
| `yaml_to_json` | **YAML to JSON** | Convert YAML data to JSON format | .yaml, .yml | .json |
| `validate_json` | **Validate JSON** | Check if JSON data is valid and well-formed | .json | .json |
| `format_json` | **Format JSON** | Pretty-print and format JSON data | .json | .json |
| `minify_json` | **Minify JSON** | Minify JSON by removing whitespace | .json | .json |
| `format_xml` | **Format XML** | Pretty-print and format XML data | .xml | .xml |
| `markdown_to_html` | **Markdown to HTML** | Convert Markdown documents to styled HTML | .md, .markdown | .html |
| `html_to_markdown` | **HTML to Markdown** | Convert HTML pages to Markdown format | .html, .htm | .md |

### Word Document Processing (10 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `extract_docx_text` | **Extract Word Text** | Extract raw text content from DOCX documents | .docx, .doc | .txt |
| `docx_to_html` | **Word to HTML** | Convert DOCX documents to HTML with formatting | .docx, .doc | .html |
| `extract_docx_images` | **Extract Word Images** | Extract all embedded images from a Word document into original image formats or a single ZIP archive | .docx | .png, .jpg, .zip |
| `extract_docx_hyperlinks` | **Extract Word Links** | Extract all embedded URLs and hyperlinks from a Word document | .docx | .json |
| `docx_to_markdown` | **Word to Markdown** | Convert DOCX Word documents to Markdown format | .docx | .md |
| `text_to_docx` | **Text to Word** | Convert plain text or Markdown files into a Word DOCX document | .txt, .md | .docx |
| `merge_docx` | **Merge Word Documents** | Merge multiple Word (.docx) files into a single unified document with perfect alignment, styles, and tables preserved | .docx | .docx |
| `replace_text_docx` | **Find & Replace Word Text** | Find and replace target text occurrences inside a Word document | .docx | .docx |
| `extract_docx_comments` | **Extract Word Comments** | Extract reviewer comments and notes from a Word document | .docx | .json |
| `word_count_docx` | **Word Count & Statistics** | Calculate word count, character count, sentence count, and reading time in Word documents | .docx | .json |

### Excel & Spreadsheets (12 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `excel_to_csv` | **Excel to CSV** | Convert Excel workbook to CSV. Automatically separates all sheets into a ZIP folder if multiple sheets exist | .xlsx, .xls | .csv, .zip |
| `csv_to_excel` | **CSV to Excel** | Convert a CSV file to an Excel XLSX workbook | .csv, .tsv | .xlsx |
| `excel_to_json` | **Excel to JSON** | Convert Excel spreadsheet data to JSON array of objects (separates multiple sheets into a ZIP folder) | .xlsx, .xls | .json, .zip |
| `merge_excel_sheets` | **Merge Excel Workbooks** | Combine multiple Excel workbooks/sheets into a single workbook while preserving structure and formatting | .xlsx, .csv | .xlsx |
| `remove_csv_duplicates` | **Remove CSV Duplicates** | Remove duplicate rows from a CSV file | .csv | .csv |
| `json_to_excel` | **JSON to Excel** | Convert JSON array of objects into a formatted Excel XLSX workbook | .json | .xlsx |
| `transpose_sheet` | **Transpose Spreadsheet** | Transpose rows and columns in a CSV / spreadsheet | .csv | .csv |
| `excel_to_html` | **Excel to HTML Table** | Convert Excel spreadsheet to an HTML formatted table | .xlsx, .xls | .html |
| `protect_workbook` | **Protect Excel Workbook** | Add password protection to an Excel workbook (requires password to open) | .xlsx, .xls | .xlsx |
| `split_workbook` | **Split Excel Workbook** | Split a multi-sheet Excel workbook into separate well-structured individual sheet files preserving all formatting and layout | .xlsx, .xls | .xlsx, .zip |
| `find_replace_excel` | **Find & Replace Excel Cells** | Find and replace target cell values across all Excel worksheets | .xlsx, .xls | .xlsx |
| `workbook_statistics` | **Workbook Statistics** | Analyze Excel workbook structure, sheet counts, row counts, and stats | .xlsx, .xls, .csv | .json |

### PowerPoint Presentations (6 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `extract_pptx_text` | **Extract PPTX Text** | Extract raw text from all slides in a PowerPoint presentation | .pptx, .ppt | .txt |
| `extract_pptx_notes` | **Extract Speaker Notes** | Extract speaker notes from PowerPoint presentation slides | .pptx | .txt |
| `extract_pptx_images` | **Extract PPTX Images** | Extract all embedded images and graphics from PowerPoint slides into a ZIP archive | .pptx | .zip |
| `pptx_to_pdf` | **PPTX to PDF** | Convert PowerPoint (.pptx, .ppt) presentation slides directly into PDF document | .pptx, .ppt | .pdf |
| `pptx_to_html` | **PowerPoint to HTML Deck** | Convert PowerPoint (.pptx) presentation slides into a web HTML slide deck | .pptx | .html |
| `read_pptx_metadata` | **PowerPoint Metadata & Stats** | Extract presentation slide counts, speaker notes count, media count, and metadata | .pptx | .json |

### Text Analytics & Word Count (1 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `word_count` | **Text & Word Analysis** | Calculate word count, character count, sentence count, and reading time | .txt, .md, .html, .json, .csv | .json |

### Archives & Compression (5 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `create_zip` | **Create ZIP Archive** | Compress multiple files into a single ZIP archive | * | .zip |
| `extract_zip` | **Extract ZIP Archive** | Extract all files and folders from a ZIP archive | .zip | * |
| `list_archive_contents` | **List Archive Contents** | Inspect files and folders inside a ZIP archive without extracting | .zip | .json |
| `compress_gzip` | **GZIP Compress File** | Compress any single file using GZIP compression algorithm (.gz) | * | .gz |
| `decompress_gzip` | **GZIP Decompress File** | Decompress GZIP (.gz) archive file | .gz | * |

### Audio Processing (5 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `convert_audio` | **Convert Audio Format** | Convert audio files between MP3, WAV, AAC, OGG, FLAC, and M4A formats | .mp3, .wav, .aac, .ogg, .flac, .m4a | .mp3, .wav, .aac, .ogg, .flac, .m4a |
| `extract_audio_from_video` | **Extract Audio from Video** | Extract high-quality audio stream from MP4, MKV, AVI, or MOV video | .mp4, .mkv, .avi, .mov, .webm | .mp3, .wav, .aac |
| `trim_audio` | **Trim Audio** | Cut audio clip between start and end timestamps | .mp3, .wav, .aac, .ogg, .flac, .m4a | .mp3, .wav, .aac, .ogg, .flac |
| `change_audio_speed` | **Change Audio Speed** | Adjust audio playback speed (0.5x slow-motion to 2.0x fast-forward) | .mp3, .wav, .aac, .ogg, .flac, .m4a | .mp3, .wav, .aac |
| `audio_to_waveform` | **Audio Waveform Image** | Generate a visual waveform PNG image of any audio track | .mp3, .wav, .aac, .ogg, .flac, .m4a | .png |

### Video Processing (FFmpeg) (6 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `compress_video` | **Compress Video** | Reduce video file size using H.264 video compression | .mp4, .mkv, .avi, .mov, .webm | .mp4 |
| `generate_video_thumbnail` | **Video Frame Thumbnail** | Extract a high-resolution JPG thumbnail image from any video frame timestamp | .mp4, .mkv, .avi, .mov, .webm | .jpg |
| `video_to_gif` | **Video to Animated GIF** | Convert video clip into a smooth animated GIF file | .mp4, .mkv, .avi, .mov, .webm | .gif |
| `gif_to_video` | **GIF to MP4 Video** | Convert animated GIF files into lightweight MP4 video clips | .gif | .mp4 |
| `trim_video` | **Trim Video Clip** | Cut video clip between start and end timestamps | .mp4, .mkv, .avi, .mov, .webm | .mp4 |
| `mute_video` | **Mute Video (Strip Audio)** | Remove audio track from video file to create a silent video | .mp4, .mkv, .avi, .mov, .webm | .mp4 |

### Optical Character Recognition (OCR) (1 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `extract_text_from_image_ocr` | **Image OCR Text Extractor** | Perform Optical Character Recognition on PNG, JPG, or TIFF images to extract text | .png, .jpg, .jpeg, .tiff, .bmp, .webp | .txt |

### Checksum & Metadata (1 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `hash_file` | **File Checksum Hashing** | Calculate MD5, SHA1, SHA256, and SHA512 checksum hashes of any file | * | .json |

### AI Document Intelligence (3 Tools)

| Tool ID | Name | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| `summarize_text` | **AI Document Summarizer** | Summarize long text, documents, or extracted PDF content into key bullet points | .txt, .md, .html, .json, .pdf, .docx | .txt |
| `extract_keywords` | **AI Keyword Extractor** | Extract top keywords and key phrases from any document or text file | .txt, .md, .html, .json, .pdf, .docx | .json |
| `sentiment_analysis` | **AI Sentiment Analysis** | Analyze sentiment (Positive, Negative, Neutral) and emotion scores of text | .txt, .md, .html, .json, .pdf, .docx | .json |

---

## 💡 Claude Web & Remote MCP Usage

When using Claude Web (claude.ai) or remote MCP connectors, files uploaded in the conversation reside inside your chat container (`/mnt/user-data/...`).
Because remote servers cannot read local container paths directly across the network:
1. Claude encodes the file using `base64 -w0 <file>`.
2. Claude sends the base64 string or data URI (`data:application/pdf;base64,...`) in the `file` or `fileData` parameter.
3. The MCP server processes the file and returns images directly as native Claude chat images, and documents as downloadable resources.

## 🔌 Connection Endpoints

- **Modern Claude Web / Claude Desktop**: `https://uft-mcp-server.onrender.com/mcp` (Streamable HTTP)
- **Legacy SSE Clients**: `https://uft-mcp-server.onrender.com/sse`
- **Health Check**: `https://uft-mcp-server.onrender.com/health`
- **REST API Swagger Documentation**: `https://uft-api-backend.onrender.com/docs`
