#!/usr/bin/env node

/**
 * Universal File Toolkit — Service Orchestrator
 * Starts both Fastify Backend (Port 3001) and Vite Frontend (Port 3000)
 * Works across Windows, macOS, and Linux on any PC/laptop.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFile = fs.createWriteStream(path.join(logsDir, 'service.log'), { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}\n`;
  process.stdout.write(line);
  try { logFile.write(line); } catch (e) {}
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  log('Starting Universal File Toolkit services...');

  const nodeBin = process.execPath;

  // 1. Start Backend (Port 3001)
  const isBackendUp = await checkPort(3001);
  let backendProc = null;
  if (!isBackendUp) {
    const backendDir = path.join(rootDir, 'packages', 'backend');
    const backendDist = path.join(backendDir, 'dist', 'index.js');
    let backendCmd = nodeBin;
    let backendArgs = [backendDist];

    if (!fs.existsSync(backendDist)) {
      log('Built backend not found, launching with tsx...');
      const backendTs = path.join(backendDir, 'src', 'index.ts');
      backendCmd = process.platform === 'win32' ? 'cmd.exe' : 'npx';
      backendArgs = process.platform === 'win32'
        ? ['/c', 'npx', 'tsx', backendTs]
        : ['tsx', backendTs];
    } else {
      log('Launching backend from compiled dist...');
    }

    backendProc = spawn(backendCmd, backendArgs, {
      cwd: backendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3001', HOST: '0.0.0.0' },
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
    backendProc.on('exit', (code) => {
      log(`Backend process exited with code ${code}`);
    });
  } else {
    log('Backend already running on port 3001.');
  }

  // 2. Start Frontend (Port 3000)
  const isFrontendUp = await checkPort(3000);
  let frontendProc = null;
  if (!isFrontendUp) {
    const frontendDir = path.join(rootDir, 'packages', 'frontend');
    log('Launching Vite frontend on port 3000...');
    const frontendCmd = process.platform === 'win32' ? 'cmd.exe' : 'npx';
    const frontendArgs = process.platform === 'win32'
      ? ['/c', 'npx', 'vite', '--port', '3000', '--host']
      : ['vite', '--port', '3000', '--host'];

    frontendProc = spawn(frontendCmd, frontendArgs, {
      cwd: frontendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
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
    frontendProc.on('exit', (code) => {
      log(`Frontend process exited with code ${code}`);
    });
  } else {
    log('Frontend already running on port 3000.');
  }

  // Keep event loop alive
  const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

  // Graceful shutdown
  const cleanup = () => {
    log('Shutting down services...');
    clearInterval(keepAlive);
    if (backendProc) {
      try { backendProc.kill(); } catch (e) {}
    }
    if (frontendProc) {
      try { frontendProc.kill(); } catch (e) {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  log(`Service orchestrator error: ${err.message}`);
});
