import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, AlertCircle, RefreshCw, Settings, X, Globe } from 'lucide-react';
import { getApiBaseUrl, pingBackend } from '../../lib/api';

export function BackendStatusBadge() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [modalOpen, setModalOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('UFT_API_URL') || '';
    }
    return '';
  });
  const [activeUrl, setActiveUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const checkStatus = async () => {
    setStatus('checking');
    const ok = await pingBackend();
    setStatus(ok ? 'online' : 'offline');
    setActiveUrl(getApiBaseUrl() || (typeof window !== 'undefined' ? `${window.location.origin} (Local/Proxy)` : 'Localhost'));
  };

  useEffect(() => {
    checkStatus();
    // Periodically re-check connectivity every 60s
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    if (customUrl.trim()) {
      localStorage.setItem('UFT_API_URL', customUrl.trim());
    } else {
      localStorage.removeItem('UFT_API_URL');
    }
    setTestResult(null);
    checkStatus();
    setModalOpen(false);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const target = customUrl.trim() || getApiBaseUrl();
      const testEndpoint = target ? `${target.replace(/\/$/, '')}/health` : '/health';
      const res = await fetch(testEndpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        setTestResult('success: Connected successfully!');
      } else {
        setTestResult(`error: Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestResult(`error: Connection failed (${err.message || 'Timeout/Network error'})`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      {/* Footer Status Pill */}
      <button
        type="button"
        onClick={() => {
          setActiveUrl(getApiBaseUrl() || (typeof window !== 'undefined' ? `${window.location.origin} (Local/Proxy)` : 'Localhost'));
          setModalOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ededf9] dark:bg-slate-800 text-[#434655] dark:text-slate-300 hover:bg-[#e2e4f3] dark:hover:bg-slate-700/80 transition-all border border-[#c3c6d7]/60 dark:border-slate-700 cursor-pointer shadow-2xs"
        title="Click to view or configure Backend API status"
      >
        <span className="relative flex h-2 w-2">
          {status === 'checking' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === 'online'
                ? 'bg-emerald-500'
                : status === 'checking'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          ></span>
        </span>
        <Server size={13} className="text-[#505f76] dark:text-slate-400" />
        <span>
          Backend:{' '}
          {status === 'online'
            ? 'Online'
            : status === 'checking'
            ? 'Waking up...'
            : 'Connecting'}
        </span>
      </button>

      {/* Backend Settings / Status Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#c3c6d7] dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ededf9] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#004ac6]/10 text-[#004ac6] flex items-center justify-center font-bold">
                  <Server size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#191b23] dark:text-white">
                    Backend Connection
                  </h3>
                  <p className="text-[11px] text-[#505f76] dark:text-slate-400">
                    REST API & Processing Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Active Status */}
            <div className="p-3.5 rounded-xl bg-[#f8f9fe] dark:bg-slate-800/60 border border-[#c3c6d7]/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#505f76] dark:text-slate-400">Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 font-bold ${
                    status === 'online'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : status === 'checking'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {status === 'online' ? (
                    <>
                      <CheckCircle2 size={13} /> Active & Ready
                    </>
                  ) : status === 'checking' ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Waking up / Checking
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} /> Server Unreachable
                    </>
                  )}
                </span>
              </div>
              <div className="text-xs break-all">
                <span className="font-bold text-[#505f76] dark:text-slate-400">Active URL: </span>
                <code className="text-[11px] font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[#191b23] dark:text-slate-200">
                  {activeUrl}
                </code>
              </div>
            </div>

            {/* Custom Backend URL Form */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#191b23] dark:text-slate-200 flex items-center justify-between">
                <span>Custom Backend API URL:</span>
                {customUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomUrl('')}
                    className="text-[10px] text-[#004ac6] dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                )}
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="e.g. https://uft-api-backend.onrender.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#c3c6d7] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#191b23] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#004ac6]"
              />
              <p className="text-[10px] text-[#737686] dark:text-slate-400">
                Leave blank to automatically use the default backend URL or cloud heuristic.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold ${
                  testResult.startsWith('success')
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}
              >
                {testResult.replace(/^(success|error):\s*/, '')}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#c3c6d7] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#505f76] dark:text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <RefreshCw size={13} className="animate-spin" /> : <Globe size={13} />}
                Test Connection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl text-[#505f76] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#004ac6] hover:bg-[#003da8] text-white cursor-pointer shadow-xs"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
