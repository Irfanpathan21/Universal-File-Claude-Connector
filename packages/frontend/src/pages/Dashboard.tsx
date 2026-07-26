/**
 * Dashboard — Landing page with hero, quick actions, and category grid
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Image, Database, ArrowRight, Zap, Shield, Globe, Sparkles,
  FilePlus, Scissors, Minimize2, Repeat, Table, Braces, Maximize2, Crop,
} from 'lucide-react';

const QUICK_TOOLS = [
  { id: 'merge_pdf', name: 'Merge PDF', icon: FilePlus, color: '#ef4444' },
  { id: 'split_pdf', name: 'Split PDF', icon: Scissors, color: '#f97316' },
  { id: 'compress_image', name: 'Compress Image', icon: Minimize2, color: '#8b5cf6' },
  { id: 'convert_image', name: 'Convert Image', icon: Repeat, color: '#06b6d4' },
  { id: 'resize_image', name: 'Resize Image', icon: Maximize2, color: '#10b981' },
  { id: 'json_to_csv', name: 'JSON → CSV', icon: Table, color: '#f59e0b' },
  { id: 'csv_to_json', name: 'CSV → JSON', icon: Braces, color: '#3b82f6' },
  { id: 'crop_image', name: 'Crop Image', icon: Crop, color: '#ec4899' },
];

const CATEGORIES = [
  { id: 'pdf', name: 'PDF Tools', description: 'Merge, split, compress, watermark, and more', icon: FileText, count: 13, gradient: 'from-red-500/20 to-orange-500/20' },
  { id: 'image', name: 'Image Tools', description: 'Resize, crop, convert, compress, and enhance', icon: Image, count: 15, gradient: 'from-violet-500/20 to-indigo-500/20' },
  { id: 'data', name: 'Data Conversion', description: 'JSON, XML, YAML, CSV, Markdown, HTML', icon: Database, count: 12, gradient: 'from-cyan-500/20 to-blue-500/20' },
];

const FEATURES = [
  { icon: Zap, title: 'Lightning Fast', description: 'Powered by Sharp, pdf-lib, and optimized streaming' },
  { icon: Shield, title: 'Privacy First', description: 'No uploads to external servers. Everything stays local' },
  { icon: Globe, title: 'No Account Needed', description: 'Works immediately. No signup, login, or API keys' },
  { icon: Sparkles, title: 'MCP Compatible', description: 'Use with Claude, Cursor, VS Code, and any MCP client' },
];

export function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Hero Section */}
      <div className="relative mb-16">
        <div className="bg-gradient-radial absolute inset-0 -z-10 opacity-50" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--color-brand-400)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
            <Sparkles size={14} />
            40+ Tools • No Signup Required • Open Source
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
            <span className="gradient-text">Universal File</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>Toolkit</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8" style={{ color: 'var(--text-secondary)' }}>
            Process PDFs, images, and data files instantly.
            No cloud uploads. No accounts. Just powerful file tools.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/tools" className="btn-primary text-base px-6 py-3">
              Browse All Tools
              <ArrowRight size={18} />
            </Link>
            <a href="/docs" target="_blank" rel="noopener" className="btn-secondary text-base px-6 py-3">
              API Documentation
            </a>
          </div>
        </motion.div>
      </div>

      {/* Quick Tools */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Quick Tools</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Most popular operations</p>
          </div>
          <Link to="/tools" className="text-sm font-medium flex items-center gap-1"
            style={{ color: 'var(--color-brand-400)' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_TOOLS.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/tool/${tool.id}`} className="tool-card flex flex-col items-center gap-3 py-5 no-underline">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${tool.color}15`, color: tool.color }}>
                  <tool.icon size={20} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {tool.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-16">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Categories</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Link to={`/tools/${cat.id}`} className="glass-card block p-6 no-underline group">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${cat.gradient}`}>
                    <cat.icon size={22} style={{ color: 'var(--color-brand-400)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      {cat.name}
                      <span className="badge badge-brand">{cat.count}</span>
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {cat.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium group-hover:translate-x-1 transition-transform"
                  style={{ color: 'var(--color-brand-400)' }}>
                  Explore <ArrowRight size={14} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mb-16">
        <h2 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Why This Toolkit?</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-center p-5 rounded-2xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            >
              <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--color-brand-400)' }}>
                <feature.icon size={20} />
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
        <p className="text-sm">Universal File Toolkit v1.0.0 • Open Source • MIT License</p>
      </footer>
    </div>
  );
}
