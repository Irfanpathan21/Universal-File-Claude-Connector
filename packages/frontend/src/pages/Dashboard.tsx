/**
 * Screen 1 Specification: Home / Universal File Toolkit (`/`)
 * High Contrast Light & Dark Mode Typography
 */

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, Image as ImageIcon, File, Table, ArrowRight,
  Maximize2, FilePlus, Split, Archive, RefreshCw, Scissors, Layers, Globe, FileCode, FileSpreadsheet, Presentation
} from 'lucide-react';
import { FileDropActionModal } from '../components/tools/FileDropActionModal';
import { setPendingFiles } from '../stores/fileTransfer';
import { toast } from 'sonner';

const FEATURED_TOOLS = [
  // ── PDF Tools ──
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    accentColor: '#E53E3E',
    icon: FilePlus,
    description: 'Combine multiple PDFs into a single unified document in any order.',
    category: 'pdf',
    isPrimary: true,
  },
  {
    id: 'split_pdf',
    name: 'Split PDF',
    accentColor: '#E53E3E',
    icon: Split,
    description: 'Separate one or more pages from your PDF document easily.',
    category: 'pdf',
    isPrimary: false,
  },
  {
    id: 'compress_pdf',
    name: 'Compress PDF',
    accentColor: '#E53E3E',
    icon: Archive,
    description: 'Reduce PDF file size while maintaining the best visual quality.',
    category: 'pdf',
    isPrimary: false,
  },
  {
    id: 'pdf_to_docx',
    name: 'PDF to Word',
    accentColor: '#E53E3E',
    icon: FileText,
    description: 'Convert PDF document into an editable Microsoft Word DOCX file.',
    category: 'pdf',
    isPrimary: false,
  },

  // ── Image Tools ──
  {
    id: 'resize_image',
    name: 'Resize Image',
    accentColor: '#00A3C4',
    icon: Maximize2,
    description: 'Scale images to custom dimensions without losing quality.',
    category: 'image',
    isPrimary: true,
  },
  {
    id: 'crop_image',
    name: 'Crop Image',
    accentColor: '#00A3C4',
    icon: Scissors,
    description: 'Crop images with aspect ratio presets (1:1, 16:9, 9:16, 4:3, 3:2).',
    category: 'image',
    isPrimary: false,
  },
  {
    id: 'remove_bg',
    name: 'Remove Background',
    accentColor: '#00A3C4',
    icon: RefreshCw,
    description: 'Remove photo backgrounds automatically with AI precision cutout.',
    category: 'image',
    isPrimary: false,
  },
  {
    id: 'compress_image',
    name: 'Compress Image',
    accentColor: '#00A3C4',
    icon: Archive,
    description: 'Reduce JPG, PNG, or WebP file size with high visual fidelity.',
    category: 'image',
    isPrimary: false,
  },

  // ── Word Tools ──
  {
    id: 'extract_docx_text',
    name: 'Extract Word Text',
    accentColor: '#2B6CB0',
    icon: FileText,
    description: 'Extract raw text, paragraphs, and content from Word documents.',
    category: 'document',
    isPrimary: true,
  },
  {
    id: 'docx_to_html',
    name: 'Word to HTML',
    accentColor: '#2B6CB0',
    icon: Globe,
    description: 'Convert DOCX documents to styled HTML web pages with formatting.',
    category: 'document',
    isPrimary: false,
  },
  {
    id: 'merge_docx',
    name: 'Merge Word Documents',
    accentColor: '#2B6CB0',
    icon: Layers,
    description: 'Combine multiple Word (.docx) files into a single unified document.',
    category: 'document',
    isPrimary: false,
  },
  {
    id: 'text_to_docx',
    name: 'Text to Word',
    accentColor: '#2B6CB0',
    icon: File,
    description: 'Convert plain text or Markdown files into editable Word documents.',
    category: 'document',
    isPrimary: false,
  },

  // ── Excel Tools ──
  {
    id: 'excel_to_csv',
    name: 'Excel to CSV',
    accentColor: '#2F855A',
    icon: Table,
    description: 'Extract spreadsheet sheets into comma-separated values easily.',
    category: 'spreadsheet',
    isPrimary: true,
  },
  {
    id: 'csv_to_excel',
    name: 'CSV to Excel',
    accentColor: '#2F855A',
    icon: FileSpreadsheet,
    description: 'Convert CSV data files into formatted Microsoft Excel workbooks.',
    category: 'spreadsheet',
    isPrimary: false,
  },
  {
    id: 'excel_to_json',
    name: 'Excel to JSON',
    accentColor: '#2F855A',
    icon: FileCode,
    description: 'Transform spreadsheet rows and columns into clean JSON structures.',
    category: 'spreadsheet',
    isPrimary: false,
  },
  {
    id: 'merge_excel_sheets',
    name: 'Merge Excel Sheets',
    accentColor: '#2F855A',
    icon: Layers,
    description: 'Combine multiple Excel workbooks into a single spreadsheet.',
    category: 'spreadsheet',
    isPrimary: false,
  },

  // ── PowerPoint Tools ──
  {
    id: 'pptx_to_pdf',
    name: 'PPTX to PDF',
    accentColor: '#DD6B20',
    icon: Presentation,
    description: 'Convert PowerPoint presentation slides into crisp widescreen PDF slides.',
    category: 'presentation',
    isPrimary: true,
  },
  {
    id: 'extract_pptx_text',
    name: 'Extract PPTX Text',
    accentColor: '#DD6B20',
    icon: FileText,
    description: 'Extract raw text from all slides in a PowerPoint presentation.',
    category: 'presentation',
    isPrimary: false,
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint'>('all');
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (filesArray.some((f) => f.size === 0)) {
        toast.warning('The File You have uploaded is empty');
      }
      setDroppedFiles(filesArray);
      setIsModalOpen(true);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.some((f) => f.size === 0)) {
        toast.warning('The File You have uploaded is empty');
      }
      setDroppedFiles(filesArray);
      setIsModalOpen(true);
    }
    e.target.value = '';
  };

  const handleSelectTool = (toolId: string) => {
    if (droppedFiles.length > 0) {
      if (droppedFiles.some((f) => f.size === 0)) {
        toast.warning('The File You have uploaded is empty');
        return;
      }
      setPendingFiles(droppedFiles);
    }
    setIsModalOpen(false);
    navigate(`/tools/${toolId}`);
  };

  const isToolVisible = (t: typeof FEATURED_TOOLS[number]) => {
    if (selectedCategory === 'all') return t.isPrimary;
    if (selectedCategory === 'word') return t.category === 'document';
    if (selectedCategory === 'excel') return t.category === 'spreadsheet';
    if (selectedCategory === 'powerpoint') return t.category === 'presentation';
    return t.category === selectedCategory;
  };

  const getExploreDetails = () => {
    switch (selectedCategory) {
      case 'pdf':
        return { label: 'Explore all 28 PDF tools', path: '/tools?category=pdf' };
      case 'image':
        return { label: 'Explore all 21 Image tools', path: '/tools?category=image' };
      case 'word':
        return { label: 'Explore all 10 Word tools', path: '/tools?category=document' };
      case 'excel':
        return { label: 'Explore all 12 Excel tools', path: '/tools?category=spreadsheet' };
      case 'powerpoint':
        return { label: 'Explore all 6 PowerPoint tools', path: '/tools?category=presentation' };
      default:
        return { label: 'Explore all 99+ tools', path: '/tools' };
    }
  };

  return (
    <div className="w-full space-y-12 py-4">
      
      {/* 1. Hero Section */}
      <section className="hero-centered space-y-4 pt-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Every file tool you need, <br />
          <span className="text-[#004ac6] dark:text-blue-400">
            100% private and in one place.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto font-normal">
          Fast, private, and secure file processing for documents, images, and data.
        </p>
      </section>

      {/* 2. Main Hero Dropzone Card */}
      <section className="w-full">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          className="hidden"
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`max-w-4xl mx-auto w-full bg-white dark:bg-slate-900 border-2 border-dashed border-[#004ac6] dark:border-blue-500 rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer shadow-sm hover:shadow-md ${
            isDragOver ? 'bg-[#f3f3fe] dark:bg-blue-950/40 scale-[1.01]' : ''
          }`}
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#004ac6]/10 text-[#004ac6] dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center mx-auto animate-pulse">
              <UploadCloud size={44} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Drag & Drop files here
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                or click to browse from your device
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-[#004ac6] hover:bg-blue-700 text-white rounded-full px-6 py-3 font-semibold text-sm hover:scale-105 transition-all shadow-md cursor-pointer"
              >
                Select Files
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Category Filter Tabs */}
      <section className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#e1e2ed] text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs font-bold'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Tools
        </button>

        <button
          onClick={() => setSelectedCategory('pdf')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
            selectedCategory === 'pdf'
              ? 'bg-[#E53E3E] text-white font-bold shadow-md'
              : 'bg-white dark:bg-slate-900 text-[#E53E3E] border border-slate-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={16} /> PDF
        </button>

        <button
          onClick={() => setSelectedCategory('image')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
            selectedCategory === 'image'
              ? 'bg-[#00A3C4] text-white font-bold shadow-md'
              : 'bg-white dark:bg-slate-900 text-[#00A3C4] border border-slate-300 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-800'
          }`}
        >
          <ImageIcon size={16} /> Image
        </button>

        <button
          onClick={() => setSelectedCategory('word')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
            selectedCategory === 'word'
              ? 'bg-[#2B6CB0] text-white font-bold shadow-md'
              : 'bg-white dark:bg-slate-900 text-[#2B6CB0] border border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800'
          }`}
        >
          <File size={16} /> Word
        </button>

        <button
          onClick={() => setSelectedCategory('excel')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
            selectedCategory === 'excel'
              ? 'bg-[#2F855A] text-white font-bold shadow-md'
              : 'bg-white dark:bg-slate-900 text-[#2F855A] border border-slate-300 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-800'
          }`}
        >
          <Table size={16} /> Excel
        </button>

        <button
          onClick={() => setSelectedCategory('powerpoint')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
            selectedCategory === 'powerpoint'
              ? 'bg-[#DD6B20] text-white font-bold shadow-md'
              : 'bg-white dark:bg-slate-900 text-[#DD6B20] border border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800'
          }`}
        >
          <Presentation size={16} /> PowerPoint
        </button>
      </section>

      {/* 4. Featured Tools 4-Column Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Featured Tools
          </h2>
          <Link
            to={getExploreDetails().path}
            className="text-sm font-bold text-[#004ac6] dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {getExploreDetails().label} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_TOOLS.filter(isToolVisible).map((tool) => {
            const ToolIcon = tool.icon;

            return (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="group flex flex-col justify-between p-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 no-underline"
                style={{ borderTopWidth: '4px', borderTopColor: tool.accentColor }}
              >
                <div className="space-y-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-2xs"
                    style={{ backgroundColor: tool.accentColor }}
                  >
                    <ToolIcon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#004ac6] dark:group-hover:text-blue-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#004ac6] dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Open Tool</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
 
      {/* Tool Selection Modal on File Drop / Browse */}
      <FileDropActionModal
        isOpen={isModalOpen}
        files={droppedFiles}
        onClose={() => {
          setIsModalOpen(false);
          setDroppedFiles([]);
        }}
        onSelectTool={handleSelectTool}
      />

    </div>
  );
}
