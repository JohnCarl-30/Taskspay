import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'milestone-escrow-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = document.documentElement;
    
    const getSystemTheme = (): 'light' | 'dark' => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const applyTheme = (themeToApply: 'light' | 'dark') => {
      setResolvedTheme(themeToApply);
      root.setAttribute('data-theme', themeToApply);
    };

    if (theme === 'system') {
      applyTheme(getSystemTheme());

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  return { theme, setTheme, resolvedTheme };
}
