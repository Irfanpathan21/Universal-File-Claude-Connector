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

import { InteractiveCropPopup } from './pages/InteractiveCropPopup';

export default function App() {
  const theme = useUIStore((s) => s.theme);

  // Initialize theme on mount & theme toggle update
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K → Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().setCommandOpen(true);
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
