# Installation Guide — Universal File Toolkit

## Quick Start (Local Node.js)

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/universal-file-toolkit.git
cd universal-file-toolkit

# 2. Install dependencies
pnpm install

# 3. Build shared libraries and apps
pnpm build

# 4. Start Development Web Server & API
pnpm dev:web
```

Open `http://localhost:3000` in your browser.
API Swagger Docs will be available at `http://localhost:3001/docs`.

---

## Docker Quick Start

To run everything in Docker with pre-installed binary dependencies (FFmpeg, LibreOffice, Tesseract, Ghostscript):

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

The Web UI will be at `http://localhost:3000`.

---

## MCP Server Setup

To connect to Claude Desktop, Cursor, or VS Code:

```bash
pnpm mcp
```
Or run `node packages/mcp-server/dist/index.js` directly. See [MCP Setup Guide](mcp-setup.md) for client configurations.
