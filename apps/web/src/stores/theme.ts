import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function initialTheme(): Theme {
  const saved = localStorage.getItem('kasir-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

const initial = typeof window === 'undefined' ? 'light' : initialTheme();
if (typeof window !== 'undefined') applyTheme(initial);

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: initial,
  toggle: () =>
    set((s) => {
      const next: Theme = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('kasir-theme', next);
      applyTheme(next);
      return { theme: next };
    }),
}));
