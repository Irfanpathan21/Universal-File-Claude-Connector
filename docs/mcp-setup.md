# MCP Client Configuration Guide

The **Universal File Toolkit** provides a fully compliant Model Context Protocol (MCP) server exposing **100 active file processing tools** across 11 categories (PDF, Image, Spreadsheets, Word Documents, PowerPoint, Archives, OCR, AI Intelligence, Checksum, and Data Interchange).

---

## 🌐 Claude Web (claude.ai) & Claude Mobile (iOS / Android)

Claude Web connects to remote MCP servers via **Streamable HTTP** (or legacy **SSE**).

1. Go to **claude.ai** ➔ **Settings** ➔ **Integrations** / **Connectors** (or Custom MCP settings).
2. Click **Add custom integration** / **Add Server**:
   - **Name**: `Universal File Toolkit`
   - **URL**: `https://uft-mcp-server.onrender.com/mcp`
   - **Authentication**: None (`auth: none`)
3. Click **Add** / **Save**.
4. All **100 tools** will automatically be accessible in your conversations.

> **Note on Claude Web File Uploads**:
> Files uploaded in a chat session reside in Claude's internal container (`/mnt/user-data/...`). Because remote servers cannot read local container paths, Claude encodes files as base64 and passes the data directly to the tool. Output images are rendered directly inside your Claude chat, and generated documents are attached as downloadable resources.

---

## 💻 Claude Desktop (Windows / macOS)

### Option A: Local STDIO (Runs 100% locally on your computer)

Add the following to your `claude_desktop_config.json`:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "universal-file-toolkit": {
      "command": "node",
      "args": [
        "/absolute/path/to/universal-file-toolkit/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### Option B: Remote Server (No local Node.js installation needed)

```json
{
  "mcpServers": {
    "universal-file-toolkit": {
      "url": "https://uft-mcp-server.onrender.com/mcp"
    }
  }
}
```

---

## 🖱️ Cursor

Go to **Settings > Cursor Settings > Features > MCP**, and click **+ Add New MCP Server**:

- **Name**: `universal-file-toolkit`
- **Type**: `command` (or `sse`)
- **Command**: `node /absolute/path/to/universal-file-toolkit/packages/mcp-server/dist/index.js`
- **URL (if remote)**: `https://uft-mcp-server.onrender.com/sse`

---

## 📝 VS Code

In `.vscode/settings.json` or user `settings.json`:

```json
{
  "mcp.servers": {
    "universal-file-toolkit": {
      "command": "node",
      "args": [
        "/absolute/path/to/universal-file-toolkit/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

---

## 📋 Available Tool Categories (100 Tools)

See [`docs/AVAILABLE_TOOLS.md`](./AVAILABLE_TOOLS.md) for the complete directory of all 100 tools with descriptions and supported formats:

| Category | Tools | Highlights |
| :--- | :---: | :--- |
| **PDF Professional** | **28** | Merge, split, compress, rotate, watermark, extract images/text, protect, validate, convert |
| **Image Processing** | **21** | Resize, crop, convert, compress, dominant colors, transparent trim, threshold, filters |
| **Excel & Spreadsheets** | **12** | Excel ↔ CSV, Excel ↔ JSON, sheet merge, deduplication, password protect, statistics |
| **Data Interchange** | **12** | JSON ↔ CSV, JSON ↔ XML, JSON ↔ YAML, Markdown ↔ HTML, minify, format |
| **Word Documents** | **10** | Extract text/images/links, DOCX ↔ HTML, DOCX ↔ Markdown, Word merge, find & replace |
| **PowerPoint** | **6** | Extract text, notes, images, PPTX ➔ PDF, PPTX ➔ HTML, metadata |
| **Archives** | **5** | Create ZIP, extract ZIP, list contents, GZIP compress / decompress |
| **AI Document Intelligence** | **3** | Text summarization, keyword extraction, sentiment analysis |
| **OCR Text Extraction** | **1** | Extract text from scanned images and photos (Tesseract) |
| **Checksum & Security** | **1** | MD5, SHA1, SHA256, SHA512 file hashing |
| **Text Analytics** | **1** | Word count, character count, reading time |
