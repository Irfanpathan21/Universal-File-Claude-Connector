/**
 * Zustand store for UI state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HistoryEntry {
  id: string;
  toolId: string;
  toolName: string;
  timestamp: number;
  files: string[];
  status: 'completed' | 'failed';
  downloadUrls?: string[];
}

interface UIStore {
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Command palette
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // History
  history: HistoryEntry[];
  addToHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme });
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(newTheme);
      },
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
      },

      // Sidebar
      sidebarOpen: false,
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Command palette
      commandOpen: false,
      setCommandOpen: (open) => set({ commandOpen: open }),

      // History
      history: [],
      addToHistory: (entry) => set((s) => ({
        history: [
          { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
          ...s.history.slice(0, 99),
        ],
      })),
      clearHistory: () => set({ history: [] }),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'uft-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        history: state.history,
      }),
    }
  )
);
