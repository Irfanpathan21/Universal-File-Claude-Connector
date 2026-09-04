/**
 * Universal File Toolkit — Documentation & Policy Content Page
 * Handles /docs, /privacy, /terms, /security, and /help routes
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Shield, Lock, FileText, Cpu, Terminal, HelpCircle, Mail, Zap, ArrowLeft } from 'lucide-react';

export function DocsPage() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 space-y-8">
      {/* Back Link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004ac6] dark:text-blue-400 hover:underline no-underline"
      >
        <ArrowLeft size={14} /> Back to Toolkit
      </Link>

      {/* Dynamic Content based on URL path */}
      {path === '/privacy' && (
        <div className="bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#ededf9] dark:border-slate-800 pb-4">
            <Shield size={32} className="text-emerald-600" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#191b23] dark:text-white">Privacy Policy</h1>
              <p className="text-xs text-[#505f76] dark:text-slate-400">100% Local Browser File Processing Guarantee</p>
            </div>
          </div>
          <div className="space-y-4 text-xs text-[#434655] dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">1. Zero Cloud Upload Policy</p>
            <p>
              Universal File Toolkit is architected around browser-local web technology (WebAssembly, Sharp, pdf-lib). Your files are processed entirely in memory on your personal machine or private server instance. Files are never transmitted, stored, or logged on external servers.
            </p>
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">2. Data Storage & Tracking</p>
            <p>
              We do not track user identities, email addresses, or personal document content. Temporary execution memory is immediately discarded upon closing or resetting your tool queue.
            </p>
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">3. Third-Party Analytics</p>
            <p>
              There are no third-party tracking scripts, cookie trackers, or telemetry SDKs embedded in Universal File Toolkit.
            </p>
          </div>
        </div>
      )}

      {path === '/terms' && (
        <div className="bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#ededf9] dark:border-slate-800 pb-4">
            <FileText size={32} className="text-[#004ac6]" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#191b23] dark:text-white">Terms of Service</h1>
              <p className="text-xs text-[#505f76] dark:text-slate-400">Universal File Toolkit Usage Terms</p>
            </div>
          </div>
          <div className="space-y-4 text-xs text-[#434655] dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">1. Open & Free Usage</p>
            <p>
              Universal File Toolkit is provided as open-source, free software for individuals, businesses, and developers. You may process unlimited files without subscription fees or mandatory account creation.
            </p>
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">2. Responsible Processing</p>
            <p>
              You agree to use Universal File Toolkit in compliance with applicable local and international copyright laws.
            </p>
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">3. Disclaimer of Warranty</p>
            <p>
              The toolkit is provided "as is" without warranty of any kind. Users are encouraged to maintain backups of primary file originals prior to batch operations.
            </p>
          </div>
        </div>
      )}

      {path === '/security' && (
        <div className="bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#ededf9] dark:border-slate-800 pb-4">
            <Lock size={32} className="text-amber-500" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#191b23] dark:text-white">Security Audit</h1>
              <p className="text-xs text-[#505f76] dark:text-slate-400">Security Practices & Architecture</p>
            </div>
          </div>
          <div className="space-y-4 text-xs text-[#434655] dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">1. Sandboxed Execution</p>
            <p>
              All file conversion engines run in isolated WebAssembly or local Node worker threads. Memory buffers are explicitly zeroed out post-execution.
            </p>
            <p className="font-semibold text-sm text-[#191b23] dark:text-white">2. Open Source Verification</p>
            <p>
              Every conversion tool module in `@uft/shared` and `@uft/backend` is auditable. You can inspect the source code directly in the repository.
            </p>
          </div>
        </div>
      )}

      {(path === '/docs' || path === '/help' || path === '/contact') && (
        <div className="bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#ededf9] dark:border-slate-800 pb-4">
            <HelpCircle size={32} className="text-[#004ac6]" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#191b23] dark:text-white">Developer Docs & Help Center</h1>
              <p className="text-xs text-[#505f76] dark:text-slate-400">REST API, MCP Protocol Server & CLI Guide</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 space-y-2 border border-[#c3c6d7]/60">
              <Terminal size={24} className="text-[#004ac6]" />
              <h3 className="font-bold text-sm text-[#191b23] dark:text-white">REST API Endpoint</h3>
              <p className="text-xs text-[#434655] dark:text-slate-400">
                Send POST multipart form requests to <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded">http://localhost:3001/api/pdf/merge</code>
              </p>
            </div>

            <div className="p-5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 space-y-2 border border-[#c3c6d7]/60">
              <Cpu size={24} className="text-purple-600" />
              <h3 className="font-bold text-sm text-[#191b23] dark:text-white">Claude MCP Protocol</h3>
              <p className="text-xs text-[#434655] dark:text-slate-400">
                Integrates with Claude Desktop & local AI agents using stdio JSON-RPC tool definitions.
              </p>
            </div>

            <div className="p-5 rounded-lg bg-[#f3f3fe] dark:bg-slate-800 space-y-2 border border-[#c3c6d7]/60">
              <Mail size={24} className="text-emerald-600" />
              <h3 className="font-bold text-sm text-[#191b23] dark:text-white">Support & Community</h3>
              <p className="text-xs text-[#434655] dark:text-slate-400">
                Submit feature requests or bug reports directly on the GitHub issue tracker.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
