#!/usr/bin/env node

/**
 * Universal File Toolkit — CLI Launcher & Package Runner
 * Fully cross-platform, zero false-positives Windows/macOS/Linux compliant launcher.
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[36m%s\x1b[0m', ' Universal File Toolkit (UFT) — Starting App Services');
console.log('\x1b[36m%s\x1b[0m', '================================================================');

// 1. Ensure packages are built
const backendDist = path.join(rootDir, 'packages', 'backend', 'dist', 'index.js');
if (!fs.existsSync(backendDist)) {
  console.log('\x1b[33m%s\x1b[0m', '[*] First-time setup: Building core packages...');
  try {
    execSync('pnpm build || npm run build', { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.error('Build step encountered an error:', err.message);
  }
}

// 2. Start services via start-services.js
const startServicesScript = path.join(rootDir, 'scripts', 'start-services.js');
const child = spawn(process.execPath, [startServicesScript], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env
});

child.on('error', (err) => {
  console.error('Failed to start services:', err);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});
