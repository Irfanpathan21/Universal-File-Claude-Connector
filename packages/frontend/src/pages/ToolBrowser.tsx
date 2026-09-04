/**
 * ToolBrowser — Grid/List view of all 111+ tools with search, domain pills, and iLovePDF theme cards
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Wrench, ArrowRight, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { CATEGORIES_CONFIG } from '../config/categories';
import { tools as ALL_TOOLS, getCategories } from '@uft/shared';

export function ToolBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryParam = searchParams.get('category') || 'all';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(activeCategoryParam);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  // Filter tools based on search query and category
  const filteredTools = ALL_TOOLS.filter((tool) => {
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q) ||
      tool.tags?.some((t) => t.toLowerCase().includes(q)) ||
      tool.inputFormats.some((f) => f.toLowerCase().includes(q)) ||
      tool.outputFormats.some((f) => f.toLowerCase().includes(q));

    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8 py-4">
      
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Tool Directory & Directory Browser
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Search and run 111+ local document, image, spreadsheet, video, audio, and OCR conversion tools.
        </p>
      </div>

      {/* Search & Filter Pills */}
      <div className="space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search 111+ tools by name, description, tags (e.g. merge pdf, resize png, excel to csv, ocr)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Tools ({ALL_TOOLS.length})
          </button>

          {Object.entries(CATEGORIES_CONFIG).map(([key, cat]) => {
            const isSelected = selectedCategory === key;
            const count = ALL_TOOLS.filter((t) => t.category === key).length;

            return (
              <button
                key={key}
                onClick={() => handleCategorySelect(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                style={isSelected ? { backgroundColor: cat.accentColor } : {}}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Wrench size={40} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No tools found matching your query</h3>
          <p className="text-xs text-slate-500">Try adjusting your search filters or clearing the category selection</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool, i) => {
            const cat = CATEGORIES_CONFIG[tool.category] || CATEGORIES_CONFIG.pdf;

            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
              >
                <Link
                  to={`/tools/${tool.id}`}
                  className="group flex flex-col justify-between h-full p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 no-underline"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: cat.accentColor }}
                      >
                        {tool.name.charAt(0)}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.badgeBg} ${cat.badgeText}`}>
                        {cat.shortName}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {tool.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-400">
                    <span className="truncate max-w-[180px]">
                      In: {tool.inputFormats.slice(0, 3).join(', ')}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Run <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
