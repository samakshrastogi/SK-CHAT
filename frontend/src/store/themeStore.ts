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
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }
}));
