import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ToolBrowser } from './pages/ToolBrowser';
import { ToolPage } from './pages/ToolPage';
import { ImageHub } from './pages/ImageHub';
import { DocsPage } from './pages/DocsPage';
import { HistoryPage } from './pages/HistoryPage';
import { useUIStore } from './stores/ui';
import { pingBackend } from './lib/api';

import { InteractiveCropPopup } from './pages/InteractiveCropPopup';

export default function App() {
  const theme = useUIStore((s) => s.theme);

  // Wake up backend service on initial load (Render free-tier warmup)
  useEffect(() => {
    pingBackend().catch(() => {});
  }, []);

  // Initialize theme on mount & theme toggle update
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Keyboard shortcuts (Ctrl+K / Cmd+K to open Search Option)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
        e.preventDefault();
        const current = useUIStore.getState().commandOpen;
        useUIStore.getState().setCommandOpen(!current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Toaster
        theme={theme}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          },
        }}
      />
      <Routes>
        {/* Dedicated Standalone Visible Editor Window for Claude MCP */}
        <Route path="/editor/crop" element={<InteractiveCropPopup />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tools" element={<ToolBrowser />} />
          <Route path="/tools/image" element={<ImageHub />} />
          <Route path="/tools/category/:category" element={<ToolBrowser />} />
          <Route path="/tools/:id" element={<ToolPage />} />
          <Route path="/tool/:id" element={<ToolPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/privacy" element={<DocsPage />} />
          <Route path="/terms" element={<DocsPage />} />
          <Route path="/security" element={<DocsPage />} />
          <Route path="/help" element={<DocsPage />} />
          <Route path="/contact" element={<DocsPage />} />
        </Route>
      </Routes>
    </>
  );
}
