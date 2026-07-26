/**
 * ToolBrowser — Grid/List view of all available tools with search and filter
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, FileText, Image, Database, Filter, ArrowRight,
  FilePlus, Scissors, Minimize2, RotateCw, FileOutput, FileMinus,
  ArrowUpDown, Droplets, Hash, Lock, Info, Maximize2, Crop,
  FlipHorizontal, Repeat, EyeOff, Zap, Sliders, Contrast, Shield,
  Layers, Table, Braces, Code, FileCode, CheckCircle, AlignLeft,
  Minimize, Globe, Wrench,
} from 'lucide-react';
import { fetchTools } from '../lib/api';
import type { ToolInfo, CategoryInfo } from '../lib/api';

const ICON_MAP: Record<string, any> = {
  'file-plus': FilePlus,
  'scissors': Scissors,
  'minimize-2': Minimize2,
  'rotate-cw': RotateCw,
  'file-output': FileOutput,
  'file-minus': FileMinus,
  'arrow-up-down': ArrowUpDown,
  'file-text': FileText,
  'droplets': Droplets,
  'hash': Hash,
  'lock': Lock,
  'info': Info,
  'image': Image,
  'maximize-2': Maximize2,
  'crop': Crop,
  'flip-horizontal': FlipHorizontal,
  'repeat': Repeat,
  'eye-off': EyeOff,
  'zap': Zap,
  'sliders': Sliders,
  'contrast': Contrast,
  'shield': Shield,
  'layers': Layers,
  'table': Table,
  'braces': Braces,
  'code': Code,
  'file-code': FileCode,
  'check-circle': CheckCircle,
  'align-left': AlignLeft,
  'minimize': Minimize,
  'globe': Globe,
  'database': Database,
};

export function ToolBrowser() {
  const { category: urlCategory } = useParams<{ category?: string }>();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory || 'all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (urlCategory) {
      setSelectedCategory(urlCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const catFilter = selectedCategory === 'all' ? undefined : selectedCategory;
        const res = await fetchTools(search || undefined, catFilter);
        setTools(res.tools);
        setCategories(res.categories);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search, selectedCategory]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
          Tool Directory
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Explore 40+ high-performance file manipulation tools
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tools by name, keyword, or extension..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'hover:bg-white/5'
            }`}
            style={selectedCategory !== 'all' ? { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' } : {}}
          >
            All Tools ({tools.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'hover:bg-white/5'
              }`}
              style={selectedCategory !== cat.id ? { color: 'var(--text-secondary)', border: '1px solid var(--border-default)' } : {}}
            >
              {cat.name} ({cat.toolCount})
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <Wrench size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No tools found</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try adjusting your search query or filter</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tools.map((tool, i) => {
            const IconComponent = ICON_MAP[tool.icon] || Wrench;
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Link to={`/tool/${tool.id}`} className="tool-card block h-full no-underline flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--color-brand-400)' }}>
                        <IconComponent size={18} />
                      </div>
                      <span className="badge badge-brand text-[10px] uppercase font-bold tracking-wider">
                        {tool.category}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {tool.name}
                    </h3>
                    <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {tool.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t text-[11px]" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                    <span>In: {tool.inputFormats.join(', ')}</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
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
