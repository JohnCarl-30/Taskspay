import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
import { useTheme, type Theme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes: { 
    value: Theme; 
    label: string; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    description: string 
  }[] = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark theme' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[2];
  const CurrentIcon = theme === 'system' 
    ? (resolvedTheme === 'dark' ? Moon : Sun)
    : currentTheme.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-all duration-150 border bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border2)] flex items-center gap-1.5"
        title={`Theme: ${currentTheme.label}`}
      >
        <CurrentIcon size={16} className="text-[var(--text)]" />
        <ChevronDown
          size={12}
          className="text-[var(--muted)] transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-lg border bg-[var(--surface)] border-[var(--border)] shadow-lg overflow-hidden animate-fade-in"
          style={{
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
          }}
        >
          <div className="py-1">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => handleThemeSelect(t.value)}
                  className="w-full px-3 py-2.5 text-left flex items-center gap-3 transition-all duration-150 border-0"
                  style={{
                    background: theme === t.value ? 'var(--accent-dim)' : 'transparent',
                    color: 'var(--text)',
                  }}
                  onMouseEnter={(e) => {
                    if (theme !== t.value) {
                      e.currentTarget.style.background = 'var(--surface2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (theme !== t.value) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={16} />
                  <div className="flex-1">
                    <div className="text-xs font-medium uppercase tracking-wider">
                      {t.label}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {t.description}
                    </div>
                  </div>
                  {theme === t.value && (
                    <Check size={16} className="text-[var(--accent)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* System Theme Info */}
          {theme === 'system' && (
            <div
              className="px-3 py-2 text-xs border-t flex items-center gap-2"
              style={{
                background: 'var(--surface2)',
                borderColor: 'var(--border)',
                color: 'var(--muted)',
              }}
            >
              {resolvedTheme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
              <span>
                Currently: <span className="text-[var(--text)] font-medium">{resolvedTheme}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
