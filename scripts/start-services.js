#!/usr/bin/env node

/**
 * Universal File Toolkit — Service Orchestrator
 * Ensures ports 3000 & 3001 are dedicated exclusively to Universal File Toolkit
 * by terminating any lingering or conflicting processes before launch.
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logFile = fs.createWriteStream(path.join(logsDir, 'service.log'), { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  process.stdout.write(line);
  try { logFile.write(line); } catch (e) {}
}

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr ":${port} " ^| findstr "LISTENING"') do taskkill /f /pid %a >nul 2>&1`, { stdio: 'ignore' });
    } catch (e) {}
  } else {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 >/dev/null 2>&1`, { stdio: 'ignore' });
    } catch (e) {}
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  log('Initializing Universal File Toolkit services...');

  // 1. Free ports 3000 & 3001 from any zombie/foreign processes
  log('Ensuring ports 3000 and 3001 are clear...');
  freePort(3001);
  freePort(3000);

  const nodeBin = process.execPath;

  // 2. Start Backend (Port 3001)
  const backendDir = path.join(rootDir, 'packages', 'backend');
  const backendDist = path.join(backendDir, 'dist', 'index.js');
  let backendCmd = nodeBin;
  let backendArgs = [backendDist];

  if (!fs.existsSync(backendDist)) {
    log('Compiled backend not found, launching with tsx...');
    const backendTs = path.join(backendDir, 'src', 'index.ts');
    backendCmd = process.platform === 'win32' ? 'cmd.exe' : 'npx';
    backendArgs = process.platform === 'win32'
      ? ['/c', 'npx', 'tsx', backendTs]
      : ['tsx', backendTs];
  } else {
    log('Launching backend on port 3001...');
  }

  const backendProc = spawn(backendCmd, backendArgs, {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3001', HOST: '127.0.0.1' },
  });

  backendProc.stdout.on('data', (d) => {
    const text = d.toString();
    process.stdout.write(text);
    try { logFile.write(`[BACKEND] ${text}`); } catch (e) {}
  });
  backendProc.stderr.on('data', (d) => {
    const text = d.toString();
    process.stderr.write(text);
    try { logFile.write(`[BACKEND ERR] ${text}`); } catch (e) {}
  });

  // 3. Start Frontend (Port 3000)
  const frontendDir = path.join(rootDir, 'packages', 'frontend');
  log('Launching Vite frontend on port 3000...');
  const frontendCmd = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const frontendArgs = process.platform === 'win32'
    ? ['/c', 'npx', 'vite', '--port', '3000', '--host', '127.0.0.1']
    : ['vite', '--port', '3000', '--host', '127.0.0.1'];

  const frontendProc = spawn(frontendCmd, frontendArgs, {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3000', BACKEND_PORT: '3001' },
  });

  frontendProc.stdout.on('data', (d) => {
    const text = d.toString();
    process.stdout.write(text);
    try { logFile.write(`[FRONTEND] ${text}`); } catch (e) {}
  });
  frontendProc.stderr.on('data', (d) => {
    const text = d.toString();
    process.stderr.write(text);
    try { logFile.write(`[FRONTEND ERR] ${text}`); } catch (e) {}
  });

  // Keep alive
  const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

  const cleanup = () => {
    log('Stopping services...');
    clearInterval(keepAlive);
    try { backendProc.kill(); } catch (e) {}
    try { frontendProc.kill(); } catch (e) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  log(`Service error: ${err.message}`);
});
