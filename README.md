# 🚀 Universal File Claude Connector

> **The Ultimate All-in-One Local 111-Tool File Processing Engine for Claude Desktop**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol_v1.x-brightgreen.svg)](https://modelcontextprotocol.io/)
[![Tools Count](https://img.shields.io/badge/Tools-111_Active_Tools-orange.svg)](#-tool-directory-111-tools)

---

## 🎯 Aim & Mission

**Universal File Claude Connector** turns your Claude Desktop application into a powerful, local file-processing suite equivalent to iLovePDF, Smallpdf, TinyPNG, ImageMagick, Pandoc, and FFmpeg combined — **without uploading any of your files to third-party cloud servers**.

When you ask Claude to merge PDFs, crop images, convert Excel files, compress videos, or extract OCR text, **all operations execute 100% locally on your computer's CPU and disk** via standard Model Context Protocol (MCP) STDIO.

---

## ✨ Key Highlights

- 🔒 **100% Privacy & Local File Safety**: Your binary files (PDFs, DOCX, XLSX, Images, Videos, MP3s) never leave your machine.
- ⚡ **111 Professional Tools**: Manipulate documents, media, data structures, archives, and AI analysis.
- 🪄 **1-Click Auto Connector Setup**: Non-technical users can double-click `install.bat` to automatically configure `claude_desktop_config.json` with zero manual JSON editing.
- 🎥 **Bundled FFmpeg Media Engine**: Video thumbnail extraction, compression, GIF conversion, and audio slicing work right out of the box.

---

## 🛠️ Tool Directory (111 Tools Across 11 Categories)

| Category | Tools | Description & Capabilities |
| :--- | :---: | :--- |
| **📄 PDF Professional Toolkit** | **28** | Merge, split, compress, rotate, watermark, page numbers, password protect, **`insert_pages`**, **`duplicate_pages`**, **`swap_pages`**, **`reverse_pages`**, **`edit_pdf_metadata`**, **`flatten_pdf_form`**, **`extract_form_fields`**, **`pdf_to_txt`**, **`txt_to_pdf`**, **`crop_pdf`**, **`resize_pdf_pages`**, **`validate_pdf`** |
| **🖼️ Image Processing Toolkit** | **20** | Resize, crop, rotate, flip, compress, format conversion, blur, sharpen, EXIF strip, thumbnails, **`invert_image`**, **`gamma_image`**, **`threshold_image`**, **`dominant_colors`**, **`trim_transparent_edges`** |
| **📈 Excel & Spreadsheets** | **12** | Excel ↔ CSV, Excel ↔ JSON, **`excel_to_html`**, deduplication, sheet merging, transpose, **`protect_workbook`**, **`split_workbook`**, **`find_replace_excel`**, **`workbook_statistics`** |
| **📊 Data Interchange** | **12** | JSON ↔ CSV, JSON ↔ XML, JSON ↔ YAML, Markdown ↔ HTML, formatting, minification |
| **📝 Word Documents** | **10** | Extract text/images/links, **`docx_to_html`**, **`docx_to_markdown`**, **`text_to_docx`**, **`merge_docx`**, **`replace_text_docx`**, **`extract_docx_comments`**, **`word_count_docx`** |
| **🎬 Video Processing (FFmpeg)** | **6** | **`generate_video_thumbnail`**, **`compress_video`**, **`video_to_gif`**, **`gif_to_video`**, **`trim_video`**, **`mute_video`** |
| **🖥️ PowerPoint Presentation** | **5** | Extract slide text, speaker notes, images, **`pptx_to_html`**, **`read_pptx_metadata`** |
| **📦 Archives & Compression** | **5** | Create ZIP, Extract ZIP, List contents, **`compress_gzip`**, **`decompress_gzip`** |
| **🎵 Audio Processing** | **5** | Convert audio, Extract audio from video, **`trim_audio`**, **`change_audio_speed`**, **`audio_to_waveform`** |
| **🤖 OCR, AI & Security** | **7** | **`extract_text_from_image_ocr`**, **`hash_file`**, **`summarize_text`**, **`extract_keywords`**, **`sentiment_analysis`** |
| **✍️ Text Analytics** | **1** | Word count, character count, readability metrics, reading time |

---

## ⚙️ How It Works

```text
┌─────────────────────────┐         STDIO MCP Protocol          ┌──────────────────────────────────┐
│   Claude Desktop App    │ ◄─────────────────────────────────► │  Universal File Claude Connector │
│ (Chat UI & Directives)  │                                     │     (Local Node.js Engine)       │
└─────────────────────────┘                                     └──────────────────────────────────┘
                                                                                 │
                                                                   Reads & Writes Local Files Directly
                                                                                 │
                                                                                 ▼
                                                                 ┌──────────────────────────────────┐
                                                                 │      Your Local Computer Disk    │
                                                                 │ (C:\Users\... / Documents / etc) │
                                                                 └──────────────────────────────────┘
```

1. **Prompt Command**: You ask Claude: *"Merge these 3 PDFs"* or *"Generate a YouTube thumbnail from my video"*.
2. **Local MCP Request**: Claude Desktop sends a command payload over local STDIO to `Universal File Claude Connector`.
3. **Local Execution**: Node.js and bundled FFmpeg process the binary file directly on your hard drive.
4. **Result Output**: The modified file is saved to your disk and reported back in chat!

---

## 📥 Installation & Setup Guide

### Option 1: 1-Click Auto Setup (Recommended for Non-Tech Users)

1. **Download & Extract** this repository to any folder on your computer.
2. **Run Installer**:
   - **Windows**: Double-click **`install.bat`**
   - **macOS / Linux**: Open Terminal in the project directory and run `node install.js`
3. **Follow Prompt**: Choose package option `1` (Complete Suite).
4. **Restart Claude Desktop**: Open or restart Claude Desktop, and all **111 tools** will automatically be active!

---

### Option 2: Manual Configuration

If you prefer to configure your `claude_desktop_config.json` manually:

1. **Clone Repository & Build**:
   ```bash
   git clone https://github.com/Irfanpathan21/Universal-File-Claude-Connector.git
   cd Universal-File-Claude-Connector
   npm run build
   ```

2. **Add to Claude Configuration File**:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

   Add the following under `"mcpServers"`:
   ```json
   {
     "mcpServers": {
       "universal-file-toolkit": {
         "command": "node",
         "args": [
           "C:\\FULL\\PATH\\TO\\Universal-File-Claude-Connector\\packages\\mcp-server\\dist\\index.js"
         ]
       }
     }
   }
   ```

3. **Restart Claude Desktop**.

---

## 💻 Technical Stack

- **Core**: Node.js, TypeScript (ESM workspaces)
- **PDF Engine**: `pdf-lib`, `pdf-parse`
- **Image Engine**: `sharp`, `tesseract.js`
- **Spreadsheet Engine**: `exceljs`, `papaparse`
- **Document Engine**: `docx`, `mammoth`, `jszip`
- **Media Engine**: FFmpeg (via `@ffmpeg-installer/ffmpeg`)
- **Protocol**: Official Model Context Protocol SDK (`@modelcontextprotocol/sdk` v1.x)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
