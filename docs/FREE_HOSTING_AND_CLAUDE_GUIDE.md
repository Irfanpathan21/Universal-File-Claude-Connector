# Universal File Toolkit — Free Hosting & Claude MCP Setup Guide

This guide explains:
1. **Can you host this just with GitHub?** (The honest truth & breakdown)
2. **How to host the entire web app for 100% FREE** (Frontend + Backend API)
3. **How to host the MCP server for 100% FREE** and get a direct SSE link
4. **How to connect that MCP link directly to ANY Claude device** (Claude Desktop, Claude Web on claude.ai, Claude Mobile on iPhone/Android, and Claude Enterprise)

---

## 1. Can you do that JUST with GitHub?

### The Short Answer:
**Partially, but NOT 100% by GitHub alone if you want an active remote backend & live MCP link.**

### Why?
| Feature | Supported on GitHub? | Details |
|---|---|---|
| **Web Frontend** | ✅ **Yes (100% Free)** | **GitHub Pages** can host your frontend static bundle (`HTML/CSS/JS`) for free forever. |
| **Git Repository & CI/CD** | ✅ **Yes (100% Free)** | GitHub stores all code, issues, actions, and Docker images. |
| **Active Node.js Backend API** | ❌ **No** | GitHub Pages *only* hosts static files. It cannot run Node.js, Fastify/Express, Sharp, FFmpeg, or LibreOffice. |
| **24/7 Remote MCP SSE Link** | ❌ **No** | Claude Web/Mobile needs a persistent HTTPS SSE endpoint. GitHub Actions shuts down after jobs finish, and GitHub Codespaces shuts down after 30 minutes of inactivity. |

### The Good News:
You can keep your code **100% on GitHub** and connect it with **1 click** to official, reputable **100% FREE cloud hosting services** (Vercel + Render or Hugging Face). They pull directly from your GitHub repo, automatically deploy whenever you push to GitHub, and cost **$0.00**.

---

## 2. 100% Free Hosting Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       YOUR GITHUB REPO                      │
│            github.com/your-username/universal-file-toolkit  │
└──────────────┬──────────────────────────────┬───────────────┘
               │ (Auto Deploy on Push)        │ (Auto Deploy on Push)
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│       FRONTEND WEB APP       │ │     BACKEND & MCP SERVER    │
│  Hosted on Vercel / Pages    │ │    Hosted on Render.com     │
│       (100% Free CDN)        │ │  (100% Free Web Service)   │
│                              │ │                             │
│  https://uft.vercel.app      │ │  https://uft.onrender.com   │
│                              │ │  ├── /api/... (Fastify API) │
│                              │ │  ├── /health (Status Check) │
│                              │ │  └── /sse (Remote MCP Link) │
└──────────────────────────────┘ └──────────────┬──────────────┘
                                                │ Direct Link
                                                ▼
                                 ┌─────────────────────────────┐
                                 │      ANY CLAUDE DEVICE      │
                                 │  • Claude Web (claude.ai)   │
                                 │  • Claude iOS / Android     │
                                 │  • Claude Desktop (Mac/PC)  │
                                 │  • Cursor / VS Code         │
                                 └─────────────────────────────┘
```

---

## 3. Step-by-Step Free Deployment

### Step A: Push Your Code to GitHub
1. Create a new repository on GitHub: `https://github.com/new` (e.g., `universal-file-toolkit`).
2. Push your project:
   ```bash
   git add .
   git commit -m "feat: complete Universal File Toolkit with visual workbenches & MCP SSE"
   git branch -M main
   git remote add origin https://github.com/<your-username>/universal-file-toolkit.git
   git push -u origin main
   ```

---

### Step B: Host the MCP Server & Backend on Render (100% Free)
**Render.com** provides free web services with automatic HTTPS and persistent URLs.

1. Go to [render.com](https://render.com) and sign up (free with GitHub).
2. Click **New +** ➔ **Web Service**.
3. Select your `universal-file-toolkit` GitHub repository.
4. Fill in these settings:
   - **Name**: `universal-file-toolkit-mcp`
   - **Region**: Closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Runtime**: `Node` (or `Docker` using `docker/Dockerfile`)
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm --filter @uft/mcp-server start:sse`
   - **Instance Type**: **Free**
5. Add Environment Variables:
   - `PORT`: `3002`
   - `TRANSPORT`: `sse`
   - `HOST`: `0.0.0.0`
6. Click **Deploy Web Service**.
7. Render will provide your public URL:
   `https://universal-file-toolkit-mcp.onrender.com`
   - Health check: `https://universal-file-toolkit-mcp.onrender.com/health`
   - **Your Direct MCP Link**: `https://universal-file-toolkit-mcp.onrender.com/sse`

*(Alternative Free Host: **Hugging Face Spaces** — Free Docker container with 16GB RAM and 2 vCPU).*

---

### Step C: Host the Web Frontend on Vercel or Cloudflare Pages (100% Free)
1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New** ➔ **Project** ➔ Import `universal-file-toolkit`.
3. Configure project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://universal-file-toolkit-mcp.onrender.com`
5. Click **Deploy**.
   Your web app is now live at: `https://universal-file-toolkit.vercel.app`!

---

## 4. How to Use the MCP Link Directly in ANY Claude Device

Now that you have your live public SSE URL:
`https://your-mcp-server.onrender.com/sse`

### Option 1: Claude Web (claude.ai) & Claude Mobile (iOS / Android)
In Claude Web or mobile devices:
1. Open Claude and go to **Settings** ➔ **Integrations** / **MCP Servers** (or your Organization/Custom MCP settings).
2. Add a new remote MCP server:
   - **Name**: `Universal File Toolkit`
   - **URL / Endpoint**: `https://your-mcp-server.onrender.com/sse`
   - **Transport**: `SSE`
3. Hit Save. Claude will now have direct access to all **108 file processing tools** right inside your chats from any device!

---

### Option 2: Claude Desktop (Windows / macOS)

Open your Claude Desktop config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Method A: Using your remote live link (No local installation required)
```json
{
  "mcpServers": {
    "universal-file-toolkit": {
      "url": "https://your-mcp-server.onrender.com/sse"
    }
  }
}
```

#### Method B: Local Stdio (Runs completely offline on your PC)
```json
{
  "mcpServers": {
    "universal-file-toolkit": {
      "command": "node",
      "args": [
        "C:/Users/ashup/.gemini/antigravity-ide/scratch/universal-file-toolkit/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

---

## 5. Summary Checklist

| Goal | Solution | Cost |
|---|---|---|
| **Code Storage** | GitHub Repository | Free |
| **Web Frontend App** | Vercel / Cloudflare Pages / GitHub Pages | Free |
| **Backend & MCP Engine** | Render.com Free Web Service | Free |
| **Claude Web / Mobile MCP** | `https://your-app.onrender.com/sse` | Free |
| **Claude Desktop MCP** | Remote URL or Local Node Stdio | Free |
| **Total Cost** | **$0.00 / month forever** | **100% Free** |
