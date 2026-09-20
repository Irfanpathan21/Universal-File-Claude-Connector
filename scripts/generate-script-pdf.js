import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mdPath = path.join(rootDir, 'script.md');
const htmlPath = path.join(rootDir, 'script.html');
const pdfPath = path.join(rootDir, 'UniversalFileToolkit-PresentationScript.pdf');

if (!fs.existsSync(mdPath)) {
  console.error('script.md not found!');
  process.exit(1);
}

const mdContent = fs.readFileSync(mdPath, 'utf8');

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inTable = false;
  let inList = false;
  let listType = 'ul';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table></div>\n'; inTable = false; }
      html += '<hr/>\n';
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table></div>\n'; inTable = false; }
      html += `<h1>${formatInline(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table></div>\n'; inTable = false; }
      // Add page break before major acts
      const isAct = line.includes('ACT ');
      html += `<h2 class="${isAct ? 'act-heading' : ''}">${formatInline(line.slice(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table></div>\n'; inTable = false; }
      html += `<h3>${formatInline(line.slice(4))}</h3>\n`;
      continue;
    }
    if (line.startsWith('#### ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table></div>\n'; inTable = false; }
      html += `<h4>${formatInline(line.slice(5))}</h4>\n`;
      continue;
    }

    // Table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (!inTable) {
        inTable = true;
        html += '<div class="table-container"><table>\n';
      }
      // Check if it's delimiter row |---|---|
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
        continue;
      }
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
      // Check if it's the first row (header)
      if (!html.includes('</thead>')) {
        html += '<thead><tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>\n';
      } else {
        html += '<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>\n';
      }
      continue;
    } else if (inTable) {
      html += '</tbody></table></div>\n';
      inTable = false;
    }

    // Blockquote or Visual Cue
    if (line.startsWith('> ') || line.startsWith('*Visual Cue:') || line.startsWith('*(Visual Cue:')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      const text = line.replace(/^[>*]\s*\(?Visual Cue:\s*/i, '').replace(/\)\*?$/, '');
      html += `<div class="visual-cue"><span class="badge-cue">🎬 Visual Cue:</span> ${formatInline(text)}</div>\n`;
      continue;
    }

    // Bullet lists
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { inList = true; listType = 'ul'; html += '<ul>\n'; }
      const content = line.replace(/^\s*[-*]\s+/, '');
      html += `<li>${formatInline(content)}</li>\n`;
      continue;
    }

    // Numbered lists
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList) { inList = true; listType = 'ol'; html += '<ol>\n'; }
      const content = line.replace(/^\s*\d+\.\s+/, '');
      html += `<li>${formatInline(content)}</li>\n`;
      continue;
    }

    if (inList && line.trim() === '') {
      html += `</${listType}>\n`;
      inList = false;
      continue;
    }

    // Paragraph
    if (line.trim()) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      
      // Highlight Speaker indicators
      if (line.startsWith('**Speaker:**') || line.startsWith('**Atharva:**') || line.startsWith('**Irfan:**') || line.startsWith('**Moksh:**') || line.startsWith('**Host')) {
        html += `<p class="speaker-tag">${formatInline(line)}</p>\n`;
      } else {
        html += `<p>${formatInline(line)}</p>\n`;
      }
    }
  }

  if (inList) html += `</${listType}>\n`;
  if (inTable) html += '</tbody></table></div>\n';

  return html;
}

function formatInline(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const bodyContent = markdownToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Universal File Toolkit — Presentation Script</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
    @bottom-right {
      content: counter(page);
    }
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #1e293b;
    background: #ffffff;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }

  h1 {
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2.5px solid #3b82f6;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 12px;
  }

  h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #1e3a8a;
    background: #f1f5f9;
    padding: 6px 12px;
    border-left: 5px solid #2563eb;
    border-radius: 0 6px 6px 0;
    margin-top: 24px;
    margin-bottom: 12px;
  }

  .act-heading {
    page-break-before: always;
    margin-top: 0;
    background: #eff6ff;
    border-left: 5px solid #1d4ed8;
    color: #1e40af;
  }

  /* Do not page-break before the first act */
  .act-heading:first-of-type {
    page-break-before: avoid;
  }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    color: #0f766e;
    margin-top: 16px;
    margin-bottom: 8px;
    border-bottom: 1px dashed #cbd5e1;
    padding-bottom: 4px;
  }

  h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #7c2d12;
    margin-top: 12px;
    margin-bottom: 6px;
  }

  p {
    margin: 0 0 10px 0;
    text-align: justify;
  }

  strong {
    color: #0f172a;
    font-weight: 600;
  }

  code {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 9pt;
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }

  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 18px 0;
  }

  /* Table styling */
  .table-container {
    margin: 14px 0;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }

  th {
    background: #1e293b;
    color: #ffffff;
    font-weight: 600;
    padding: 8px 10px;
    text-align: left;
    border: 1px solid #334155;
  }

  td {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
  }

  tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Visual Cue Box */
  .visual-cue {
    background: #fdf4ff;
    border-left: 4px solid #c026d3;
    padding: 8px 12px;
    margin: 10px 0;
    border-radius: 0 6px 6px 0;
    font-size: 9.5pt;
    color: #701a75;
  }

  .badge-cue {
    font-weight: 700;
    color: #a21caf;
    text-transform: uppercase;
    font-size: 8.5pt;
  }

  /* Speaker Tag */
  .speaker-tag {
    background: #ecfdf5;
    border-left: 4px solid #059669;
    padding: 5px 10px;
    margin: 12px 0 6px 0;
    color: #065f46;
    font-weight: 600;
    font-size: 10.5pt;
    border-radius: 0 4px 4px 0;
  }

  ul, ol {
    margin: 6px 0 12px 0;
    padding-left: 22px;
  }

  li {
    margin-bottom: 5px;
  }

  /* Cover-like header banner */
  .header-meta {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #ffffff;
    padding: 16px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .header-meta h1 {
    color: #ffffff;
    border-bottom: 2px solid #38bdf8;
    margin-bottom: 8px;
  }

  .header-meta p {
    color: #cbd5e1;
    font-size: 9.5pt;
    margin: 3px 0;
  }
</style>
</head>
<body>
<div class="header-meta">
  <h1>Universal File Toolkit (UFT)</h1>
  <p><strong>Official Master Video Presentation Script (Conversational Hinglish)</strong></p>
  <p>Target Duration: 35 – 40 Minutes | Presenters: Host, Atharva, Irfan, Moksh</p>
</div>
${bodyContent}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('[OK] Created HTML printable script:', htmlPath);

// Convert HTML to PDF via headless Microsoft Edge
const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

let edgeBin = edgePaths.find(p => fs.existsSync(p));

if (edgeBin) {
  console.log('[*] Generating PDF via Microsoft Edge Headless Engine...');
  const cmd = `"${edgeBin}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  try {
    execSync(cmd, { stdio: 'inherit' });
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log(`[OK] Successfully generated PDF: ${pdfPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  } catch (err) {
    console.error('[!] Error generating PDF with Edge:', err.message);
  }
} else {
  console.warn('[!] Microsoft Edge not found at standard path. HTML version saved.');
}
