# Installation & Deployment Guide — Universal File Toolkit

## Quick Start (Local Node.js)

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python 3.10+ (for PyMuPDF advanced PDF processing, optional pure JS fallback included)

### Steps

```bash
# 1. Clone repository
git clone https://github.com/Irfanpathan21/Universal-File-Claude-Connector.git
cd universal-file-toolkit

# 2. Install dependencies
pnpm install

# 3. Build shared libraries and packages
pnpm build

# 4. Start Development Web Server & API
pnpm dev:web
```

- Web UI: `http://localhost:3000`
- API Server: `http://localhost:3001`
- Swagger OpenAPI Documentation: `http://localhost:3001/docs`

---

## MCP Server Setup

Universal File Toolkit supports **both** local MCP clients (Claude Desktop, Cursor, VS Code) and remote web clients (Claude Web on claude.ai).

### 1. Local Claude Desktop / Cursor
Start local MCP server on stdio:
```bash
pnpm mcp
```
Or configure in Claude Desktop configuration (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "universal-file-toolkit": {
      "command": "node",
      "args": ["<FULL_PATH>/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### 2. Claude Web (claude.ai) Remote MCP Connector
When hosted on cloud providers (e.g. Render), connect Claude Web using the **Streamable HTTP** endpoint:
```text
https://<your-mcp-subdomain>.onrender.com/mcp
```
- Supports full base64 file payloads directly from Claude chat.
- Automatically serves native image blocks for chat viewing and file resource blocks for download.
- Health probe is available at `GET /health` (`toolsCount: 100`).

See [Claude Web & Free Hosting Guide](FREE_HOSTING_AND_CLAUDE_GUIDE.md) and [MCP Setup Guide](mcp-setup.md) for full instructions.

---

## Docker Quick Start

To run everything in Docker with pre-installed binary dependencies (LibreOffice, Tesseract, Ghostscript):

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

The Web UI will be at `http://localhost:3000`.
