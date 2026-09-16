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
                <div className="w-9 h-9 rounded-xl bg-[#004ac6] text-white font-black text-base flex items-center justify-center shadow-xs">
                  U
                </div>
                <span className="text-2xl font-black text-[#004ac6] dark:text-blue-400 tracking-tight">
                  Universal File Toolkit
                </span>
              </div>
              <p className="text-sm sm:text-[15px] text-[#434655] dark:text-slate-300 max-w-sm leading-relaxed">
                100% private, client-side document processing for PDFs, Images, Spreadsheets, Word docs, and OCR.
              </p>
              <p className="text-sm text-[#505f76] dark:text-slate-400 font-semibold pt-1">
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
                <li><Link to="/docs" className="hover:text-[#004ac6] dark:hover:text-blue-400 transition-colors">Documentation</Link></li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-[#c3c6d7]/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-sm text-[#505f76] dark:text-slate-400 gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              <span className="flex items-center gap-2 font-semibold"><Shield size={16} className="text-emerald-600" /> 100% Client Local Security</span>
              <span className="flex items-center gap-2 font-semibold"><Zap size={16} className="text-amber-500" /> Zero Cloud Uploads</span>
            </div>
            <div className="font-medium">
              Built for speed, security, and privacy.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
