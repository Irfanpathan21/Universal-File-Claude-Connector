/**
 * Universal File Toolkit — Main Application Layout & Global Footer
 */

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { CommandPalette } from '../common/CommandPalette';
import { Shield, Zap } from 'lucide-react';

export function Layout() {
  const location = useLocation();

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#faf8ff] dark:bg-slate-950 text-[#191b23] dark:text-slate-100 transition-colors">
      {/* Global Search Option / Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Sticky Top Navigation Bar */}
      <Header />

      {/* Main Page Content */}
      <main className="flex-1 w-full container-centered py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Footer with Proper Links & Content */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-[#c3c6d7] dark:border-slate-800 py-12 mt-auto relative z-10">
        <div className="container-centered">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
            
            {/* Column 1 (Span 2): Brand & Copyright */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/uftlogo.png"
                  alt="Universal File Toolkit"
                  className="w-9 h-9 rounded-xl object-contain shadow-xs flex-shrink-0"
                />
                <span className="text-2xl font-black text-[#004ac6] dark:text-blue-400 tracking-tight">
                  Universal File Toolkit
                </span>
              </div>
              <p className="text-sm sm:text-[15px] text-[#434655] dark:text-slate-300 max-w-sm leading-relaxed">
                High-performance, secure file processing for PDFs, Images, Spreadsheets, Word documents, and OCR.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="https://github.com/Irfanpathan21/Universal-File-Claude-Connector"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  GitHub Repo
                </a>
                <a
                  href="/UniversalFileToolkit-Setup.zip"
                  download="UniversalFileToolkit-Setup.zip"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-[#004ac6] dark:text-blue-400 transition-colors border border-blue-200/60 dark:border-blue-800/60"
                >
                  <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Windows App (.zip)
                </a>
              </div>
              <p className="text-xs text-[#505f76] dark:text-slate-400 font-semibold pt-1">
                © 2026 Universal File Toolkit. All rights reserved.
              </p>
            </div>

            {/* Column 2: Legal */}
            <div className="space-y-3.5">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#191b23] dark:text-white">
                Legal
              </h4>
              <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#434655] dark:text-slate-300 font-medium">
                <li><Link to="/terms" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/security" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Security Audit</Link></li>
              </ul>
            </div>

            {/* Column 3: Developers */}
            <div className="space-y-3.5">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#191b23] dark:text-white">
                Developers
              </h4>
              <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#434655] dark:text-slate-300 font-medium">
                <li><Link to="/docs" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">REST API Docs</Link></li>
                <li><Link to="/docs" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">MCP Protocol Server</Link></li>
                <li><Link to="/docs" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">CLI Client Tool</Link></li>
                <li><a href="https://github.com/Irfanpathan21/Universal-File-Claude-Connector" target="_blank" rel="noreferrer" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">GitHub Source</a></li>
              </ul>
            </div>

            {/* Column 4: Support */}
            <div className="space-y-3.5">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#191b23] dark:text-white">
                Support
              </h4>
              <ul className="space-y-2.5 text-sm sm:text-[15px] text-[#434655] dark:text-slate-300 font-medium">
                <li><Link to="/help" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Contact Us</Link></li>
                <li><Link to="/help" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Help Center</Link></li>
                <li><a href="/UniversalFileToolkit-Setup.zip" download="UniversalFileToolkit-Setup.zip" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Download Windows Package (.zip)</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-[#c3c6d7]/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-sm text-[#505f76] dark:text-slate-400 gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              <span className="flex items-center gap-2 font-semibold"><Shield size={16} className="text-emerald-600" /> Enterprise-Grade Security</span>
              <span className="flex items-center gap-2 font-semibold"><Zap size={16} className="text-amber-500" /> High-Performance Processing</span>
            </div>
            <div className="font-medium">
              Built for speed, security, and precision.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
