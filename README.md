# 🚀 Universal File Claude Connector

> **The Ultimate All-in-One Local 100-Tool File Processing Engine for Claude Desktop**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol_v1.x-brightgreen.svg)](https://modelcontextprotocol.io/)
[![Tools Count](https://img.shields.io/badge/Tools-100_Active_Tools-orange.svg)](#-tool-directory-100-tools)

---

## 🎯 Aim & Mission

**Universal File Claude Connector** turns your Claude Desktop application into a powerful, local file-processing suite equivalent to iLovePDF, Smallpdf, TinyPNG, ImageMagick, and Pandoc combined — **without uploading any of your files to third-party cloud servers**.

When you ask Claude to merge PDFs, crop images, convert Excel files, or extract OCR text, **all operations execute 100% locally on your computer's CPU and disk** via standard Model Context Protocol (MCP) STDIO.

---

## ✨ Key Highlights

- 🔒 **100% Privacy & Local File Safety**: Your binary files (PDFs, DOCX, XLSX, Images, Documents) never leave your machine when using Claude Desktop.
- 🌐 **Full Claude Web & Mobile Support**: Connect directly from **claude.ai** and mobile apps using Streamable HTTP (`/mcp`) or SSE (`/sse`) with automatic base64 chat file processing and inline image returns.
- ⚡ **100 Active Professional Tools**: Manipulate documents, images, data structures, spreadsheets, archives, and AI analysis.
- 🪄 **1-Click Auto Connector Setup**: Non-technical users can double-click `install.bat` to automatically configure `claude_desktop_config.json` with zero manual JSON editing.

---

## 🛠️ Tool Directory (100 Tools Across 11 Categories)

See [`docs/AVAILABLE_TOOLS.md`](docs/AVAILABLE_TOOLS.md) for the complete directory of all 100 tools with descriptions and supported formats:

| Category | Tools | Description & Capabilities |
| :--- | :---: | :--- |
| **📄 PDF Professional Toolkit** | **28** | Merge, split, compress, rotate, watermark, page numbers, password protect, **`insert_pages`**, **`duplicate_pages`**, **`swap_pages`**, **`reverse_pages`**, **`edit_pdf_metadata`**, **`flatten_pdf_form`**, **`extract_form_fields`**, **`pdf_to_txt`**, **`txt_to_pdf`**, **`crop_pdf`**, **`resize_pdf_pages`**, **`validate_pdf`** |
| **🖼️ Image Processing Toolkit** | **21** | Resize, crop, rotate, flip, compress, format conversion, blur, sharpen, EXIF strip, thumbnails, **`invert_image`**, **`gamma_image`**, **`threshold_image`**, **`dominant_colors`**, **`trim_transparent_edges`** |
| **📈 Excel & Spreadsheets** | **12** | Excel ↔ CSV, Excel ↔ JSON, **`excel_to_html`**, deduplication, sheet merging, transpose, **`protect_workbook`**, **`split_workbook`**, **`find_replace_excel`**, **`workbook_statistics`** |
| **📊 Data Interchange** | **12** | JSON ↔ CSV, JSON ↔ XML, JSON ↔ YAML, Markdown ↔ HTML, formatting, minification |
| **📝 Word Documents** | **10** | Extract text/images/links, **`docx_to_html`**, **`docx_to_markdown`**, **`text_to_docx`**, **`merge_docx`**, **`replace_text_docx`**, **`extract_docx_comments`**, **`word_count_docx`** |
| **🖥️ PowerPoint Presentation** | **6** | Extract slide text, speaker notes, images, **`pptx_to_pdf`**, **`pptx_to_html`**, **`read_pptx_metadata`** |
| **📦 Archives & Compression** | **5** | Create ZIP, Extract ZIP, List contents, **`compress_gzip`**, **`decompress_gzip`** |
| **🤖 AI Document Intelligence** | **3** | **`summarize_text`**, **`extract_keywords`**, **`sentiment_analysis`** |
| **🔍 OCR Text Extraction** | **1** | **`extract_text_from_image_ocr`** (Tesseract OCR on PNG, JPG, TIFF) |
| **🔒 Checksum & Security** | **1** | **`hash_file`** (MD5, SHA1, SHA256, SHA512) |
| **✍️ Text Analytics** | **1** | Word count, character count, readability metrics, reading time |
| **Total** | **100** | |

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

1. **Prompt Command**: You ask Claude: *"Merge these 3 PDFs"* or *"Convert this Excel spreadsheet to CSV"*.
2. **Local MCP Request**: Claude Desktop sends a command payload over local STDIO to `Universal File Claude Connector`.
3. **Local Execution**: Node.js processes the binary file directly on your hard drive.
4. **Result Output**: The modified file is saved to your disk and reported back in chat!

---

## 📥 Installation & Setup Guide

### Option 1: 1-Click Auto Setup (Recommended for Non-Tech Users)

1. **Download & Extract** this repository to any folder on your computer.
2. **Run Installer**:
   - **Windows**: Double-click **`install.bat`**
   - **macOS / Linux**: Open Terminal in the project directory and run `node install.js`
3. **Follow Prompt**: Choose package option `1` (Complete Suite).
4. **Restart Claude Desktop**: Open or restart Claude Desktop, and all **100 tools** will automatically be active!

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

### Option 3: Claude Web (claude.ai) & Mobile Setup (Zero Local Install)

You can connect Claude directly from your browser or mobile phone:

1. Deploy the MCP server to **Render** (or any cloud host with HTTPS).
2. In **claude.ai**, go to **Settings** ➔ **Integrations / Connectors** ➔ **Add custom integration**.
3. Enter your connector URL:
   ```text
   https://<your-mcp-subdomain>.onrender.com/mcp
   ```
4. Claude Web will immediately connect to all **100 tools**. Chat file uploads and base64 documents are processed seamlessly with inline preview images and downloadable output attachments!

For step-by-step free deployment instructions, see [Free Hosting & Claude Guide](docs/FREE_HOSTING_AND_CLAUDE_GUIDE.md).

---

## 💻 Technical Stack

- **Core**: Node.js, TypeScript (ESM workspaces)
- **PDF Engine**: `pdf-lib`, `pdf-parse`
- **Image Engine**: `sharp`, `tesseract.js`
- **Spreadsheet Engine**: `exceljs`, `papaparse`
- **Document Engine**: `docx`, `mammoth`, `jszip`
- **Protocol**: Official Model Context Protocol SDK (`@modelcontextprotocol/sdk` v1.x)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
