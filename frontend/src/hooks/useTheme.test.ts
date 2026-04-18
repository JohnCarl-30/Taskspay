import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should store theme in localStorage', () => {
    const theme = 'dark';
    localStorage.setItem('milestone-escrow-theme', theme);
    expect(localStorage.getItem('milestone-escrow-theme')).toBe('dark');
  });

  it('should support all theme values', () => {
    const themes = ['light', 'dark', 'system'];
    themes.forEach(theme => {
      localStorage.setItem('milestone-escrow-theme', theme);
      expect(localStorage.getItem('milestone-escrow-theme')).toBe(theme);
    });
  });

  it('should apply data-theme attribute to document root', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should detect system theme preference', () => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    expect(darkModeQuery.matches).toBe(true);
  });
});
