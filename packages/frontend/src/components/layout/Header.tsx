/**
 * Universal File Toolkit — Sticky Top Navigation Bar
 * Features:
 * - Brand Name: Universal File Toolkit
 * - Light/Dark Theme Switcher (Smooth toggle)
 * - Working Live Search Bar with Instant Tool Dropdown
 * - Domain Navigation Tabs with Active Accent Underlines
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, ArrowRight, FileText, Wrench } from 'lucide-react';
import { useUIStore } from '../../stores/ui';
import { tools as ALL_TOOLS } from '@uft/shared';

const NAV_TABS = [
  { path: '/tools', label: 'All Tools', accentColor: '#004ac6' },
  { path: '/tools?category=pdf', label: 'PDF', categoryKey: 'pdf', accentColor: '#E53E3E' },
  { path: '/tools/image', label: 'Image', categoryKey: 'image', accentColor: '#00A3C4' },
  { path: '/tools?category=document', label: 'Word', categoryKey: 'document', accentColor: '#2B6CB0' },
  { path: '/tools?category=spreadsheet', label: 'Excel', categoryKey: 'spreadsheet', accentColor: '#2F855A' },
  { path: '/tools?category=video', label: 'Media', categoryKey: 'video', accentColor: '#805AD5' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter tools live based on searchQuery
  const searchResults = searchQuery.trim() === ''
    ? []
    : ALL_TOOLS.filter((tool: any) =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tool.tags && tool.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      ).slice(0, 6);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTool = (toolId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/tools/${toolId}`);
  };

  return (
    <header className="w-full h-16 sticky top-0 z-50 bg-[#faf8ff]/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#c3c6d7] dark:border-slate-800 transition-colors">
      <div className="container-centered h-full flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo — Universal File Toolkit */}
        <Link to="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#004ac6] text-white font-black text-sm flex items-center justify-center shadow-xs">
            U
          </div>
          <span className="text-xl font-extrabold text-[#004ac6] dark:text-blue-400 tracking-tight">
            Universal File Toolkit
          </span>
        </Link>

        {/* Center: Navigation Links with Active Accents */}
        <nav className="hidden lg:flex items-center gap-6 h-full">
          {NAV_TABS.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              (tab.categoryKey && location.search.includes(`category=${tab.categoryKey}`)) ||
              (tab.path.includes('/tools/image') && location.pathname.includes('/tools/image'));

            return (
              <Link
                key={tab.label}
                to={tab.path}
                className={`relative h-full flex items-center text-sm font-semibold transition-colors no-underline ${
                  isActive
                    ? 'text-[#004ac6] dark:text-blue-400 font-bold'
                    : 'text-[#434655] dark:text-slate-300 hover:text-[#004ac6] dark:hover:text-blue-400'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full transition-all"
                    style={{ backgroundColor: tab.accentColor }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Working Search Input, Theme Toggle, Log In & Sign Up */}
        <div className="flex items-center gap-3 flex-shrink-0">
          
          {/* Working Interactive Live Search Bar */}
          <div ref={searchRef} className="relative hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#505f76] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search 111+ tools..."
                className="w-48 md:w-60 bg-[#ededf9] dark:bg-slate-800 rounded-full pl-9 pr-4 py-1.5 text-xs font-semibold text-[#191b23] dark:text-white border border-[#c3c6d7]/60 dark:border-slate-700/60 focus:outline-hidden focus:ring-2 focus:ring-[#004ac6] focus:w-72 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#505f76] hover:text-[#191b23]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden space-y-1 p-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#505f76] px-3 py-1">
                  Matching Tools ({searchResults.length})
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-4 text-xs text-[#505f76] text-center">
                    No tools found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((tool: any) => (
                    <button
                      key={tool.id}
                      onClick={() => handleSelectTool(tool.id)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-[#f3f3fe] dark:hover:bg-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded bg-[#004ac6]/10 text-[#004ac6] flex items-center justify-center font-bold text-xs">
                          <Wrench size={14} />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-[#191b23] dark:text-white group-hover:text-[#004ac6] truncate">
                            {tool.name}
                          </div>
                          <div className="text-[10px] text-[#505f76] truncate">
                            {tool.description}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-[#505f76] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[#434655] dark:text-slate-300 hover:bg-[#ededf9] dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-[#c3c6d7]"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-[#004ac6]" />
            )}
          </button>

          {/* Log In Button */}
          <button className="hidden sm:inline-block font-semibold text-xs text-[#434655] dark:text-slate-300 hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors cursor-pointer px-2 py-1">
            Log In
          </button>

          {/* Sign Up Button */}
          <button className="bg-[#004ac6] text-white px-4 py-2 rounded-full font-semibold text-xs hover:scale-105 transition-all shadow-sm cursor-pointer">
            Sign Up
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#434655] dark:text-slate-300 hover:bg-[#ededf9] dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#faf8ff] dark:bg-slate-900 border-b border-[#c3c6d7] px-4 py-4 space-y-2">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.label}
              to={tab.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl font-bold text-xs text-[#191b23] dark:text-white hover:bg-[#ededf9] dark:hover:bg-slate-800 no-underline"
            >
              {tab.label} Tools
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
