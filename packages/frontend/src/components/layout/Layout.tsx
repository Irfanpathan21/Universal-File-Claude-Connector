/**
 * App Layout — Sidebar + Header + Main Content
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image, Database, Wrench, Clock, Home,
  Sun, Moon, Search, Menu, X, ChevronLeft, Command,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/tools', label: 'All Tools', icon: Wrench },
  { path: '/tools/pdf', label: 'PDF Tools', icon: FileText },
  { path: '/tools/image', label: 'Image Tools', icon: Image },
  { path: '/tools/data', label: 'Data Conversion', icon: Database },
  { path: '/history', label: 'History', icon: Clock },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen, setCommandOpen } = useUIStore();

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''} flex-shrink-0 flex flex-col`}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-default)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center gap-3 flex-1 no-underline">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'var(--gradient-brand)' }}>
                U
              </div>
              <div>
                <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>File Toolkit</h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Universal</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft size={16} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search shortcut */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-default)',
              }}
            >
              <Search size={14} />
              <span className="flex-1 text-left">Search tools...</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''} mb-0.5`}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <button
            onClick={toggleTheme}
            className="sidebar-item w-full"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'var(--gradient-brand)' }}>U</div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>File Toolkit</span>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
