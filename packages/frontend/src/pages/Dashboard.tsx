/**
 * Screen 1 Specification: Home / Universal File Toolkit (`/`)
 * High Contrast Light & Dark Mode Typography
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, Image as ImageIcon, File, Table, ArrowRight,
  Maximize2, Repeat, FilePlus
} from 'lucide-react';

const FEATURED_TOOLS = [
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    accentColor: '#E53E3E',
    icon: FilePlus,
    description: 'Combine multiple PDFs into a single unified document.',
    category: 'pdf',
  },
  {
    id: 'resize_image',
    name: 'Resize Image',
    accentColor: '#00A3C4',
    icon: Maximize2,
    description: 'Scale images down or crop them without losing quality.',
    category: 'image',
  },
  {
    id: 'extract_docx_text',
    name: 'Word to PDF',
    accentColor: '#2B6CB0',
    icon: FileText,
    description: 'Convert DOCX files to secure, print-ready PDFs.',
    category: 'document',
  },
  {
    id: 'excel_to_csv',
    name: 'Excel to CSV',
    accentColor: '#2F855A',
    icon: Table,
    description: 'Extract sheets into comma-separated values easily.',
    category: 'spreadsheet',
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pdf' | 'image' | 'word' | 'excel'>('all');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      navigate('/tools');
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
          Process documents locally on your device. No cloud uploads required.
        </p>
      </section>

      {/* 2. Main Hero Dropzone Card */}
      <section className="w-full">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
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
                onClick={() => navigate('/tools')}
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
      </section>

      {/* 4. Featured Tools 4-Column Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Featured Tools
          </h2>
          <Link
            to="/tools"
            className="text-sm font-bold text-[#004ac6] dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Explore all 111+ tools <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_TOOLS.filter((t) => selectedCategory === 'all' || t.category === selectedCategory).map((tool) => {
            const ToolIcon = tool.icon;

            return (
              <Link
                key={tool.id}
                to={tool.id === 'resize_image' ? '/tools/image' : `/tools/${tool.id}`}
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

    </div>
  );
}
