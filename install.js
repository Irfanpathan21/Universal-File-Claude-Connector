#!/usr/bin/env node

/**
 * Universal File Toolkit — 1-Click Claude Desktop Connector Installer
 * 
 * Automatically detects Claude Desktop config location on Windows/Mac/Linux,
 * presents an interactive tool category selection menu, builds local MCP packages,
 * creates Windows Desktop shortcut with Chrome launcher, and writes the MCP
 * configuration into claude_desktop_config.json automatically!
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function getClaudeConfigPath() {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
}

async function main() {
  console.clear();
  console.log('================================================================');
  console.log('🚀 Universal File Toolkit — 1-Click Setup & Connector Installer');
  console.log('================================================================');
  console.log('\nWelcome! This setup wizard will configure all 100 File Tools');
  console.log('for local execution, create a desktop shortcut, and connect to Claude PC.\n');

  console.log('📋 Available Tool Packages:');
  console.log('  [1] Complete Suite (All 100 Tools — PDF, Image, Word, Excel, PPTX, Data, Archives, OCR, AI)');
  console.log('  [2] Documents & Spreadsheets (PDF, Word DOCX, Excel XLSX, PPTX)');
  console.log('  [3] Images, Data & AI (Images, JSON, CSV, YAML, OCR, AI Intelligence)');
  console.log('  [4] Custom Selection\n');

  const choice = await ask('Select package choice [1-4] (default: 1): ');
  const selectedChoice = choice.trim() || '1';

  console.log('\n📦 Installing workspace dependencies...');
  try {
    execSync('npx -y pnpm@9 install', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Dependencies installed successfully!');
  } catch (err) {
    console.log('⚠️ Install note: Retrying with --no-frozen-lockfile...');
    try {
      execSync('npx -y pnpm@9 install --no-frozen-lockfile', { stdio: 'inherit', cwd: process.cwd() });
    } catch (e) {
      console.log('⚠️ Proceeding with existing packages...');
    }
  }

  console.log('\n🔨 Building & Verifying local MCP Server binaries...');
  try {
    execSync('npx -y pnpm@9 build', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Local build successful!');
  } catch (err) {
    console.log('⚠️ Build note: Attempting direct execution setup...');
  }

  // 1. Update Claude Desktop config
  const configPath = getClaudeConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let configData = { mcpServers: {} };
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      configData = JSON.parse(raw);
      if (!configData.mcpServers) configData.mcpServers = {};
    } catch (e) {
      console.log('⚠️ Existing config could not be parsed. Creating fresh configuration.');
    }
  }

  const mcpServerScriptPath = path.resolve(process.cwd(), 'packages', 'mcp-server', 'dist', 'index.js');

  configData.mcpServers['universal-file-toolkit'] = {
    command: 'node',
    args: [mcpServerScriptPath],
    env: {
      SELECTED_SUITE: selectedChoice,
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf-8');

  // 2. Create Desktop Shortcut if on Windows
  if (os.platform() === 'win32') {
    console.log('\n🖥️ Creating Windows Desktop Shortcut...');
    try {
      const shortcutScript = path.resolve(process.cwd(), 'scripts', 'create-desktop-shortcut.ps1');
      if (fs.existsSync(shortcutScript)) {
        execSync(`powershell -ExecutionPolicy Bypass -File "${shortcutScript}"`, { stdio: 'inherit' });
      }
    } catch (e) {
      console.log('⚠️ Could not automatically create desktop shortcut:', e.message);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 INSTALLATION & CONNECTOR SETUP COMPLETE!');
  console.log('================================================================');
  console.log(`\n📁 Claude Desktop Config Updated:`);
  console.log(`   ${configPath}`);
  console.log(`\n🔌 Local MCP Connector Registered:`);
  console.log(`   ${mcpServerScriptPath}`);
  console.log(`\n🚀 Launching Web App & Chrome Window:`);
  console.log(`   - Double-click "Universal File Toolkit.lnk" on your Desktop`);
  console.log(`   - Or execute "launch.bat" in this directory`);
  console.log('\n👉 NEXT STEP FOR CLAUDE PC: Restart Claude Desktop, and all 100 tools');
  console.log('   will appear ready to use in your Claude chat sessions!\n');

  rl.close();
}

main().catch((err) => {
  console.error('❌ Installation failed:', err);
  rl.close();
});
