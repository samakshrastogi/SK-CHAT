import { create } from 'zustand';

interface ThemeState {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  wallpaper: string;

  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  setWallpaper: (wallpaper: string) => void;
  applyTheme: () => void;
}

/** Derives whether dark mode is active given a theme preference */
function resolveDark(theme: 'dark' | 'light' | 'system'): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Apply the resolved theme to the document root */
function applyToDOM(isDark: boolean) {
  const root = window.document.documentElement;

  // data-theme attribute — drives CSS custom properties in index.css
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Tailwind dark class — kept for any component using dark: prefix
  if (isDark) {
    root.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    root.classList.remove('dark');
    document.body.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('connect-theme') as any) || 'dark',
  accentColor: localStorage.getItem('connect-accent') || '#6366f1',
  wallpaper: localStorage.getItem('connect-wallpaper') || '',

  setTheme: (theme) => {
    localStorage.setItem('connect-theme', theme);
    set({ theme });
    get().applyTheme();
  },

  setAccentColor: (color) => {
    localStorage.setItem('connect-accent', color);
    set({ accentColor: color });
    document.documentElement.style.setProperty('--color-brand-primary', color);
  },

  setWallpaper: (wallpaper) => {
    localStorage.setItem('connect-wallpaper', wallpaper);
    set({ wallpaper });
  },

  applyTheme: () => {
    const { theme } = get();
    const isDark = resolveDark(theme);
    applyToDOM(isDark);
  },
}));

/** Listen to system preference changes and re-apply if theme === 'system' */
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    const stored = (localStorage.getItem('connect-theme') as any) || 'dark';
    if (stored === 'system') {
      applyToDOM(mq.matches);
    }
  });

  // Apply on initial load (before React mounts)
  const initialTheme = (localStorage.getItem('connect-theme') as any) || 'dark';
  applyToDOM(resolveDark(initialTheme));
}
