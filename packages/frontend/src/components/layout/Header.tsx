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
import { tools as RAW_TOOLS } from '@uft/shared';

// Exclude media element tools (video & audio)
const ALL_TOOLS = RAW_TOOLS.filter((t: any) => t.category !== 'video' && t.category !== 'audio');

const NAV_TABS = [
  { path: '/tools', label: 'All Tools', accentColor: '#004ac6' },
  { path: '/tools?category=pdf', label: 'PDF', categoryKey: 'pdf', accentColor: '#E53E3E' },
  { path: '/tools?category=image', label: 'Image', categoryKey: 'image', accentColor: '#00A3C4' },
  { path: '/tools?category=document', label: 'Word', categoryKey: 'document', accentColor: '#2B6CB0' },
  { path: '/tools?category=spreadsheet', label: 'Excel', categoryKey: 'spreadsheet', accentColor: '#2F855A' },
  { path: '/tools?category=presentation', label: 'PowerPoint', categoryKey: 'presentation', accentColor: '#DD6B20' },
  { path: '/tools?category=data', label: 'Data & Text', categoryKey: 'data', accentColor: '#4C51BF' },
  { path: '/tools?category=ocr', label: 'OCR/AI', categoryKey: 'ocr', accentColor: '#D69E2E' },
  { path: '/tools?category=archive', label: 'Extra Tools', categoryKey: 'archive', accentColor: '#4A5568' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full h-18 sm:h-20 sticky top-0 z-50 bg-[#faf8ff]/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#c3c6d7] dark:border-slate-800 transition-colors shadow-xs overflow-x-clip">
      <div className="w-full h-full px-3 sm:px-5 lg:px-6 xl:px-8 flex items-center justify-between gap-2 lg:gap-3 xl:gap-4 max-w-full">
        
        {/* Left Corner: Brand Logo — Universal File Toolkit */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 no-underline flex-shrink-0 group">
          <img
            src="/uftlogo.png"
            alt="Universal File Toolkit"
            className="w-9 h-9 sm:w-10 sm:h-10 xl:w-11 xl:h-11 rounded-xl object-contain shadow-xs group-hover:scale-105 transition-transform flex-shrink-0"
          />
          <span className="text-lg sm:text-xl xl:text-2xl font-black text-[#004ac6] dark:text-blue-400 tracking-tight whitespace-nowrap">
            Universal File Toolkit
          </span>
        </Link>

        {/* Center: Navigation Links (Never forces overflow, smoothly adapts) */}
        <nav className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-0.5 xl:gap-1.5 2xl:gap-3 h-full mx-1 xl:mx-2 2xl:mx-4 overflow-hidden">
          {NAV_TABS.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              (tab.categoryKey && (
                location.search.includes(`category=${tab.categoryKey}`) ||
                (tab.categoryKey === 'image' && (location.search.includes('category=image') || location.pathname.includes('/tools/image'))) ||
                (tab.categoryKey === 'presentation' && (location.search.includes('category=presentation') || location.search.includes('category=powerpoint'))) ||
                (tab.categoryKey === 'data' && (location.search.includes('category=data') || location.search.includes('category=text'))) ||
                (tab.categoryKey === 'ocr' && (location.search.includes('category=ocr') || location.search.includes('category=ai'))) ||
                (tab.categoryKey === 'archive' && (location.search.includes('category=archive') || location.search.includes('category=extra')))
              ));

            return (
              <Link
                key={tab.label}
                to={tab.path}
                className={`relative h-full flex items-center text-xs xl:text-sm 2xl:text-[15px] font-bold transition-all no-underline whitespace-nowrap px-1 xl:px-1.5 2xl:px-2.5 hover:text-[#004ac6] dark:hover:text-blue-400 ${
                  isActive
                    ? 'text-[#004ac6] dark:text-blue-400 font-extrabold'
                    : 'text-[#434655] dark:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0.5 right-0.5 h-[3px] rounded-t-full transition-all"
                    style={{ backgroundColor: tab.accentColor }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Corner: Search, Theme Toggle, Log In & Sign Up — Guaranteed On-Screen */}
        <div className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 flex-shrink-0">
          
          {/* Global Search Option Trigger (Ctrl+K) */}
          <button
            type="button"
            onClick={() => useUIStore.getState().setCommandOpen(true)}
            className="flex items-center gap-2 bg-[#ededf9] dark:bg-slate-800 hover:bg-[#e2e4f3] dark:hover:bg-slate-700/80 rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-[#505f76] dark:text-slate-300 border border-[#c3c6d7]/60 dark:border-slate-700/60 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            title="Search all tools (Ctrl+K)"
          >
            <Search size={14} className="text-[#505f76] group-hover:text-[#004ac6] dark:group-hover:text-blue-400 transition-colors" />
            <span className="hidden sm:inline">Search tools...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded shadow-2xs">
              Ctrl K
            </kbd>
          </button>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-[#434655] dark:text-slate-300 hover:bg-[#ededf9] dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-[#c3c6d7] flex-shrink-0"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun size={19} className="text-amber-400" />
            ) : (
              <Moon size={19} className="text-[#004ac6]" />
            )}
          </button>


          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#434655] dark:text-slate-300 hover:bg-[#ededf9] dark:hover:bg-slate-800 flex-shrink-0"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#faf8ff] dark:bg-slate-900 border-b border-[#c3c6d7] px-4 py-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              useUIStore.getState().setCommandOpen(true);
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs bg-[#ededf9] dark:bg-slate-800 text-[#004ac6] dark:text-blue-400 cursor-pointer shadow-2xs mb-2"
          >
            <span className="flex items-center gap-2">
              <Search size={15} /> Search Tools...
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300">
              Ctrl K
            </kbd>
          </button>
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.label}
              to={tab.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl font-bold text-xs text-[#191b23] dark:text-white hover:bg-[#ededf9] dark:hover:bg-slate-800 no-underline"
            >
              {tab.label.endsWith('Tools') ? tab.label : `${tab.label} Tools`}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
