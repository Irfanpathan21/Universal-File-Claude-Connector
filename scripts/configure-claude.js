/**
 * Universal File Toolkit — Automatic Claude Integration Script
 *
 * Configures all 100 tools into:
 *   1. Claude Desktop App (claude_desktop_config.json)
 *   2. Claude Code CLI (.claude.json)
 *
 * Works on ANY user's PC out of the box with zero manual steps.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[37m\x1b[1m%s\x1b[0m', ' Universal File Toolkit — Claude Desktop & Code Auto-Connector');
console.log('\x1b[36m%s\x1b[0m', '================================================================');

// 1. Locate MCP Server entry point
const mcpDist = path.resolve(rootDir, 'packages', 'mcp-server', 'dist', 'index.js');
const mcpPkg = path.resolve(rootDir, 'packages', 'mcp-server');

if (!fs.existsSync(mcpDist)) {
  console.log('\x1b[33m%s\x1b[0m', '[*] MCP server build not found. Compiling now...');
  try {
    const tscBin = path.resolve(rootDir, 'node_modules', '.bin', os.platform() === 'win32' ? 'tsc.cmd' : 'tsc');
    if (fs.existsSync(tscBin)) {
      execSync(`"${tscBin}" -p "${path.join(mcpPkg, 'tsconfig.json')}"`, { stdio: 'inherit' });
    } else {
      execSync('npx -y tsc -p packages/mcp-server/tsconfig.json', { cwd: rootDir, stdio: 'inherit' });
    }
  } catch (err) {
    console.warn('\x1b[33m%s\x1b[0m', '    [!] Notice during build: ' + err.message);
  }
}

if (!fs.existsSync(mcpDist)) {
  console.error('\x1b[31m%s\x1b[0m', '[!] ERROR: Could not find or compile: ' + mcpDist);
  console.error('    Please run "npm run build" first.');
  process.exit(1);
}

// 2. Determine Node.js executable path
const nodePath = process.execPath;
console.log('\x1b[32m%s\x1b[0m', '[OK] Node.js Runtime: ' + nodePath);
console.log('\x1b[32m%s\x1b[0m', '[OK] MCP Server Engine: ' + mcpDist);

// 3. Helper to update JSON config file safely
function updateMcpConfig(filePath, targetName) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let config = { mcpServers: {} };
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8').trim();
        if (raw) {
          config = JSON.parse(raw);
        }
      } catch (parseErr) {
        console.warn(`    Notice: Overwriting corrupted/non-JSON ${targetName} file.`);
      }
    }

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      config.mcpServers = {};
    }

    // Register our server with absolute paths
    config.mcpServers['universal-file-toolkit'] = {
      command: nodePath,
      args: [mcpDist]
    };

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    console.log('\x1b[32m%s\x1b[0m', `[OK] Successfully configured for ${targetName}!`);
    console.log(`     Config File: ${filePath}`);
    return true;
  } catch (err) {
    console.warn(`\x1b[33m%s\x1b[0m`, `    [!] Could not configure ${targetName}: ${err.message}`);
    return false;
  }
}

// 4. Configure Claude Desktop (Windows, macOS, Linux)
let claudeDesktopPath = null;
if (os.platform() === 'win32') {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  claudeDesktopPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
} else if (os.platform() === 'darwin') {
  claudeDesktopPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
} else {
  claudeDesktopPath = path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

if (claudeDesktopPath) {
  updateMcpConfig(claudeDesktopPath, 'Claude Desktop App');
}

// 5. Configure Claude Code CLI if .claude.json exists in user profile
const claudeCodeConfig = path.join(os.homedir(), '.claude.json');
if (fs.existsSync(claudeCodeConfig)) {
  updateMcpConfig(claudeCodeConfig, 'Claude Code CLI');
}

// 6. Check if Claude Desktop is running
let isClaudeRunning = false;
try {
  if (os.platform() === 'win32') {
    const tasklist = execSync('tasklist /fi "imagename eq Claude.exe" 2>nul', { encoding: 'utf8' });
    if (tasklist.toLowerCase().includes('claude.exe')) {
      isClaudeRunning = true;
    }
  } else {
    const pgrep = execSync('pgrep -x "Claude" 2>/dev/null || true', { encoding: 'utf8' });
    if (pgrep.trim().length > 0) {
      isClaudeRunning = true;
    }
  }
} catch (e) {}

console.log('\x1b[36m%s\x1b[0m', '----------------------------------------------------------------');
if (isClaudeRunning) {
  console.log('\x1b[33m\x1b[1m%s\x1b[0m', ' [!] IMPORTANT: Claude Desktop is currently running in background.');
  console.log('\x1b[33m%s\x1b[0m', '     Please RESTART Claude Desktop so it loads the new tools:');
  console.log('     1. Right-click the Claude icon in the Windows Taskbar tray -> Quit');
  console.log('     2. Re-open Claude Desktop from the Start Menu');
} else {
  console.log('\x1b[32m\x1b[1m%s\x1b[0m', ' [+] Claude Desktop is configured and ready!');
  console.log('     Open Claude Desktop to see the 100 tools (hammer icon in chat).');
}
console.log('\x1b[36m%s\x1b[0m', '================================================================');
