# 🎨 Universal File Toolkit — UI/UX Design Specification (`design.md`)

> **Inspired by iLovePDF & Modern Document Platforms**  
> *A clean, modular, category-focused design system with rich dropdown navigation, vibrant color-coded file domains, drag-and-drop workflow, and instant visual tool execution.*

---

## 🎯 1. Design Vision & Core Principles

The **Universal File Toolkit Web Application** provides an intuitive, friction-free interface for processing 111+ file types locally or via API.

1. **Simplicity First (iLovePDF Style)**:
   - Top navbar features **dropdown menus grouped by file domain** (PDF, Image, Document, Spreadsheet, Presentation, Audio, Video, Archive, OCR, AI).
   - Users can jump directly to any conversion tool within 1 click.
2. **Color-Coded File Categories**:
   - Distinct color themes per file domain give instant visual feedback and aesthetic warmth.
3. **Unified File Dropzone**:
   - Universal drag-and-drop container with auto-detection of file format and smart tool suggestions.
4. **Instant Action & Live Preview**:
   - In-browser before/after comparison sliders, PDF page reordering modals, and real-time processing progress bars via WebSockets.

---

## 🎨 2. Color Palette & Category Design System

| File Category | Theme Color | Tailwind Palette | Accent Hex | Iconic Tools |
| :--- | :--- | :--- | :--- | :--- |
| **PDF Tools** | 🟥 Crimson Red | `red-600` / `rose-500` | `#E53E3E` | Merge PDF, Split PDF, Compress PDF, PDF to Word |
| **Image Tools** | 🟦 Cyan & Teal | `cyan-500` / `teal-400` | `#00A3C4` | Resize Image, Compress JPG/PNG, Remove BG, Convert WebP |
| **Word / Docs** | 🔷 Royal Blue | `blue-600` / `indigo-500` | `#2B6CB0` | DOCX to PDF, Merge Docs, Word Count, Text Extract |
| **Spreadsheets** | 🟩 Emerald Green | `emerald-600` / `green-500` | `#2F855A` | Excel to CSV, Merge XLSX, Formula Evaluator, Clean Data |
| **Presentations** | 🟧 Coral & Amber | `amber-500` / `orange-500` | `#DD6B20` | PPTX to PDF, Extract Slides, Compress PPT |
| **Video & Audio** | 🟪 Violet & Indigo | `violet-600` / `purple-500` | `#805AD5` | Compress Video, MP4 to MP3, Trim Audio, Convert MKV |
| **Archives** | 🟫 Warm Slate | `slate-600` / `zinc-700` | `#4A5568` | Extract ZIP/7Z, Create Zip, Compress Archive |
| **OCR & AI** | 🌸 Fuchsia & Magenta | `fuchsia-600` / `pink-500` | `#D69E2E` | Image to Text (OCR), AI Summarize, Metadata Cleaner |

---

## 📌 3. Navigation Header & Dropdown Architecture

### Top Navigation Bar (iLovePDF Model)

```text
[ 📁 Universal File Toolkit ]  [ 📄 PDF ▾ ]  [ 🖼️ Image ▾ ]  [ 📝 Word ▾ ]  [ 📊 Excel ▾ ]  [ 🎬 Media ▾ ]  [ ⚡ All 111 Tools ]  [ 🌙 Dark Mode ]
```

### Dropdown Menu Layout (Example: PDF Dropdown)

When a user hovers or clicks on `📄 PDF ▾`, a rich 3-column megamenu appears:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  CONVERT FROM PDF          CONVERT TO PDF           EDIT & OPTIMIZE                    │
│  ├─ 📝 PDF to Word         ├─ 📝 Word to PDF        ├─ 🧩 Merge PDF                    │
│  ├─ 📊 PDF to Excel        ├─ 📊 Excel to PDF       ├─ ✂️ Split PDF                    │
│  ├─ 🖼️ PDF to JPG          ├─ 🖼️ JPG to PDF         ├─ ⚡ Compress PDF                 │
│  └─ 📄 PDF to Text         └─ 🌐 HTML to PDF        └─ 🔒 Protect / Unlock PDF         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖼️ 4. Key Page Layouts

### A. Homepage (Hero & Tool Grid)
1. **Hero Section**:
   - Headline: *"Every file tool you need, 100% private and in one place."*
   - Large Universal File Dropzone with dashed border and pulsating upload icon.
2. **Category Quick Pills**:
   - Filter pills (`All`, `PDF`, `Images`, `Documents`, `Spreadsheets`, `Video`, `Audio`, `OCR`).
3. **Tool Cards Grid (3 to 4 columns)**:
   - Clean card layout with subtle hover elevation (`hover:-translate-y-1 hover:shadow-xl`).
   - Icon, tool title, short description, and category badge.

### B. Individual Tool Page (`/tools/:toolId`)
1. **Header Breadcrumb**: `Home / PDF Tools / Merge PDF`
2. **Upload Box**:
   - Drag & Drop area customized with tool's theme color.
   - Supports multiple file selection for batch tools.
3. **Option Parameters Form**:
   - Clean dynamic input fields generated via tool's Zod schema.
4. **Action Button**:
   - Prominent call-to-action button: e.g., `[ Merge PDFs Now → ]` with smooth loading spinner.
5. **Interactive Preview / Result**:
   - Download converted file button.
   - Side-by-side comparison slider or embedded document viewer.

---

## 🛠️ 5. Component Breakdown & Tailwind CSS Specifications

### 1. Main Header with Megamenu Navigation (`Header.tsx`)
- Container: `sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800`
- Category Trigger Buttons: `px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`

### 2. Universal Dropzone Component (`Dropzone.tsx`)
- Styling: `border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/50`
- Drag Active State: `border-blue-500 bg-blue-50/30 scale-[1.01]`

### 3. Tool Card Component (`ToolCard.tsx`)
- Outer Container: `group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200`
- Icon Wrapper: `w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`

---

## 🚀 6. Step-by-Step Implementation Roadmap

1. **Step 1 — Navbar with Dynamic Dropdowns**:
   - Update `packages/frontend/src/components/layout/Header.tsx` to render navigation items with Radix UI Dropdown Menu or CMDK mega-menu.
2. **Step 2 — Theme & Category Color Mapping**:
   - Create `packages/frontend/src/config/categories.ts` defining colors, icons, and tools for each category.
3. **Step 3 — Interactive Tool Runners**:
   - Build custom tool previewers (PDF preview, Image comparison slider, CSV table view).
4. **Step 4 — Responsive Layout & Mobile Drawer**:
   - Ensure the dropdowns collapse into a sleek slide-out mobile drawer on smaller screens.

---

> 💡 **Design Goal**: Achieve the instant familiarity of **iLovePDF** while empowering users with 111+ universal file operations.
