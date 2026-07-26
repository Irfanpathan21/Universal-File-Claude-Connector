/**
 * HistoryPage — Session operation history
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Trash2, CheckCircle2, XCircle, Download, FileText, ArrowRight } from 'lucide-react';
import { useUIStore } from '../stores/ui';

export function HistoryPage() {
  const { history, clearHistory } = useUIStore();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>
            Session History
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Recent operations executed in this session
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="btn-secondary text-xs text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} /> Clear History
          </button>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No operations yet</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>File operations you execute will appear here</p>
          <Link to="/tools" className="btn-primary text-xs">
            Browse Tools <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {entry.status === 'completed' ? (
                  <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-400 flex-shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {entry.toolName}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Files: {entry.files.join(', ')} • {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {entry.downloadUrls && entry.downloadUrls.length > 0 && (
                <div className="flex gap-2">
                  {entry.downloadUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      download
                      className="btn-secondary p-2 text-xs"
                      title="Download output"
                    >
                      <Download size={14} />
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
